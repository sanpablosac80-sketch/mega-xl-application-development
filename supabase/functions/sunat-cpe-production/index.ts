import {createClient} from 'npm:@supabase/supabase-js@2.57.4'
import JSZip from 'jszip'
import {XMLParser,XMLValidator} from 'fast-xml-parser'
import {invoiceXml,summaryXml,limaDate,esc} from './ubl.mjs'
import {sign} from './sign.ts'
import {readCdr} from './cdr.mjs'
const j=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}})
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const parser=new XMLParser({removeNSPrefix:true,parseTagValue:false})
const sha=async(v:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',v))).map(x=>x.toString(16).padStart(2,'0')).join('')
const b64=(v:Uint8Array)=>{let s='';for(let i=0;i<v.length;i+=16384)s+=String.fromCharCode(...v.subarray(i,i+16384));return btoa(s)}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return j({error:'POST requerido'},405)
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})
 const {data:auth}=await sb.auth.getUser(req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'')
 if(!auth.user)return j({error:'Inicia sesión'},401)
 const {data:p}=await sb.from('perfiles_usuario').select('activo,rol_codigo').eq('id',auth.user.id).maybeSingle()
 if(!p?.activo||!['A','B'].includes(p.rol_codigo))return j({error:'Acceso no autorizado'},403)
 const body=await req.json().catch(()=>null)
 if(!uuid.test(body?.comprobante_id||'')||!['prepare','authorize','send','consult','diagnose'].includes(body?.action))return j({error:'Solicitud no válida'},400)
 const {data:d}=await sb.from('comprobantes').select('*').eq('id',body.comprobante_id).maybeSingle()
 if(!d)return j({error:'Comprobante no encontrado'},404)
 const {data:cfg}=await sb.from('configuracion').select('nombre_empresa,ruc,direccion').eq('id',1).single()
 if(!cfg||!/^\d{11}$/.test(cfg.ruc))return j({error:'Configuración fiscal incompleta'},409)
 const {data:existing}=await sb.from('cpe_production_jobs').select('*').eq('comprobante_id',d.id).maybeSingle()
 async function patchJob(values:Record<string,unknown>){const {error}=await sb.from('cpe_production_jobs').update(values).eq('comprobante_id',d.id);if(error)throw Error('No se pudo conservar el resultado')}
 async function patchDocument(values:Record<string,unknown>){const {error}=await sb.from('comprobantes').update(values).eq('id',d.id);if(error)throw Error('No se pudo actualizar el comprobante')}
 async function store(path:string,data:Uint8Array,type:string){const {error}=await sb.storage.from('sunat-private').upload(path,data,{contentType:type,upsert:false});if(error)throw Error('No se pudo conservar el archivo')}
 async function download(path:string){const {data,error}=await sb.storage.from('sunat-private').download(path);if(error||!data)throw Error('Archivo no disponible');return new Uint8Array(await data.arrayBuffer())}
 async function soap(method:string,payload:string,consult=false){
  const user=Deno.env.get('SUNAT_SOL_USER')?.trim(),password=Deno.env.get('SUNAT_SOL_PASSWORD')
  if(!user||!password)throw Error('Credenciales SOL incompletas')
  const endpoint=consult?'https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billConsultService':'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService'
  const xml=`<?xml version="1.0"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><soapenv:Header><wsse:Security><wsse:UsernameToken><wsse:Username>${esc(user.startsWith(cfg.ruc)?user:cfg.ruc+user)}</wsse:Username><wsse:Password>${esc(password)}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><ser:${method}>${payload}</ser:${method}></soapenv:Body></soapenv:Envelope>`
  const response=await fetch(endpoint,{method:'POST',redirect:'manual',headers:{'Content-Type':'text/xml;charset=UTF-8',SOAPAction:'urn:'+method},body:xml,signal:AbortSignal.timeout(25000)})
  const text=await response.text();if(!text.trim())throw Error('SUNAT sin contenido: HTTP '+response.status+', Content-Type '+(response.headers.get('content-type')||'ausente')+', redirección '+(response.headers.get('location')||'ninguna')+'; no acredita aceptación ni autenticación');if(text.length>10_000_000||/<!DOCTYPE|<!ENTITY/i.test(text)||XMLValidator.validate(text)!==true)throw Error('Respuesta SUNAT no verificable')
  return {http:response.status,body:parser.parse(text).Envelope?.Body}
 }
 async function finish(cdrBase64:string,job:any){
  const expected=job.submission_method==='sendSummary'?job.submission_name.replace(cfg.ruc+'-',''):d.serie+'-'+d.correlativo
  const cdr=await readCdr(cdrBase64,expected)
  const path=`production/cdr/${d.id}/${crypto.randomUUID()}/R-${job.submission_name}.zip`
  await store(path,cdr.bytes,'application/zip')
  const state=cdr.accepted?'ACEPTADO':'RECHAZADO',at=new Date().toISOString()
  await patchJob({state,cdr_path:path,response_code:cdr.code,message:cdr.description,responded_at:at})
  await patchDocument({estado_sunat:state,cdr_path:path,sunat_codigo:cdr.code,sunat_mensaje:cdr.description,cdr_recibido_at:at})
  return j({ok:true,state,accepted:cdr.accepted,code:cdr.code,message:cdr.description})
 }
 try{
  if(body.action==='prepare'){
   if(existing)return j({ok:true,state:existing.state,message:'El comprobante ya tiene un expediente de producción.',prepared:true})
   if(d.estado_sunat!=='PENDIENTE'||d.cdr_path)return j({error:'Las pruebas BETA no se convierten en comprobantes reales. Crea un nuevo comprobante.'},409)
   if(limaDate(d.created_at)!==limaDate(new Date()))return j({error:'Revisa la fecha: la preparación inicial requiere un comprobante de hoy.'},409)
   let ref=null
   if(d.tipo==='nota_credito'){
    const {data:r}=await sb.from('comprobantes').select('*').eq('id',d.comprobante_referencia_id).maybeSingle()
    const {data:rj}=await sb.from('cpe_production_jobs').select('state,cdr_path').eq('comprobante_id',d.comprobante_referencia_id).maybeSingle()
    if(!r||rj?.state!=='ACEPTADO'||!rj.cdr_path)return j({error:'La nota requiere un comprobante aceptado en producción con CDR.'},409)
    ref=r
    if(['total','valor_venta','igv','descuento'].some(k=>Number(d[k])!==Number(r[k])))return j({error:'La anulación debe ser por el importe total del comprobante.'},409)
   }
   const ventaId=d.venta_id||ref?.venta_id
   const {data:v}=await sb.from('ventas').select('cliente_id').eq('id',ventaId).maybeSingle()
   const {data:customer}=v?.cliente_id?await sb.from('clientes').select('direccion').eq('id',v.cliente_id).maybeSingle():{data:null}
   const {data:items}=await sb.from('venta_items').select('producto_nombre,cantidad,precio_unitario,subtotal').eq('venta_id',ventaId).order('id')
   const {data:cert}=await sb.storage.from('sunat-private').download('certificado.p12')
   if(!cert)throw Error('Certificado no disponible')
   const certificate=new Uint8Array(await cert.arrayBuffer()),password=Deno.env.get('SUNAT_CERT_PASSWORD')||''
   const xml=sign(invoiceXml(d,items||[],cfg,customer?.direccion||'',ref),certificate,password)
   const type=d.tipo==='factura'?'01':d.tipo==='boleta'?'03':'07',name=`${cfg.ruc}-${type}-${d.serie}-${d.correlativo}`
   const summary=d.tipo==='boleta'||ref?.tipo==='boleta'
   let submissionName=name,sendXml=xml
   if(summary){const {data:num,error}=await sb.rpc('next_cpe_summary_number');if(error)throw Error('No se pudo reservar el resumen');const date=limaDate(new Date());const id=`RC-${date.replaceAll('-','')}-${num}`;submissionName=cfg.ruc+'-'+id;sendXml=sign(summaryXml(d,cfg,id,date,ref),certificate,password)}
   const prefix=`production/${d.id}/${crypto.randomUUID()}`,xmlPath=prefix+'/'+name+'.xml',zipPath=prefix+'/'+submissionName+'.zip'
   const zip=new JSZip();zip.file(submissionName+'.xml',sendXml);const zipBytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'})
   await store(xmlPath,new TextEncoder().encode(xml),'application/xml');await store(zipPath,zipBytes,'application/zip')
   const {error}=await sb.from('cpe_production_jobs').insert({comprobante_id:d.id,actor_id:auth.user.id,document_name:name,submission_name:submissionName,submission_method:summary?'sendSummary':'sendBill',xml_path:xmlPath,zip_path:zipPath,xml_hash:await sha(zipBytes)})
   if(error)throw Error('Otro proceso preparó el comprobante; actualiza la página')
   await patchDocument({estado_sunat:'PREPARADO_PRODUCCION',xml_path:xmlPath,zip_path:zipPath,sunat_mensaje:'Preparado para revisión. Todavía no enviado a SUNAT.'})
   return j({ok:true,state:'PREPARADO',prepared:true,message:'XML firmado y expediente preparado. Revisa el PDF antes de emitir.'})
  }
  if(body.action==='diagnose'){const r=await soap('getStatus','<ticket>000000000000000000</ticket>');const fault=r.body?.Fault;return j({ok:!fault,http:r.http,code:String(fault?.faultcode||''),message:String(fault?.faultstring||r.body?.getStatusResponse?.status?.statusMessage||'Consulta sin CDR'),configured_user:Deno.env.get('SUNAT_SOL_USER')?.trim(),read_only:true})}
  if(!existing)return j({error:'Prepara primero el comprobante'},409)
  if(body.action==='authorize'){
   if(body.confirm_production!==true||existing.state!=='PREPARADO')return j({error:'Confirma la emisión real de un comprobante preparado'},409)
   const hash=await sha(await download(existing.zip_path));if(hash!==existing.xml_hash)throw Error('El expediente cambió')
   await patchJob({approved_hash:hash,actor_id:auth.user.id,approved_at:new Date().toISOString()})
   return j({ok:true,message:'Emisión autorizada para el expediente revisado.'})
  }
  if(body.action==='consult'){
   if(['ACEPTADO','RECHAZADO'].includes(existing.state)&&existing.cdr_path)return j({ok:true,state:existing.state,accepted:existing.state==='ACEPTADO',message:existing.message})
   if(!['PROCESANDO','ENVIO_INCIERTO','ENVIANDO'].includes(existing.state))return j({error:'No hay envío pendiente de consulta'},409)
   if(existing.submission_method==='sendSummary'){
    if(!existing.ticket)return j({error:'Envío incierto sin ticket: requiere conciliación en SUNAT antes de continuar.'},409)
    const r=await soap('getStatus',`<ticket>${esc(existing.ticket)}</ticket>`),s=r.body?.getStatusResponse?.status
    if(s?.content)return await finish(String(s.content),existing)
    if(String(s?.statusCode)==='98')return j({ok:true,state:'PROCESANDO',message:'SUNAT sigue procesando el resumen.'})
    return j({error:'SUNAT aún no devolvió un CDR verificable'},424)
   }
   const type=d.tipo==='factura'?'01':'07'
   const r=await soap('getStatusCdr',`<rucComprobante>${cfg.ruc}</rucComprobante><tipoComprobante>${type}</tipoComprobante><serieComprobante>${esc(d.serie)}</serieComprobante><numeroComprobante>${d.correlativo}</numeroComprobante>`,true),s=r.body?.getStatusCdrResponse?.statusCdr
   if(s?.content)return await finish(String(s.content),existing)
   return j({error:'No se recuperó un CDR. Verifica en SUNAT antes de reenviar.'},424)
  }
  if(body.confirm_production!==true||existing.state!=='PREPARADO'||existing.actor_id!==auth.user.id||existing.approved_hash!==existing.xml_hash)return j({error:'Falta revisar y confirmar el expediente o ya fue enviado.'},409)
  const bytes=await download(existing.zip_path);if(await sha(bytes)!==existing.xml_hash)throw Error('El expediente cambió')
  const {data:lock,error:le}=await sb.from('cpe_production_jobs').update({state:'ENVIANDO',sent_at:new Date().toISOString()}).eq('comprobante_id',d.id).eq('state','PREPARADO').eq('approved_hash',existing.xml_hash).select('comprobante_id').maybeSingle()
  if(le||!lock)return j({error:'El comprobante ya está siendo enviado'},409)
  await patchDocument({estado_sunat:'ENVIANDO',enviado_sunat_at:new Date().toISOString()})
  try{
   const r=await soap(existing.submission_method,`<fileName>${esc(existing.submission_name)}.zip</fileName><contentFile>${b64(bytes)}</contentFile>`)
   const response=r.body?.[existing.submission_method+'Response']
   if(existing.submission_method==='sendSummary'&&response?.ticket){const ticket=String(response.ticket);await patchJob({state:'PROCESANDO',ticket,message:'Resumen recibido, aceptación pendiente de CDR.'});await patchDocument({estado_sunat:'PROCESANDO',sunat_mensaje:'Resumen recibido por SUNAT. Consulta el ticket para obtener el CDR.'});return j({ok:true,state:'PROCESANDO',ticket,message:'SUNAT recibió el resumen. Consulta su resultado.'})}
   if(response?.applicationResponse)return await finish(String(response.applicationResponse),existing)
   const fault=r.body?.Fault
   if(fault){
    const code=String(fault.faultcode||'').slice(0,80)
    let message=String(fault.faultstring||'SUNAT devolvió un error SOAP').slice(0,1000)
    for(const secret of [Deno.env.get('SUNAT_SOL_PASSWORD'),Deno.env.get('SUNAT_SOL_USER')])if(secret)message=message.replaceAll(secret,'[oculto]')
    await patchJob({state:'ENVIO_INCIERTO',response_code:code,message})
    await patchDocument({estado_sunat:'ENVIO_INCIERTO',sunat_codigo:code,sunat_mensaje:message+' · Conciliar antes de reenviar.'})
    return j({error:message,code,state:'ENVIO_INCIERTO'},424)
   }
   // A SOAP fault or lost response can follow an earlier accepted request. Never retry automatically.
   await patchJob({state:'ENVIO_INCIERTO',message:'No se obtuvo CDR ni ticket. Conciliar antes de reenviar.'});await patchDocument({estado_sunat:'ENVIO_INCIERTO',sunat_mensaje:'No se confirmó el resultado. Consultar en SUNAT antes de reenviar.'})
   return j({error:'SUNAT no devolvió un CDR ni ticket verificable. Requiere conciliación.',state:'ENVIO_INCIERTO'},424)
  }catch{await patchJob({state:'ENVIO_INCIERTO',message:'Resultado incierto. No reenviar sin conciliación.'});await patchDocument({estado_sunat:'ENVIO_INCIERTO',sunat_mensaje:'Resultado incierto. Consultar en SUNAT antes de reenviar.'});return j({error:'Resultado incierto. Consulta antes de continuar.',state:'ENVIO_INCIERTO'},424)}
 }catch(e){return j({error:e instanceof Error?e.message:'No se pudo completar la operación'},422)}
})

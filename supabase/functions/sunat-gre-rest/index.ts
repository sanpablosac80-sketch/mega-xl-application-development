import {createClient} from 'npm:@supabase/supabase-js@2.57.4'
import JSZip from 'jszip'
import {XMLParser,XMLValidator} from 'fast-xml-parser'
import {readCdr} from './cdr.mjs'
const json=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}})
const base='https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes/'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const b64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s)}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return json({ok:false,error:'Método no permitido'},405)
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})
 const {data:auth}=await sb.auth.getUser(req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'')
 if(!auth.user)return json({ok:false,error:'Inicia sesión'},401)
 const {data:p}=await sb.from('perfiles_usuario').select('activo,rol_codigo').eq('id',auth.user.id).maybeSingle()
 if(!p?.activo||!['A','B'].includes(p.rol_codigo))return json({ok:false,error:'Acceso no autorizado'},403)
 const body=await req.json().catch(()=>null)
 if(!uuid.test(body?.guia_id||'')||!['prepare','authorize','send','consult'].includes(body?.action))return json({ok:false,error:'Solicitud no válida'},400)
 const {data:g}=await sb.from('guias_remision').select('*').eq('id',body.guia_id).maybeSingle()
 if(!g)return json({ok:false,error:'Guía no encontrada'},404)
 const {data:cfg}=await sb.from('configuracion').select('ruc').eq('id',1).maybeSingle()
 if(!/^\d{11}$/.test(cfg?.ruc||''))return json({ok:false,error:'RUC del emisor no válido'},409)
 const name=`${cfg.ruc}-09-${g.serie}-${g.correlativo}`
 async function token(){
  const clientId=Deno.env.get('SUNAT_CLIENT_ID')?.trim(),secret=Deno.env.get('SUNAT_CLIENT_SECRET'),user=Deno.env.get('SUNAT_SOL_USER')?.trim(),password=Deno.env.get('SUNAT_SOL_PASSWORD')
  if(!clientId||!secret||!user||!password)throw Error('Credenciales incompletas')
  const r=await fetch(`https://api-seguridad.sunat.gob.pe/v1/clientessol/${encodeURIComponent(clientId)}/oauth2/token/`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'password',scope:'https://api-cpe.sunat.gob.pe',client_id:clientId,client_secret:secret,username:user.startsWith(cfg.ruc)?user:cfg.ruc+user,password}),signal:AbortSignal.timeout(25000)})
  const d=await r.json().catch(()=>null)
  if(!r.ok||typeof d?.access_token!=='string')throw Error('SUNAT no aceptó las credenciales')
  return d.access_token
 }
 async function update(values:Record<string,unknown>){const {error}=await sb.from('guias_remision').update(values).eq('id',g.id);if(error)throw Error('No se pudo guardar la respuesta SUNAT')}
 try{
  if(body.action==='consult'){
   if(!g.sunat_ticket||g.gre_environment!=='production')return json({ok:false,error:'La guía no tiene ticket de envío REST a SUNAT'},409)
   if(g.estado_sunat==='ACEPTADO'&&g.cdr_path)return json({ok:true,accepted:true,state:g.estado_sunat,ticket:g.sunat_ticket})
   const access=await token()
   const r=await fetch(base+'envios/'+encodeURIComponent(g.sunat_ticket),{headers:{Authorization:`Bearer ${access}`},signal:AbortSignal.timeout(25000)})
   const d=await r.json().catch(()=>null)
   if(!r.ok)return json({ok:false,error:'SUNAT no permitió consultar el ticket',sunat_http:r.status},424)
   const code=String(d?.codRespuesta??'')
   if(code==='98'){await update({estado_sunat:'PROCESANDO',sunat_mensaje:'SUNAT está procesando el envío.'});return json({ok:true,accepted:false,state:'PROCESANDO',ticket:g.sunat_ticket})}
   if(d?.arcCdr){
    const cdr=await readCdr(d.arcCdr,`${g.serie}-${g.correlativo}`)
    if(cdr.accepted&&code!=='0')throw Error('Respuesta SUNAT inconsistente; no se puede marcar la guía como aceptada')
    const path=`gre/cdr/${g.sunat_ticket}/R-${name}.zip`
    const {error}=await sb.storage.from('sunat-private').upload(path,cdr.bytes,{contentType:'application/zip',upsert:true})
    if(error)throw Error('No se pudo guardar el CDR')
    const state=cdr.accepted?'ACEPTADO':'RECHAZADO'
    await update({estado_sunat:state,cdr_path:path,sunat_codigo:cdr.code,sunat_mensaje:cdr.description,qr_text:cdr.accepted?cdr.qrText:null,respuesta_sunat_at:new Date().toISOString()})
    return json({ok:true,accepted:cdr.accepted,state,response_code:cdr.code,description:cdr.description,ticket:g.sunat_ticket})
   }
   if(code==='99'){await update({estado_sunat:'ERROR_REST',sunat_codigo:String(d.error?.numError||'99'),sunat_mensaje:String(d.error?.desError||'SUNAT informó un error del envío.').slice(0,2000),respuesta_sunat_at:new Date().toISOString()});return json({ok:false,accepted:false,state:'ERROR_REST'},422)}
   return json({ok:false,accepted:false,error:'SUNAT aún no devolvió un CDR verificable',sunat_code:code},424)
  }
  if(g.sunat_ticket)return json({ok:false,error:'La guía ya tiene ticket. Consulta su estado.'},409)
  if(!['PENDIENTE','ERROR_BETA','RECHAZADO_BETA','ERROR_REST'].includes(g.estado_sunat))return json({ok:false,error:'La guía no permite un nuevo envío. Revisar el estado.'},409)
  if(!g.documento_path?.startsWith('gre/signed/'))return json({ok:false,error:'Primero genera y firma el XML'},409)
  const {data:blob}=await sb.storage.from('sunat-private').download(g.documento_path)
  if(!blob)throw Error('XML firmado no disponible')
  const xml=await blob.text()
  if(xml.length>5_000_000||/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw Error('XML no válido')
  const d=new XMLParser({removeNSPrefix:true,parseTagValue:false}).parse(xml).DespatchAdvice
  const errors:string[]=[]
  if(d?.ID!==`${g.serie}-${g.correlativo}`||d?.DespatchAdviceTypeCode!=='09'||d?.CustomizationID!=='2.0')errors.push('Identificación o versión GRE incorrecta')
  if(d?.DespatchSupplierParty?.Party?.PartyIdentification?.ID!==cfg.ruc)errors.push('RUC del XML no coincide con el emisor')
  if(!d?.UBLExtensions?.UBLExtension?.ExtensionContent?.Signature)errors.push('Falta firma digital XML')
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(d?.IssueTime||''))errors.push('Hora de emisión debe tener formato HH:MM:SS')
  const shipment=d?.Shipment,stage=shipment?.ShipmentStage
  if(shipment?.HandlingCode!=='01')errors.push('Este envío inicial admite únicamente el motivo Venta; otros motivos requieren revisar sus campos específicos')
  if(!(Number(shipment?.GrossWeightMeasure)>0))errors.push('Peso bruto obligatorio')
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  if(d?.IssueDate!==today||String(stage?.TransitPeriod?.StartDate||'')<today)errors.push('Fecha de emisión o inicio de traslado debe actualizarse antes del envío')
  if(stage?.TransportModeCode==='02'&&(!stage?.DriverPerson?.FirstName||!stage?.DriverPerson?.FamilyName))errors.push('Faltan nombres y apellidos reales del conductor en el XML')
  if(errors.length)return json({ok:false,stage:'preflight',errors,sent:false},422)
  const xmlHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(xml)))).map(x=>x.toString(16).padStart(2,'0')).join('')
  if(body.action==='authorize'){
   if(body.confirm_production!==true)return json({ok:false,error:'Confirma la emisión real de esta guía'},409)
   const {error}=await sb.from('gre_emission_authorizations').upsert({guia_id:g.id,actor_id:auth.user.id,xml_sha256:xmlHash,approved_at:new Date().toISOString()})
   if(error)throw Error('No se pudo registrar la autorización')
   return json({ok:true,stage:'authorized-for-production',sent:false})
  }
  const {data:approval}=await sb.from('gre_emission_authorizations').select('actor_id,xml_sha256').eq('guia_id',g.id).maybeSingle()
  const enabled=approval?.actor_id===auth.user.id&&approval?.xml_sha256===xmlHash
  if(body.action==='prepare')return json({ok:true,stage:'preflight-local',sent:false,sending_enabled:enabled})
  if(!enabled||body.confirm_production!==true)return json({ok:false,error:'Se requiere autorización para emitir esta guía con el XML revisado'},409)
  const access=await token(),zip=new JSZip();zip.file(name+'.xml',xml)
  const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'})
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('')
  const {data:locked,error:lockError}=await sb.from('guias_remision').update({estado_sunat:'ENVIANDO',gre_environment:'production',gre_zip_hash:hash,sunat_mensaje:'Envío REST iniciado.'}).eq('id',g.id).eq('estado_sunat',g.estado_sunat).is('sunat_ticket',null).select('id').maybeSingle()
  if(lockError||!locked)return json({ok:false,error:'Otro proceso inició el envío de esta guía'},409)
  try{
   const r=await fetch(base+name,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify({archivo:{nomArchivo:name+'.zip',arcGreZip:b64(bytes),hashZip:hash}}),signal:AbortSignal.timeout(25000)})
   const response=await r.json().catch(()=>null)
   if(r.ok&&uuid.test(response?.numTicket||'')){
    await update({sunat_ticket:response.numTicket,estado_sunat:'PROCESANDO',enviado_sunat_at:new Date().toISOString(),sunat_mensaje:'SUNAT recibió el envío. Consulta el ticket para obtener el CDR.'})
    return json({ok:true,accepted:false,state:'PROCESANDO',ticket:response.numTicket})
   }
   const uncertain=r.status>=500||r.ok
   await update({estado_sunat:uncertain?'ENVIO_INCIERTO':'ERROR_REST',sunat_codigo:String(r.status),sunat_mensaje:uncertain?'Resultado incierto. Reconciliar con SUNAT antes de intentar otro envío.':'SUNAT rechazó la solicitud REST; revisar los datos y permisos.'})
   return json({ok:false,accepted:false,sunat_http:r.status,state:uncertain?'ENVIO_INCIERTO':'ERROR_REST'},424)
  }catch{
   await update({estado_sunat:'ENVIO_INCIERTO',sunat_mensaje:'No se pudo confirmar la respuesta. Verifica en SUNAT antes de reenviar.'})
   return json({ok:false,accepted:false,error:'Resultado incierto del envío; no reenviar automáticamente'},504)
  }
 }catch(e){return json({ok:false,error:e instanceof Error?e.message:'Error en el proceso GRE'},424)}
})

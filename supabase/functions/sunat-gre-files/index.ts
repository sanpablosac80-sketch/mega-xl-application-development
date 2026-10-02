import {createClient} from 'npm:@supabase/supabase-js@2.57.4'
import {renderGre} from './render.mjs'
const error=(message:string,status:number)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}})
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return error('Método no permitido',405)
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''
 const {data:auth}=await sb.auth.getUser(token)
 if(!auth.user)return error('Inicia sesión',401)
 const {data:profile}=await sb.from('perfiles_usuario').select('rol_codigo,activo').eq('id',auth.user.id).maybeSingle()
 if(!profile?.activo||!['A','B','C','D'].includes(profile.rol_codigo))return error('Acceso no autorizado',403)
 const body=await req.json().catch(()=>null),id=body?.guia_id,type=body?.type||'pdf'
 if(typeof id!=='string'||! /^[0-9a-f-]{36}$/i.test(id)||!['pdf','xml','cdr'].includes(type))return error('Solicitud no válida',400)
 const {data:g}=await sb.from('guias_remision').select('serie,correlativo,estado_sunat,documento_path,qr_text,cdr_path').eq('id',id).maybeSingle()
 if(type==='cdr'){
  if(!g?.cdr_path)return error('La guía aún no tiene CDR de SUNAT',409)
  const {data:cdr}=await sb.storage.from('sunat-private').download(g.cdr_path)
  if(!cdr)return error('CDR no disponible',404)
  return new Response(cdr,{headers:{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="CDR-${g.serie}-${g.correlativo}.zip"`,'Cache-Control':'private, no-store'}})
 }
 if(!g?.documento_path)return error('Genera el XML de la GRE primero',409)
 const {data:blob}=await sb.storage.from('sunat-private').download(g.documento_path)
 if(!blob)return error('XML no disponible',404)
 try{
  const xml=await blob.text()
  if(type==='xml')return new Response(xml,{headers:{'Content-Type':'application/xml','Content-Disposition':`attachment; filename="GRE-${g.serie}-${g.correlativo}.xml"`,'Cache-Control':'private, no-store'}})
  const result=await renderGre(xml,g.estado_sunat,g.qr_text||'')
  if(result.guide.id!==`${g.serie}-${g.correlativo}`)return error('XML no corresponde a la guía',409)
  return new Response(result.bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${result.filename}"`,'Cache-Control':'private, no-store'}})
 }catch{return error('No se pudo generar la representación de la GRE',422)}
})

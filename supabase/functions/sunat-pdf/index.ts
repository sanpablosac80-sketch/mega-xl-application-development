import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { renderInvoice } from './render.mjs'
const reply=(error:string,status:number)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}})
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return reply('Método no permitido',405)
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
 if(!token)return reply('Inicia sesión para descargar',401)
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 if(!url||!key)return reply('Servicio no configurado',503)
 const sb=createClient(url,key,{auth:{persistSession:false}})
 const {data:auth,error:ae}=await sb.auth.getUser(token)
 if(ae||!auth.user)return reply('Sesión no válida',401)
 const {data:profile}=await sb.from('perfiles_usuario').select('rol_codigo,activo').eq('id',auth.user.id).maybeSingle()
 if(!profile||!profile.activo||!['A','B','C','D'].includes(profile.rol_codigo))return reply('No tienes acceso a facturación',403)
 const body=await req.json().catch(()=>null),id=body?.comprobante_id
 if(typeof id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return reply('Comprobante no válido',400)
 const {data:d,error}=await sb.from('comprobantes').select('tipo,serie,correlativo,xml_path,estado_sunat,descuento').eq('id',id).maybeSingle()
 if(error)return reply('No se pudo consultar el comprobante',500)
 if(!d)return reply('Comprobante no encontrado',404)
 if(d.tipo!=='factura')return reply('La descarga PDF está disponible para facturas',422)
 if(!d.xml_path)return reply('Genera el XML de la factura primero',409)
 const {data:xml,error:xe}=await sb.storage.from('sunat-private').download(d.xml_path)
 if(xe||!xml)return reply('XML no disponible',409)
 try{
  const result=await renderInvoice(await xml.text(),d.estado_sunat)
  if(Number(d.descuento)>0 && Number(result.invoice.discount)===0)return reply('El descuento registrado no está consignado en el XML; corrige la emisión antes de imprimir',409)
  if(result.invoice.id!==`${d.serie}-${d.correlativo}`)return reply('El XML no corresponde al comprobante',409)
  return new Response(result.bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${result.filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
 }catch{return reply('No se pudo generar el PDF desde el XML; revisa sus datos',422)}
})

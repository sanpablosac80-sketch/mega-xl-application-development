import "jsr:@supabase/functions-js@2.5.0/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import JSZip from "npm:jszip@3.10.1";
const j=(x:unknown,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return j({ok:false,error:"POST required"},405);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if(!url||!key)return j({ok:false,error:"Backend config missing"},500);
 const sb=createClient(url,key,{auth:{persistSession:false}});const {data:auth}=await sb.auth.getUser(req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'');if(!auth.user)return Response.json({error:'Inicia sesión'},{status:401});const {data:profile}=await sb.from('perfiles_usuario').select('activo,rol_codigo').eq('id',auth.user.id).maybeSingle();if(!profile?.activo||!['A','B'].includes(profile.rol_codigo))return Response.json({error:'Acceso no autorizado'},{status:403});const copy=req.clone();const check=await copy.json().catch(()=>({}));const {data:job}=await sb.from('cpe_production_jobs').select('comprobante_id').eq('comprobante_id',check.comprobante_id||'00000000-0000-0000-0000-000000000000').maybeSingle();if(job)return Response.json({error:'El expediente de producción está protegido. Usa su circuito de producción.'},{status:409}); const b=await req.json().catch(()=>({})); if(!b.comprobante_id)return j({ok:false,error:"comprobante_id required"},400);
 const {data:c,error}=await sb.from("comprobantes").select("id,tipo,serie,correlativo,xml_path").eq("id",b.comprobante_id).single();
 if(error||!c?.xml_path||!c.xml_path.startsWith("signed/"))return j({ok:false,error:"Signed XML required"},409);
 const {data:cfg}=await sb.from("configuracion").select("ruc").eq("id",1).single(); if(!cfg?.ruc)return j({ok:false,error:"Issuer RUC missing"},409);
 const {data:blob,error:de}=await sb.storage.from("sunat-private").download(c.xml_path); if(de||!blob)return j({ok:false,error:"Signed XML unavailable"},500);
 const type=c.tipo==="factura"?"01":c.tipo==="boleta"?"03":"07", base=`${cfg.ruc}-${type}-${c.serie}-${c.correlativo}`;
 const zip=new JSZip(); zip.file(base+".xml",new Uint8Array(await blob.arrayBuffer())); const bytes=await zip.generateAsync({type:"uint8array",compression:"DEFLATE"});
 const path=`zip/${base}.zip`; const up=await sb.storage.from("sunat-private").upload(path,bytes,{contentType:"application/zip",upsert:true}); if(up.error)return j({ok:false,error:"ZIP storage failed"},500);
 await sb.from("comprobantes").update({zip_path:path,sunat_mensaje:"XML firmado y ZIP generado. Pendiente de prueba BETA."}).eq("id",c.id);
 return j({ok:true,stage:"zip-ready",filename:base+".zip",zip_path:path,sent:false,sending_enabled:false});
});

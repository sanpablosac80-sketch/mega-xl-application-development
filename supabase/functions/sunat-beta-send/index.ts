import "jsr:@supabase/functions-js@2.5.0/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";

const j=(x:unknown,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});
const esc=(s:string)=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]!));
const unesc=(s:string)=>s.replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&amp;/g,"&");
const tag=(xml:string,name:string)=>{const m=xml.match(new RegExp("<(?:\\w+:)?"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?"+name+">","i"));return m?.[1]?unesc(m[1].replace(/<[^>]+>/g," ").trim()):null;};

Deno.serve(async(req)=>{
 if(req.method!=="POST")return j({ok:false,error:"POST required"},405);
 const b=await req.json().catch(()=>({})); if(!b.comprobante_id)return j({ok:false,error:"comprobante_id required"},400);
 if(b.confirm_beta!==true)return j({ok:false,error:"Explicit BETA confirmation required",environment:"beta",production_enabled:false},409);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if(!url||!key)return j({ok:false,error:"Backend config missing"},500);
 const sb=createClient(url,key,{auth:{persistSession:false}});const {data:auth}=await sb.auth.getUser(req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'');if(!auth.user)return Response.json({error:'Inicia sesión'},{status:401});const {data:profile}=await sb.from('perfiles_usuario').select('activo,rol_codigo').eq('id',auth.user.id).maybeSingle();if(!profile?.activo||!['A','B'].includes(profile.rol_codigo))return Response.json({error:'Acceso no autorizado'},{status:403});const check=b;const {data:job}=await sb.from('cpe_production_jobs').select('comprobante_id').eq('comprobante_id',check.comprobante_id||'00000000-0000-0000-0000-000000000000').maybeSingle();if(job)return Response.json({error:'El expediente de producción está protegido. Usa su circuito de producción.'},{status:409});
 const {data:c,error}=await sb.from("comprobantes").select("id,zip_path").eq("id",b.comprobante_id).single();
 if(error||!c?.zip_path)return j({ok:false,error:"ZIP not ready"},409);
 const {data:z,error:ze}=await sb.storage.from("sunat-private").download(c.zip_path); if(ze||!z)return j({ok:false,error:"ZIP unavailable"},500);
 const filename=c.zip_path.split("/").pop()!; const bytes=new Uint8Array(await z.arrayBuffer()); let raw=""; for(const x of bytes)raw+=String.fromCharCode(x); const content=btoa(raw);
 const ruc=filename.slice(0,11),username=ruc+"MODDATOS",password="MODDATOS";
 const soap=`<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://schemas.xmlsoap.org/ws/2002/12/secext"><soapenv:Header><wsse:Security><wsse:UsernameToken><wsse:Username>${esc(username)}</wsse:Username><wsse:Password>${esc(password)}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><ser:sendBill><fileName>${esc(filename)}</fileName><contentFile>${content}</contentFile></ser:sendBill></soapenv:Body></soapenv:Envelope>`;
 const endpoint="https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService",started=new Date().toISOString();
 const res=await fetch(endpoint,{method:"POST",headers:{"content-type":"text/xml;charset=UTF-8","SOAPAction":""},body:soap});
 const text=await res.text();
 const payload=text.match(/<(?:\w+:)?applicationResponse[^>]*>([\s\S]*?)<\/(?:\w+:)?applicationResponse>/i)?.[1]||text.match(/<(?:\w+:)?return[^>]*>([\s\S]*?)<\/(?:\w+:)?return>/i)?.[1]||text.match(/<(?:\w+:)?document[^>]*>([\s\S]*?)<\/(?:\w+:)?document>/i)?.[1];
 let cdrPath:string|null=null,responseCode:string|null=null,description:string|null=null,cdrXml:string|null=null;
 if(res.ok&&payload){try{
   const bin=atob(payload.trim()); const out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
   cdrPath="cdr/R-"+filename; await sb.storage.from("sunat-private").upload(cdrPath,out,{contentType:"application/zip",upsert:true});
   const files=unzipSync(out); const xmlName=Object.keys(files).find(n=>n.toLowerCase().endsWith(".xml"));
   if(xmlName){cdrXml=strFromU8(files[xmlName]); responseCode=tag(cdrXml,"ResponseCode"); description=tag(cdrXml,"Description");}
 }catch(e){description="CDR processing error: "+(e instanceof Error?e.message:String(e));}}
 const fault=tag(text,"faultstring");
 const accepted=responseCode==="0";
 const state=accepted?"ACEPTADO_BETA":(cdrPath?"RECHAZADO_BETA":"ERROR_BETA");
 const message=description||fault||(`BETA HTTP ${res.status}`);
 await sb.from("comprobantes").update({estado_sunat:state,sunat_mensaje:message,enviado_sunat_at:started,cdr_recibido_at:cdrPath?new Date().toISOString():null,cdr_path:cdrPath}).eq("id",c.id);
 await sb.from("sunat_envios").insert({documento_tipo:"comprobante",documento_id:c.id,ambiente:"beta",estado:state,codigo_respuesta:responseCode??String(res.status),mensaje_respuesta:message,responded_at:new Date().toISOString()});
 return j({ok:res.ok,environment:"beta",http_status:res.status,cdr_received:!!cdrPath,cdr_path:cdrPath,response_code:responseCode,description,accepted,production_enabled:false},res.ok?200:422);
});

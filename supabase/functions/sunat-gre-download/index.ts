import "jsr:@supabase/functions-js@2.5.0/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
Deno.serve(async(req)=>{
 if(req.method!=="POST")return Response.json({error:"POST required"},{status:405});
 const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const sb=createClient(url,key,{auth:{persistSession:false}});
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
 const {data:auth}=await sb.auth.getUser(token);
 if(!auth.user)return Response.json({error:"Inicia sesión"},{status:401});
 const {data:profile}=await sb.from("perfiles_usuario").select("rol_codigo,activo").eq("id",auth.user.id).maybeSingle();
 if(!profile?.activo||!["A","B","C","D"].includes(profile.rol_codigo))return Response.json({error:"Acceso no autorizado"},{status:403});
 const body=await req.json().catch(()=>({})); const id=body.guia_id;
 if(!id)return Response.json({error:"guia_id required"},{status:400});
 const {data:g,error}=await sb.from("guias_remision").select("serie,correlativo,documento_path").eq("id",id).single();
 if(error||!g?.documento_path?.startsWith("gre/signed/"))return Response.json({error:"Signed GRE unavailable"},{status:404});
 const {data:signed,error:se}=await sb.storage.from("sunat-private").createSignedUrl(g.documento_path,60,{download:`GRE-${g.serie}-${g.correlativo}-firmada.xml`});
 if(se||!signed?.signedUrl)return Response.json({error:"Unable to create temporary download"},{status:500});
 return Response.json({ok:true,url:signed.signedUrl,expires_in:60});
});
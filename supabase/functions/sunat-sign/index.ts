import "jsr:@supabase/functions-js@2.5.0/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import forge from "npm:node-forge@1.3.1";
import { SignedXml } from "npm:xml-crypto@6.1.2";
const j=(x:unknown,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return j({ok:false,error:"POST required"},405);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)return j({ok:false,error:"Backend config missing"},500);
 const sb=createClient(url,key,{auth:{persistSession:false}});const {data:auth}=await sb.auth.getUser(req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'');if(!auth.user)return Response.json({error:'Inicia sesión'},{status:401});const {data:profile}=await sb.from('perfiles_usuario').select('activo,rol_codigo').eq('id',auth.user.id).maybeSingle();if(!profile?.activo||!['A','B'].includes(profile.rol_codigo))return Response.json({error:'Acceso no autorizado'},{status:403});const copy=req.clone();const check=await copy.json().catch(()=>({}));const {data:job}=await sb.from('cpe_production_jobs').select('comprobante_id').eq('comprobante_id',check.comprobante_id||'00000000-0000-0000-0000-000000000000').maybeSingle();if(job)return Response.json({error:'El expediente de producción está protegido. Usa su circuito de producción.'},{status:409});const body=await req.json().catch(()=>({}));const id=body.comprobante_id;if(!id)return j({ok:false,error:"comprobante_id required"},400);
 const {data:d,error}=await sb.from("comprobantes").select("id,xml_path").eq("id",id).single();if(error||!d?.xml_path)return j({ok:false,error:"UBL draft not found"},404);
 let sourcePath=d.xml_path as string;if(sourcePath.startsWith("signed/"))sourcePath=sourcePath.replace(/^signed\//,"draft/");
 const [{data:xmlBlob,error:xe},{data:p12Blob,error:pe}]=await Promise.all([sb.storage.from("sunat-private").download(sourcePath),sb.storage.from("sunat-private").download("certificado.p12")]);if(xe||pe||!xmlBlob||!p12Blob)return j({ok:false,error:"Private files unavailable"},500);
 try{
  const bytes=new Uint8Array(await p12Blob.arrayBuffer());let raw="";for(const b of bytes)raw+=String.fromCharCode(b);
  const p12=forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.createBuffer(raw,"raw")),false,Deno.env.get("SUNAT_CERT_PASSWORD")||"");
  const cert=(p12.getBags({bagType:forge.pki.oids.certBag})[forge.pki.oids.certBag]||[])[0]?.cert;const kb=(p12.getBags({bagType:forge.pki.oids.pkcs8ShroudedKeyBag})[forge.pki.oids.pkcs8ShroudedKeyBag]||[])[0];if(!cert||!kb?.key)throw new Error("certificate/key missing");
  let xml=await xmlBlob.text();xml=xml.replace(/<ext:ExtensionContent\s*\/>/,"<ext:ExtensionContent></ext:ExtensionContent>");if(!xml.includes("<ext:ExtensionContent></ext:ExtensionContent>"))throw new Error("ExtensionContent placeholder missing");
  const sig=new SignedXml({privateKey:forge.pki.privateKeyToPem(kb.key),idMode:"wssecurity"});
  sig.signatureAlgorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";sig.canonicalizationAlgorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
  const root=xml.includes("<CreditNote")?"CreditNote":"Invoice";
  sig.addReference({xpath:"//*[local-name(.)='"+root+"']",transforms:["http://www.w3.org/2000/09/xmldsig#enveloped-signature","http://www.w3.org/TR/2001/REC-xml-c14n-20010315"],digestAlgorithm:"http://www.w3.org/2001/04/xmlenc#sha256",isEmptyUri:true});
  const cert64=forge.pki.certificateToPem(cert).replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\r|\n/g,"");sig.getKeyInfoContent=()=>"<ds:X509Data><ds:X509Certificate>"+cert64+"</ds:X509Certificate></ds:X509Data>";
  sig.computeSignature(xml,{location:{reference:"//*[local-name(.)='ExtensionContent'][1]",action:"append"},prefix:"ds",attrs:{Id:"SignatureSP"}});
  let signed=sig.getSignedXml();
  signed=signed.replace(/(<Invoice\b[^>]*?)\s+(?:Id|wsu:Id)="[^"]*"([^>]*>)/,"$1$2").replace(/<ds:Reference URI="#[^"]*">/,"<ds:Reference URI=\"\">");
  const verifier=new SignedXml();verifier.publicCert=forge.pki.certificateToPem(cert);verifier.loadSignature(signed.match(/<ds:Signature[\s\S]*?<\/ds:Signature>/)?.[0]||"");if(!verifier.checkSignature(signed))throw new Error("Local XMLDSig verification failed");
  const path=sourcePath.replace(/^draft\//,"signed/");const up=await sb.storage.from("sunat-private").upload(path,new Blob([signed],{type:"application/xml"}),{contentType:"application/xml",upsert:true});if(up.error)throw up.error;
  await sb.from("comprobantes").update({xml_path:path,sunat_mensaje:"XMLDSig validado localmente, Reference URI vacío, listo para BETA."}).eq("id",id);return j({ok:true,stage:"signed-verified",xml_path:path,reference_uri:"",local_verified:true,sent:false,sending_enabled:false});
 }catch(e){const detail=e instanceof Error?e.message:String(e);await sb.from("comprobantes").update({sunat_mensaje:"Error de firma XMLDSig: "+detail.slice(0,220)}).eq("id",id);return j({ok:false,error:"Signing failed",detail:detail.slice(0,300),sending_enabled:false},422)}
});

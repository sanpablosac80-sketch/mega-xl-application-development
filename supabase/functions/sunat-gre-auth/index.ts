import {createClient} from 'npm:@supabase/supabase-js@2.57.4'
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}})
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return json({ok:false,error:'Método no permitido'},405)
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''
 const {data:auth}=await sb.auth.getUser(token)
 if(!auth.user)return json({ok:false,error:'Inicia sesión'},401)
 const {data:profile}=await sb.from('perfiles_usuario').select('rol_codigo,activo').eq('id',auth.user.id).maybeSingle()
 if(!profile?.activo||!['A','B'].includes(profile.rol_codigo))return json({ok:false,error:'Acceso no autorizado'},403)
 const clientId=Deno.env.get('SUNAT_CLIENT_ID')?.trim(),secret=Deno.env.get('SUNAT_CLIENT_SECRET'),user=Deno.env.get('SUNAT_SOL_USER')?.trim(),password=Deno.env.get('SUNAT_SOL_PASSWORD')
 const {data:config}=await sb.from('configuracion').select('ruc').eq('id',1).maybeSingle()
 const ruc=config?.ruc?.trim()
 if(!clientId||!secret||!user||!password||!/^\d{11}$/.test(ruc||''))return json({ok:false,error:'Faltan credenciales API/SOL o RUC del emisor',sending_enabled:false},424)
 const username=user.startsWith(ruc)?user:ruc+user
 try{
  const response=await fetch(`https://api-seguridad.sunat.gob.pe/v1/clientessol/${encodeURIComponent(clientId)}/oauth2/token/`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'password',scope:'https://api-cpe.sunat.gob.pe',client_id:clientId,client_secret:secret,username,password}),signal:AbortSignal.timeout(25000)})
  const data=await response.json().catch(()=>null)
  const ok=response.ok&&typeof data?.access_token==='string'&&data.access_token.length>0
  // Never return SUNAT's raw response: it may contain a token or credential details.
  const code=typeof data?.error==='string'&&/^[a-z_]{1,50}$/.test(data.error)?data.error:null
  return json({ok,mode:'authentication-only',sunat_http:response.status,sunat_error:code,expires_in:ok?Number(data.expires_in)||null:null,sending_enabled:false,message:ok?'SUNAT aceptó las credenciales. No se envió ninguna guía.':'SUNAT no aceptó la autenticación. Revisar credenciales API y usuario SOL.'},ok?200:424)
 }catch{return json({ok:false,mode:'authentication-only',error:'No se pudo completar la conexión con SUNAT',sending_enabled:false},504)}
})

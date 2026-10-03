import {NextRequest,NextResponse} from 'next/server'
import {createAuthClient} from '@/lib/auth/server'
export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null)
 if(!body||!['prepare','authorize','send','consult'].includes(body.action))return NextResponse.json({error:'Solicitud no válida'},{status:400})
 if(['authorize','send'].includes(body.action)&&body.confirm_production!==true)return NextResponse.json({error:'Confirma los datos y la emisión real de el comprobante'},{status:400})
 const auth=await createAuthClient()
 const {data:{user}}=await auth.auth.getUser()
 if(!user)return NextResponse.json({error:'Inicia sesión'},{status:401})
 const {data:{session}}=await auth.auth.getSession()
 if(!session)return NextResponse.json({error:'Sesión no disponible'},{status:401})
 try{
  const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sunat-cpe-production`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({comprobante_id:body.comprobante_id,action:body.action,confirm_production:body.confirm_production===true}),cache:'no-store',signal:AbortSignal.timeout(30000)})
  return NextResponse.json(await response.json(),{status:response.status,headers:{'Cache-Control':'no-store'}})
 }catch{return NextResponse.json({error:'No se pudo completar la operación de facturación'},{status:503})}
}

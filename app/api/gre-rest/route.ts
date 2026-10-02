import {NextRequest,NextResponse} from 'next/server'
import {createAuthClient} from '@/lib/auth/server'
export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null)
 // Production sends are deliberately unavailable from this review UI.
 if(!body||!['prepare','consult'].includes(body.action))return NextResponse.json({error:'Solicitud no válida'},{status:400})
 const auth=await createAuthClient()
 const {data:{user}}=await auth.auth.getUser()
 if(!user)return NextResponse.json({error:'Inicia sesión'},{status:401})
 const {data:{session}}=await auth.auth.getSession()
 if(!session)return NextResponse.json({error:'Sesión no disponible'},{status:401})
 try{
  const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sunat-gre-rest`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({guia_id:body.guia_id,action:body.action}),cache:'no-store',signal:AbortSignal.timeout(30000)})
  return NextResponse.json(await response.json(),{status:response.status,headers:{'Cache-Control':'no-store'}})
 }catch{return NextResponse.json({error:'No se pudo completar la operación GRE'},{status:503})}
}

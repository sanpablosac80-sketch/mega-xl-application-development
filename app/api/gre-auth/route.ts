import {NextResponse} from 'next/server'
import {createAuthClient} from '@/lib/auth/server'
export async function POST(){
 const auth=await createAuthClient()
 const {data:{user}}=await auth.auth.getUser()
 if(!user)return NextResponse.json({error:'Inicia sesión'},{status:401})
 const {data:{session}}=await auth.auth.getSession()
 if(!session)return NextResponse.json({error:'Sesión no disponible'},{status:401})
 try{
  const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sunat-gre-auth`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:'{}',cache:'no-store',signal:AbortSignal.timeout(30000)})
  const data=await response.json()
  return NextResponse.json(data,{status:response.status,headers:{'Cache-Control':'no-store'}})
 }catch{return NextResponse.json({error:'No se pudo comprobar la conexión con SUNAT'},{status:503})}
}

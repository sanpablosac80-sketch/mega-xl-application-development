import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/auth/server'
export const runtime = 'nodejs'
export async function GET(req: NextRequest) {
 const type=req.nextUrl.searchParams.get('type')||'pdf'
 const id=req.nextUrl.searchParams.get('id')
 if(!['pdf','xml','cdr'].includes(type)||!id||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({error:'Guía o formato no válido'},{status:400})
 const auth=await createAuthClient()
 const {data:user,error}=await auth.auth.getUser()
 if(error||!user.user)return NextResponse.json({error:'Inicia sesión para descargar'},{status:401})
 const {data:session}=await auth.auth.getSession()
 if(!session.session)return NextResponse.json({error:'Sesión no disponible'},{status:401})
 try {
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL
  if(!base)return NextResponse.json({error:'Servicio no configurado'},{status:503})
  const response=await fetch(`${base}/functions/v1/sunat-gre-files`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.session.access_token}`},body:JSON.stringify({guia_id:id,type}),cache:'no-store',signal:AbortSignal.timeout(30000)})
  if(!response.ok){const data=await response.json().catch(()=>null);return NextResponse.json({error:data?.error||'No se pudo descargar la guía'},{status:response.status})}
  if(!response.headers.get('content-type')?.startsWith(type==='cdr'?'application/zip':type==='xml'?'application/xml':'application/pdf'))return NextResponse.json({error:'Documento no válido'},{status:502})
  return new NextResponse(response.body,{headers:{'Content-Type':type==='cdr'?'application/zip':type==='xml'?'application/xml':'application/pdf','Content-Disposition':response.headers.get('content-disposition')||`attachment; filename="guia.${type}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
 }catch{return NextResponse.json({error:'Servicio de documentos temporalmente no disponible'},{status:503})}
}

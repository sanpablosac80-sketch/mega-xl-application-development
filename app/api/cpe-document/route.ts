import {NextRequest,NextResponse} from 'next/server'
import {createAuthClient} from '@/lib/auth/server'
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get('id'),type=req.nextUrl.searchParams.get('type')
 if(!id||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!['xml','cdr'].includes(type||''))return NextResponse.json({error:'Solicitud no válida'},{status:400})
 const sb=await createAuthClient(),{data:{user}}=await sb.auth.getUser()
 if(!user)return NextResponse.json({error:'Inicia sesión'},{status:401})
 const {data:{session}}=await sb.auth.getSession();if(!session)return NextResponse.json({error:'Sesión no disponible'},{status:401})
 try{
 const r=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sunat-pdf`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({comprobante_id:id,type}),cache:'no-store',signal:AbortSignal.timeout(30000)})
 if(!r.ok)return NextResponse.json(await r.json(),{status:r.status})
 const mime=type==='cdr'?'application/zip':'application/xml';if(!r.headers.get('content-type')?.startsWith(mime))return NextResponse.json({error:'Archivo no válido'},{status:502})
 return new Response(await r.arrayBuffer(),{headers:{'Content-Type':mime,'Content-Disposition':r.headers.get('content-disposition')||'attachment','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
 }catch{return NextResponse.json({error:'No se pudo descargar el documento'},{status:503})}
}

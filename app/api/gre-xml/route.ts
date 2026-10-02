import { NextRequest, NextResponse } from 'next/server'

export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get('id')
 if(!id)return NextResponse.json({error:'GRE requerida'},{status:400})
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL
 if(!base)return NextResponse.json({error:'Configuración Supabase no disponible'},{status:500})
 const response=await fetch(`${base}/functions/v1/sunat-gre-download`,{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guia_id:id}),cache:'no-store'
 })
 const data=await response.json().catch(()=>null)
 if(!response.ok||!data?.ok||!data?.url)return NextResponse.json({error:'No se pudo recuperar el XML GRE'},{status:500})
 return NextResponse.redirect(data.url,307)
}

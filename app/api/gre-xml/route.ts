import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/data/supabase'

export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get('id')
 if(!id)return NextResponse.json({error:'GRE requerida'},{status:400})
 const sb=getSupabase()
 const {data:g,error}=await sb.from('guias_remision').select('serie,correlativo,documento_path').eq('id',id).single()
 if(error||!g?.documento_path?.startsWith('gre/signed/'))return NextResponse.json({error:'XML GRE firmado no disponible'},{status:404})
 const {data:file,error:downloadError}=await sb.storage.from('sunat-private').download(g.documento_path)
 if(downloadError||!file)return NextResponse.json({error:'No se pudo recuperar el XML GRE'},{status:500})
 const bytes=await file.arrayBuffer()
 return new NextResponse(bytes,{headers:{
  'Content-Type':'application/xml; charset=utf-8',
  'Content-Disposition':`attachment; filename="GRE-${g.serie}-${g.correlativo}-firmada.xml"`,
  'Cache-Control':'private, no-store'
 }})
}

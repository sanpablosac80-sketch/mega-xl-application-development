import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/data/supabase'

export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get('id')
 if(!id)return NextResponse.json({error:'GRE requerida'},{status:400})
 const sb=getSupabase()
 const {data,error}=await sb.functions.invoke('sunat-gre-download',{body:{guia_id:id}})
 if(error||!data)return NextResponse.json({error:'No se pudo recuperar el XML GRE'},{status:500})
 const xml=typeof data==='string'?data:new XMLSerializer().serializeToString(data)
 return new NextResponse(xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Content-Disposition':'attachment; filename="GRE-firmada.xml"','Cache-Control':'private, no-store'}})
}

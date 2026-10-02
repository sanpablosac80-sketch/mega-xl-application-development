import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GuiaForm } from '@/components/forms/guia-form'
import { getRepository } from '@/lib/data'
import { getSupabase } from '@/lib/data/supabase'
import { generarGreUbl, firmarGre, generarGreZip } from '@/app/actions'

export const metadata: Metadata={title:'Guías de remisión'}

export default async function GuiasPage(){
 const ventas=await (await getRepository()).listVentas()
 const {data:guias}=await getSupabase().from('guias_remision').select('id,serie,correlativo,motivo_traslado,estado_sunat,documento_path,sunat_mensaje').order('created_at',{ascending:false}).limit(10)
 return <div className="mx-auto flex max-w-7xl flex-col gap-6">
  <PageHeader title="Guías de remisión" description="Crea GRE vinculadas a las ventas y sus productos."/>
  <Card><CardHeader><CardTitle>Nueva guía</CardTitle></CardHeader><CardContent><GuiaForm ventas={ventas}/><p className="mt-4 text-xs text-muted-foreground">Estado inicial: PENDIENTE hasta integrar el envío oficial a SUNAT.</p></CardContent></Card>
  <Card><CardHeader><CardTitle>GRE registradas</CardTitle></CardHeader><CardContent className="space-y-3">
   {(guias??[]).length===0?<p className="text-sm text-muted-foreground">Aún no hay GRE registradas.</p>:(guias??[]).map(g=><div key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
    <div><p className="font-medium">{g.serie}-{g.correlativo} · {g.motivo_traslado}</p><p className="text-xs text-muted-foreground">Estado SUNAT: {g.estado_sunat}{g.documento_path?' · XML generado':''}</p>{g.sunat_mensaje&&<p className="text-xs text-muted-foreground">{g.sunat_mensaje}</p>}</div>
    {g.estado_sunat==='PENDIENTE'&&!g.documento_path&&<form action={generarGreUbl}><input type="hidden" name="guia_id" value={g.id}/><Button type="submit">Generar XML GRE</Button></form>}{g.estado_sunat==='PENDIENTE'&&g.documento_path?.startsWith('gre/draft/')&&<form action={firmarGre}><input type="hidden" name="guia_id" value={g.id}/><Button type="submit">Firmar y validar GRE</Button></form>}{g.estado_sunat==='PENDIENTE'&&g.documento_path?.startsWith('gre/signed/')&&<form action={generarGreZip}><input type="hidden" name="guia_id" value={g.id}/><Button type="submit">Generar ZIP GRE</Button></form>}
   </div>)}
  </CardContent></Card>
 </div>
}
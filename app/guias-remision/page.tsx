import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GuiaForm } from '@/components/forms/guia-form'
import { GreConnection, GreRestActions } from '@/components/gre-connection'
import { getRepository } from '@/lib/data'
import { getSupabase } from '@/lib/data/supabase'
import {createAuthClient} from '@/lib/auth/server'
import { generarGreUbl, firmarGre, generarGreZip, validarGre } from '@/app/actions'

export const metadata: Metadata={title:'Guías de remisión'}

export default async function GuiasPage(){
 const auth=await createAuthClient()
 const {data:{user}}=await auth.auth.getUser()
 const {data:profile}=user?await auth.from('perfiles_usuario').select('activo,rol_codigo').eq('id',user.id).maybeSingle():{data:null}
 const canEmit=profile?.activo&&['A','B'].includes(profile.rol_codigo)
 const ventas=await (await getRepository()).listVentas()
 const {data:guias}=await getSupabase().from('guias_remision').select('id,serie,correlativo,motivo_traslado,estado_sunat,documento_path,sunat_mensaje,sunat_ticket,cdr_path').order('created_at',{ascending:false}).limit(10)
 return <div className="mx-auto flex max-w-7xl flex-col gap-6">
  <PageHeader title="Guías de remisión" description="Crea GRE vinculadas a las ventas y sus productos."/>
  <Card><CardHeader><CardTitle>Conexión con SUNAT</CardTitle></CardHeader><CardContent><GreConnection/></CardContent></Card>
  <Card><CardHeader><CardTitle>Nueva guía</CardTitle></CardHeader><CardContent><GuiaForm ventas={ventas}/><p className="mt-4 text-xs text-muted-foreground">Preparación: XML, firma, ZIP y validación local. Administrador y gerente pueden revisar el PDF y emitir cada guía en SUNAT con confirmación explícita. La aceptación se confirma mediante su CDR.</p></CardContent></Card>
  <Card><CardHeader><CardTitle>GRE registradas</CardTitle></CardHeader><CardContent className="space-y-3">
   {(guias??[]).length===0?<p className="text-sm text-muted-foreground">Aún no hay GRE registradas.</p>:(guias??[]).map(g=><div key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
    <div><p className="font-medium">{g.serie}-{g.correlativo} · {g.motivo_traslado}</p><p className="text-xs text-muted-foreground">Estado SUNAT: {g.estado_sunat}{g.documento_path?' · XML generado':''}</p>{g.sunat_mensaje&&<p className="text-xs text-muted-foreground">{g.sunat_mensaje}</p>}</div>
    {g.estado_sunat==='PENDIENTE'&&!g.documento_path&&<form action={generarGreUbl}><input type="hidden" name="guia_id" value={g.id}/><Button type="submit">Generar XML GRE</Button></form>}{g.estado_sunat==='PENDIENTE'&&g.documento_path?.startsWith('gre/draft/')&&<form action={firmarGre}><input type="hidden" name="guia_id" value={g.id}/><Button type="submit">Firmar y validar GRE</Button></form>}{['PENDIENTE','ERROR_BETA','RECHAZADO_BETA'].includes(g.estado_sunat)&&g.documento_path?.startsWith('gre/signed/')&&<form action={generarGreZip}><input type="hidden" name="guia_id" value={g.id}/><Button type="submit">Generar ZIP GRE</Button></form>}{['PENDIENTE','ERROR_BETA','RECHAZADO_BETA'].includes(g.estado_sunat)&&g.documento_path?.startsWith('gre/signed/')&&<form action={validarGre}><input type="hidden" name="guia_id" value={g.id}/><Button type="submit">Validar XML localmente</Button></form>}{g.documento_path?.startsWith('gre/signed/')&&<GreRestActions guiaId={g.id} ticket={g.sunat_ticket} canEmit={Boolean(canEmit)&&['PENDIENTE','ERROR_BETA','RECHAZADO_BETA','ERROR_REST'].includes(g.estado_sunat)}/>}{g.documento_path?.startsWith('gre/signed/')&&<a className="inline-flex rounded-md border px-3 py-2 text-sm" href={`/api/gre-document?type=xml&id=${encodeURIComponent(g.id)}`}>Descargar XML GRE</a>}{g.cdr_path&&<a className="inline-flex rounded-md border px-3 py-2 text-sm" href={`/api/gre-document?type=cdr&id=${encodeURIComponent(g.id)}`}>Descargar CDR SUNAT</a>}{g.documento_path&&<a className="inline-flex rounded-md border px-3 py-2 text-sm" href={`/api/gre-document?type=pdf&id=${encodeURIComponent(g.id)}`}>Descargar PDF de revisión</a>}
   </div>)}
  </CardContent></Card>
 </div>
}

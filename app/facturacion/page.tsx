import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComprobanteForm } from '@/components/forms/comprobante-form'
import { getRepository } from '@/lib/data'
import {createAuthClient} from '@/lib/auth/server'
import {CpeProduction} from '@/components/cpe-production'
import {NotaCreditoForm} from '@/components/forms/nota-credito-form'
import { ProcesarComprobanteBetaForm } from '@/components/forms/procesar-comprobante-beta-form'

export const metadata: Metadata = { title: 'Facturación' }

export default async function FacturacionPage() {
  const ventas = await (await getRepository()).listVentas()
  const sb=await createAuthClient()
  const {data:{user}}=await sb.auth.getUser()
  const {data:profile}=user?await sb.from('perfiles_usuario').select('activo,rol_codigo').eq('id',user.id).single():{data:null}
  const canEmit=!!profile?.activo&&['A','B'].includes(profile.rol_codigo)
  const { data: comprobantes = [] } = await sb
    .from('comprobantes')
    .select('id,tipo,serie,correlativo,total,estado_sunat,sunat_mensaje,cdr_path,cdr_recibido_at,xml_path')
    .order('created_at',{ascending:false})
    .limit(20)

  const pendientes = comprobantes?.filter(c => ['ERROR_BETA','RECHAZADO_BETA'].includes(c.estado_sunat)) ?? []
  const aceptados = comprobantes?.filter(c => c.estado_sunat === 'ACEPTADO_BETA') ?? []

  const production=comprobantes?.filter(c=>!c.estado_sunat.includes('BETA'))??[]
  const {data:jobs=[]}=await sb.from('cpe_production_jobs').select('comprobante_id,state,cdr_path').eq('state','ACEPTADO')
  const acceptedIds=new Set(jobs?.filter(j=>j.cdr_path).map(j=>j.comprobante_id))
  const creditReferences=production.filter(c=>['factura','boleta'].includes(c.tipo)&&c.estado_sunat==='ACEPTADO'&&acceptedIds.has(c.id))
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader title="Facturación" description="Crea boletas y facturas desde ventas registradas." />
      <Card>
        <CardHeader><CardTitle>Nuevo comprobante</CardTitle></CardHeader>
        <CardContent>
          <ComprobanteForm ventas={ventas} />
          <p className="mt-4 text-xs text-muted-foreground">
            Registra el comprobante, prepara su XML firmado, revisa el PDF y confirma la emisión real a SUNAT. Las pruebas BETA se conservan aparte.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Comprobantes de producción</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {production.length?production.map(c=><div key={c.id} className="rounded-lg border p-3">
            <p className="font-medium">{c.serie}-{c.correlativo} · S/ {Number(c.total).toFixed(2)} · {c.estado_sunat}</p>
            <p className="text-sm">{c.sunat_mensaje}</p>
            {c.xml_path&&<div className="mt-2 flex flex-wrap gap-3"><a className="underline" href={`/api/comprobante-pdf?id=${c.id}`}>{c.estado_sunat==='ACEPTADO'?'Descargar PDF':'Revisar PDF'}</a><a className="underline" href={`/api/cpe-document?id=${c.id}&type=xml`}>XML firmado</a>{c.cdr_path&&<a className="underline" href={`/api/cpe-document?id=${c.id}&type=cdr`}>CDR SUNAT</a>}</div>}
            <CpeProduction id={c.id} state={c.estado_sunat} canEmit={canEmit}/>
          </div>):<p className="text-sm">Todavía no hay comprobantes de producción.</p>}
        </CardContent>
      </Card>
      {canEmit&&<Card><CardHeader><CardTitle>Nota de crédito — Anulación total</CardTitle></CardHeader><CardContent><NotaCreditoForm documents={creditReferences}/></CardContent></Card>}
      <Card>
        <CardHeader><CardTitle>Pruebas SUNAT BETA pendientes</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {pendientes.length ? pendientes.map(c => (
            <div key={c.id} className="rounded-lg border p-3">
              <p className="mb-2 text-sm">{`${c.tipo === 'factura' ? 'Factura' : c.tipo === 'nota_credito' ? 'Nota de Crédito' : 'Boleta'} ${c.serie}-${c.correlativo} · S/ ${Number(c.total).toFixed(2)} · ${c.estado_sunat}`}</p>
              {c.xml_path && <a className="mb-3 inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted" href={`/api/comprobante-pdf?id=${encodeURIComponent(c.id)}`}>Descargar PDF</a>}
              <ProcesarComprobanteBetaForm id={c.id} label={`${c.serie}-${c.correlativo}`} />
            </div>
          )) : <p className="text-sm text-muted-foreground">No hay comprobantes pendientes.</p>}
          <p className="text-xs text-muted-foreground">Estas acciones corresponden únicamente a pruebas BETA y no emiten comprobantes con validez tributaria.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Comprobantes aceptados por SUNAT BETA</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {aceptados.length ? aceptados.map(c => (
            <div key={c.id} className="rounded-lg border p-3">
              <p className="font-medium text-green-700">{`${c.tipo === 'factura' ? 'Factura' : c.tipo === 'nota_credito' ? 'Nota de Crédito' : 'Boleta'} ${c.serie}-${c.correlativo} · ACEPTADO POR SUNAT BETA`}</p>
              <p className="text-sm">{`S/ ${Number(c.total).toFixed(2)} · ${c.sunat_mensaje || 'CDR aceptado'}`}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.cdr_path ? 'CDR recibido y almacenado' : 'CDR no disponible'}</p>
              {c.xml_path && <a className="mt-3 inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted" href={`/api/comprobante-pdf?id=${encodeURIComponent(c.id)}`}>Descargar PDF</a>}
            </div>
          )) : <p className="text-sm text-muted-foreground">Todavía no hay comprobantes aceptados en BETA.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComprobanteForm } from '@/components/forms/comprobante-form'
import { getRepository } from '@/lib/data'
import { getSupabase } from '@/lib/data/supabase'
import { ProcesarComprobanteBetaForm } from '@/components/forms/procesar-comprobante-beta-form'

export const metadata: Metadata = { title: 'Facturación' }

export default async function FacturacionPage() {
  const ventas = await (await getRepository()).listVentas()
  const { data: comprobantes = [] } = await getSupabase()
    .from('comprobantes')
    .select('id,tipo,serie,correlativo,total,estado_sunat,sunat_mensaje,cdr_path,cdr_recibido_at,xml_path')
    .in('estado_sunat',['PENDIENTE','ERROR_BETA','RECHAZADO_BETA','ACEPTADO_BETA'])
    .order('created_at',{ascending:false})
    .limit(20)

  const pendientes = comprobantes?.filter(c => c.estado_sunat !== 'ACEPTADO_BETA') ?? []
  const aceptados = comprobantes?.filter(c => c.estado_sunat === 'ACEPTADO_BETA') ?? []

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader title="Facturación" description="Crea boletas y facturas desde ventas registradas." />
      <Card>
        <CardHeader><CardTitle>Nuevo comprobante</CardTitle></CardHeader>
        <CardContent>
          <ComprobanteForm ventas={ventas} />
          <p className="mt-4 text-xs text-muted-foreground">
            Al crear el comprobante, Mega XL genera automáticamente su XML UBL 2.1 y lo conserva en almacenamiento privado. La firma digital y el envío a SUNAT permanecen bloqueados hasta completar las pruebas BETA.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pruebas SUNAT BETA pendientes</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {pendientes.length ? pendientes.map(c => (
            <div key={c.id} className="rounded-lg border p-3">
              <p className="mb-2 text-sm">{`${c.tipo === 'factura' ? 'Factura' : c.tipo === 'nota_credito' ? 'Nota de Crédito' : 'Boleta'} ${c.serie}-${c.correlativo} · S/ ${Number(c.total).toFixed(2)} · ${c.estado_sunat}`}</p>
              {c.tipo === 'factura' && c.xml_path && <a className="mb-3 inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted" href={`/api/comprobante-pdf?id=${encodeURIComponent(c.id)}`}>Descargar factura PDF</a>}
              <ProcesarComprobanteBetaForm id={c.id} label={`${c.serie}-${c.correlativo}`} />
            </div>
          )) : <p className="text-sm text-muted-foreground">No hay comprobantes pendientes.</p>}
          <p className="text-xs text-muted-foreground">Esta acción usa únicamente SUNAT BETA. El envío a producción permanece bloqueado.</p>
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
              {c.tipo === 'factura' && c.xml_path && <a className="mt-3 inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted" href={`/api/comprobante-pdf?id=${encodeURIComponent(c.id)}`}>Descargar factura PDF</a>}
            </div>
          )) : <p className="text-sm text-muted-foreground">Todavía no hay comprobantes aceptados en BETA.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

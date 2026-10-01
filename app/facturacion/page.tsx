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
  const { data: pendientes = [] } = await getSupabase().from('comprobantes').select('id,tipo,serie,correlativo,total,estado_sunat').in('estado_sunat',['PENDIENTE','ERROR_BETA']).order('created_at',{ascending:false}).limit(10)
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Facturación"
        description="Crea boletas y facturas desde ventas registradas."
      />
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
          {pendientes?.length ? pendientes.map(c => <div key={c.id} className="rounded-lg border p-3"><p className="mb-2 text-sm">{`${c.tipo === 'factura' ? 'Factura' : 'Boleta'} ${c.serie}-${c.correlativo} · S/ ${Number(c.total).toFixed(2)} · ${c.estado_sunat}`}</p><ProcesarComprobanteBetaForm id={c.id} label={`${c.serie}-${c.correlativo}`} /></div>) : <p className="text-sm text-muted-foreground">No hay comprobantes pendientes.</p>}
          <p className="text-xs text-muted-foreground">Esta acción usa únicamente SUNAT BETA. El envío a producción permanece bloqueado.</p>
        </CardContent>
      </Card>
    </div>
  )
}

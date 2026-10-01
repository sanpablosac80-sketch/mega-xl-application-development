import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComprobanteForm } from '@/components/forms/comprobante-form'
import { getRepository } from '@/lib/data'

export const metadata: Metadata = { title: 'Facturación' }

export default async function FacturacionPage() {
  const ventas = await (await getRepository()).listVentas()
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
    </div>
  )
}

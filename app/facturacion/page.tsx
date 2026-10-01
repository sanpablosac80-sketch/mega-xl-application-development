import type { Metadata } from 'next'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Facturación' }

export default function FacturacionPage() {
  return <div className="mx-auto flex max-w-7xl flex-col gap-6">
    <PageHeader title="Facturación" description="Boletas y facturas electrónicas vinculadas a las ventas de Mega XL." />
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-5" />Facturación electrónica</CardTitle><CardDescription>Precios con IGV incluido y descuentos registrados en la venta.</CardDescription></CardHeader>
    <CardContent className="space-y-2 text-sm"><p>El módulo almacenará serie, correlativo, cliente, valor de venta, descuento, IGV 18%, total y estado SUNAT.</p><p className="text-muted-foreground">Integración SUNAT pendiente de configurar. Ningún documento se mostrará como aceptado hasta recibir la respuesta oficial.</p></CardContent></Card>
  </div>
}
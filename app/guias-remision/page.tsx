import type { Metadata } from 'next'
import { Truck } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Guías de remisión' }

export default function GuiasPage() {
 return <div className="mx-auto flex max-w-7xl flex-col gap-6">
  <PageHeader title="Guías de remisión" description="Gestión de GRE vinculadas a ventas y traslados de mercadería." />
  <Card><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="size-5" />Guía de Remisión Electrónica</CardTitle><CardDescription>GRE Remitente, Transportista y Eventos.</CardDescription></CardHeader>
  <CardContent className="space-y-2 text-sm"><p>Se registrarán motivo del traslado, destinatario, puntos de partida y llegada, modalidad de transporte, vehículo, conductor y productos trasladados.</p><p className="text-muted-foreground">Integración SUNAT pendiente de configurar. El estado inicial será PENDIENTE.</p></CardContent></Card>
 </div>
}
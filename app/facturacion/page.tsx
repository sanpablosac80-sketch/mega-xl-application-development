import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ComprobanteForm } from '@/components/forms/comprobante-form'
import { getRepository } from '@/lib/data'
export const metadata: Metadata={title:'Facturación'}
export default async function FacturacionPage(){const ventas=await (await getRepository()).listVentas();return <div className="mx-auto flex max-w-7xl flex-col gap-6"><PageHeader title="Facturación" description="Crea boletas y facturas desde ventas registradas."/><Card><CardHeader><CardTitle>Nuevo comprobante</CardTitle></CardHeader><CardContent><ComprobanteForm ventas={ventas}/><p className="mt-4 text-xs text-muted-foreground">Estado inicial: PENDIENTE. La aceptación SUNAT se habilitará al conectar el servicio de emisión electrónica.</p></CardContent></Card></div>}
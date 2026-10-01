import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GuiaForm } from '@/components/forms/guia-form'
import { getRepository } from '@/lib/data'
export const metadata: Metadata={title:'Guías de remisión'}
export default async function GuiasPage(){const ventas=await (await getRepository()).listVentas();return <div className="mx-auto flex max-w-7xl flex-col gap-6"><PageHeader title="Guías de remisión" description="Crea GRE vinculadas a las ventas y sus productos."/><Card><CardHeader><CardTitle>Nueva guía</CardTitle></CardHeader><CardContent><GuiaForm ventas={ventas}/><p className="mt-4 text-xs text-muted-foreground">Estado inicial: PENDIENTE hasta integrar el envío oficial a SUNAT.</p></CardContent></Card></div>}
import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getRepository } from '@/lib/data'
import { formatMoney } from '@/lib/format'
export const metadata: Metadata={title:'Contabilidad'}
export default async function ContabilidadPage(){
 const repo=await getRepository(); const [productos,ventas,config]=await Promise.all([repo.listProductos(),repo.listVentas(),repo.getConfiguracion()])
 const costos=new Map(productos.map(p=>[p.id,p.precio_costo])); const ventasNetas=ventas.reduce((a,v)=>a+v.valor_venta,0); const igv=ventas.reduce((a,v)=>a+v.igv,0); const total=ventas.reduce((a,v)=>a+v.total,0); let costo=0
 for(const v of ventas) for(const i of v.items) costo+=(i.producto_id?costos.get(i.producto_id)??0:0)*i.cantidad
 const utilidad=ventasNetas-costo; const inventario=productos.reduce((a,p)=>a+p.stock_actual*p.precio_costo,0); const s=config.simbolo_moneda
 const rows=[['Ventas netas (sin IGV)',ventasNetas],['Costo de ventas estimado',costo],['Utilidad bruta estimada',utilidad],['IGV de ventas',igv],['Cobrado / vendido incl. IGV',total],['Inventario valorizado al costo',inventario]] as const
 return <div className="mx-auto flex max-w-6xl flex-col gap-6"><PageHeader title="Contabilidad y estados financieros" description="Resumen gerencial calculado con la información registrada en Mega XL."/><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{rows.map(([k,v])=><Card key={k}><CardHeader><CardDescription>{k}</CardDescription><CardTitle>{formatMoney(v,s)}</CardTitle></CardHeader></Card>)}</div><Card><CardHeader><CardTitle>Reportes disponibles</CardTitle><CardDescription>Base para cierre contable y estados financieros.</CardDescription></CardHeader><CardContent><p className="text-sm">Estado de resultados · Resumen de IGV · Valorización de inventario · Ventas y costo de ventas. Balance general, flujo de efectivo, cuentas por cobrar/pagar y libros contables se habilitarán al incorporar compras, gastos, caja/bancos y plan contable.</p></CardContent></Card></div>
}

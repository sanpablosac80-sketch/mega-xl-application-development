import type { Metadata } from 'next'
import { CalendarDays, DollarSign, Receipt } from 'lucide-react'
import { VentaDialog } from '@/components/forms/venta-dialog'
import { KpiCard } from '@/components/kpi-card'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { resumenVentas } from '@/lib/analytics'
import { getRepository } from '@/lib/data'
import { formatDateTime, formatMoney } from '@/lib/format'

export const metadata: Metadata = { title: 'Ventas' }

export default async function VentasPage() {
  const repo = await getRepository()
  const [ventas, productos, clientes, config] = await Promise.all([
    repo.listVentas(),
    repo.listProductos(),
    repo.listClientes(),
    repo.getConfiguracion(),
  ])
  const s = config.simbolo_moneda
  const resumen = resumenVentas(ventas)
  const ticket = ventas.length ? ventas.reduce((sum, v) => sum + v.total, 0) / ventas.length : 0

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader title="Ventas" description="Registra ventas y consulta el historial de transacciones.">
        <VentaDialog productos={productos} clientes={clientes} simbolo={s} />
      </PageHeader>

      <section aria-label="Resumen de ventas" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Ventas del día" value={formatMoney(resumen.dia, s)} hint={`${resumen.diaCount} transacciones`} icon={DollarSign} tone="success" />
        <KpiCard label="Ventas del mes" value={formatMoney(resumen.mes, s)} hint={`${resumen.mesCount} transacciones`} icon={CalendarDays} />
        <KpiCard label="Ticket promedio" value={formatMoney(ticket, s)} hint={`${ventas.length} ventas en total`} icon={Receipt} />
      </section>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead>N.º</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Aún no hay ventas registradas.
                </TableCell>
              </TableRow>
            ) : (
              ventas.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{`#${v.numero}`}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(v.created_at)}</TableCell>
                  <TableCell className="font-medium">{v.cliente_nombre ?? 'Cliente general'}</TableCell>
                  <TableCell className="max-w-72">
                    <span className="block truncate text-muted-foreground" title={v.items.map((i) => `${i.cantidad} × ${i.producto_nombre}`).join(', ')}>
                      {v.items.map((i) => `${i.cantidad} × ${i.producto_nombre}`).join(', ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{v.metodo_pago}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatMoney(v.total, s)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

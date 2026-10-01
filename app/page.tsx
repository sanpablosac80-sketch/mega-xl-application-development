import Link from 'next/link'
import {
  AlertTriangle,
  CalendarDays,
  DollarSign,
  Package,
  PackageX,
  Receipt,
  Wallet,
} from 'lucide-react'
import { VentasAreaChart } from '@/components/charts'
import { VentaDialog } from '@/components/forms/venta-dialog'
import { KpiCard } from '@/components/kpi-card'
import { PageHeader } from '@/components/page-header'
import { StockBadge } from '@/components/stock-badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { resumenInventario, resumenVentas, ventasPorDia } from '@/lib/analytics'
import { getRepository } from '@/lib/data'
import { estadoStock, formatDateTime, formatMoney, formatNumber } from '@/lib/format'

export default async function DashboardPage() {
  const repo = await getRepository()
  const [productos, ventas, clientes, config] = await Promise.all([
    repo.listProductos(),
    repo.listVentas(),
    repo.listClientes(),
    repo.getConfiguracion(),
  ])
  const s = config.simbolo_moneda
  const inv = resumenInventario(productos)
  const vts = resumenVentas(ventas)
  const chart = ventasPorDia(ventas, 14)
  const alertas = productos
    .filter((p) => estadoStock(p) !== 'OK')
    .sort((a, b) => a.stock_actual - b.stock_actual)
    .slice(0, 6)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader title="Panel de control" description={`Resumen general de ${config.nombre_empresa}`}>
        <VentaDialog productos={productos} clientes={clientes} simbolo={s} />
      </PageHeader>

      <section aria-label="Indicadores" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Total de productos" value={formatNumber(inv.total)} hint="Productos en catálogo" icon={Package} />
        <KpiCard label="Productos sin stock" value={formatNumber(inv.sinStock)} hint="Requieren reposición inmediata" icon={PackageX} tone="danger" />
        <KpiCard label="Productos con stock bajo" value={formatNumber(inv.stockBajo)} hint="En o por debajo del mínimo" icon={AlertTriangle} tone="warning" />
        <KpiCard label="Valor del inventario" value={formatMoney(inv.valorCosto, s)} hint={`A precio de venta: ${formatMoney(inv.valorVenta, s)}`} icon={Wallet} />
        <KpiCard label="Ventas del día" value={formatMoney(vts.dia, s)} hint={`${vts.diaCount} ${vts.diaCount === 1 ? 'venta' : 'ventas'} hoy`} icon={DollarSign} tone="success" />
        <KpiCard label="Ventas del mes" value={formatMoney(vts.mes, s)} hint={`${vts.mesCount} ventas este mes`} icon={CalendarDays} tone="success" />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ventas de los últimos 14 días</CardTitle>
            <CardDescription>Total vendido por día</CardDescription>
          </CardHeader>
          <CardContent>
            <VentasAreaChart data={chart} simbolo={s} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas de stock</CardTitle>
            <CardDescription>Productos que necesitan reposición</CardDescription>
            <CardAction>
              <Link href="/inventario" className="text-sm font-medium text-primary hover:underline">
                Ver todo
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {alertas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todo el inventario está en niveles óptimos.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {alertas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{p.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        {`Stock ${p.stock_actual} · mínimo ${p.stock_minimo}`}
                      </span>
                    </div>
                    <StockBadge estado={estadoStock(p)} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas ventas</CardTitle>
          <CardDescription>Las 5 transacciones más recientes</CardDescription>
          <CardAction>
            <Link href="/ventas" className="text-sm font-medium text-primary hover:underline">
              Ver ventas
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {ventas.slice(0, 5).map((v) => (
              <li key={v.id} className="flex items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Receipt className="size-4" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {`#${v.numero} · ${v.cliente_nombre ?? 'Cliente general'}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {`${formatDateTime(v.created_at)} · ${v.metodo_pago}`}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatMoney(v.total, s)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

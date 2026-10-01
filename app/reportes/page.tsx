import type { Metadata } from 'next'
import { Coins, Percent, TrendingUp, Wallet } from 'lucide-react'
import { TopProductosChart, VentasAreaChart } from '@/components/charts'
import { KpiCard } from '@/components/kpi-card'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { resumenInventario, topProductos, ventasPorDia, ventasPorMetodo } from '@/lib/analytics'
import { getRepository } from '@/lib/data'
import { formatMoney, formatNumber } from '@/lib/format'

export const metadata: Metadata = { title: 'Reportes' }

export default async function ReportesPage() {
  const repo = await getRepository()
  const [productos, ventas, config] = await Promise.all([
    repo.listProductos(),
    repo.listVentas(),
    repo.getConfiguracion(),
  ])
  const s = config.simbolo_moneda
  const inv = resumenInventario(productos)
  const diario = ventasPorDia(ventas, 30)
  const top = topProductos(ventas)
  const metodos = ventasPorMetodo(ventas)

  const costos = new Map(productos.map((p) => [p.id, p.precio_costo]))
  let ingresos = 0
  let costoVendido = 0
  for (const v of ventas) {
    ingresos += v.total
    for (const i of v.items) {
      costoVendido += (i.producto_id ? costos.get(i.producto_id) ?? 0 : 0) * i.cantidad
    }
  }
  const ganancia = ingresos - costoVendido
  const margen = ingresos > 0 ? (ganancia / ingresos) * 100 : 0
  const ingresos30 = diario.reduce((sum, d) => sum + d.total, 0)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader title="Reportes" description="Analiza el desempeño de ventas e inventario." />

      <section aria-label="Indicadores financieros" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ventas últimos 30 días" value={formatMoney(ingresos30, s)} icon={TrendingUp} />
        <KpiCard label="Ganancia estimada" value={formatMoney(ganancia, s)} hint="Ingresos menos costo de lo vendido" icon={Coins} tone="success" />
        <KpiCard label="Margen bruto" value={`${margen.toFixed(1)}%`} icon={Percent} />
        <KpiCard label="Inventario a precio de venta" value={formatMoney(inv.valorVenta, s)} hint={`Costo: ${formatMoney(inv.valorCosto, s)}`} icon={Wallet} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Evolución de ventas</CardTitle>
          <CardDescription>Total vendido por día en los últimos 30 días</CardDescription>
        </CardHeader>
        <CardContent>
          <VentasAreaChart data={diario} simbolo={s} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Productos más vendidos</CardTitle>
            <CardDescription>Top 5 por ingresos generados</CardDescription>
          </CardHeader>
          <CardContent>
            {top.length ? (
              <TopProductosChart data={top} simbolo={s} />
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos de ventas.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas por método de pago</CardTitle>
            <CardDescription>Distribución de ingresos</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {metodos.map((m) => {
              const pct = ingresos > 0 ? (m.total / ingresos) * 100 : 0
              return (
                <div key={m.metodo} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{m.metodo}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {`${formatMoney(m.total, s)} · ${formatNumber(m.count)} ventas`}
                    </span>
                  </div>
                  <Progress value={pct} aria-label={`${m.metodo}: ${pct.toFixed(0)}%`} />
                </div>
              )
            })}
            <div className="mt-2 grid grid-cols-3 gap-3 rounded-lg bg-muted/60 p-4 text-center">
              <div className="flex flex-col">
                <span className="text-lg font-bold tabular-nums">{formatNumber(inv.total)}</span>
                <span className="text-xs text-muted-foreground">Productos</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tabular-nums text-warning-foreground">{formatNumber(inv.stockBajo)}</span>
                <span className="text-xs text-muted-foreground">Stock bajo</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tabular-nums text-destructive">{formatNumber(inv.sinStock)}</span>
                <span className="text-xs text-muted-foreground">Sin stock</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

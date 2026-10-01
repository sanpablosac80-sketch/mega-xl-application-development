import type { Metadata } from 'next'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { MovimientoDialog } from '@/components/forms/movimiento-dialog'
import { InventarioTable } from '@/components/inventario-table'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getRepository } from '@/lib/data'
import { formatDateTime, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Inventario' }

export default async function InventarioPage() {
  const repo = await getRepository()
  const [productos, movimientos, config] = await Promise.all([
    repo.listProductos(),
    repo.listMovimientos(12),
    repo.getConfiguracion(),
  ])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader title="Inventario" description="Controla el stock y registra entradas y salidas de mercadería.">
        <MovimientoDialog tipo="entrada" productos={productos} />
        <MovimientoDialog tipo="salida" productos={productos} />
      </PageHeader>

      <InventarioTable productos={productos} simbolo={config.simbolo_moneda} />

      <Card>
        <CardHeader>
          <CardTitle>Movimientos recientes</CardTitle>
          <CardDescription>Últimas entradas y salidas de inventario</CardDescription>
        </CardHeader>
        <CardContent>
          {movimientos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay movimientos registrados.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {movimientos.map((m) => {
                const entrada = m.tipo === 'entrada'
                const Icon = entrada ? ArrowDownToLine : ArrowUpFromLine
                return (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg',
                        entrada ? 'bg-success/12 text-success-foreground' : 'bg-accent text-accent-foreground',
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{m.producto_nombre}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {`${m.sku} · ${m.motivo} · ${formatDateTime(m.created_at)}`}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        entrada ? 'text-success-foreground' : 'text-foreground',
                      )}
                    >
                      {`${entrada ? '+' : '-'}${formatNumber(m.cantidad)}`}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StockBadge } from '@/components/stock-badge'
import { estadoStock, formatMoney, formatNumber } from '@/lib/format'
import type { EstadoStock, Producto } from '@/lib/types'
import { cn } from '@/lib/utils'

export function InventarioTable({
  productos,
  simbolo,
  actions,
}: {
  productos: Producto[]
  simbolo: string
  actions?: (p: Producto) => React.ReactNode
}) {
  const [query, setQuery] = useState('')
  const [estado, setEstado] = useState<'TODOS' | EstadoStock>('TODOS')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return productos.filter((p) => {
      const matchesQuery =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
      return matchesQuery && (estado === 'TODOS' || estadoStock(p) === estado)
    })
  }, [productos, query, estado])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por SKU, producto o categoría"
            aria-label="Buscar productos"
            className="h-9 bg-card pl-8"
          />
        </div>
        <div className="sm:w-48">
          <NativeSelect
            value={estado}
            onChange={(e) => setEstado(e.target.value as typeof estado)}
            aria-label="Filtrar por estado"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="OK">OK</option>
            <option value="STOCK BAJO">Stock bajo</option>
            <option value="SIN STOCK">Sin stock</option>
          </NativeSelect>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead>SKU</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Presentación</TableHead>
              <TableHead className="text-right">Unidades</TableHead>
              <TableHead className="text-right">Precio de venta</TableHead>
              <TableHead className="text-right">Precio de costo</TableHead>
              <TableHead className="text-right">Stock mínimo</TableHead>
              <TableHead className="text-right">Stock actual</TableHead>
              <TableHead>Estado</TableHead>
              {actions && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={actions ? 10 : 9} className="h-24 text-center text-muted-foreground">
                  No se encontraron productos.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const est = estadoStock(p)
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{p.nombre}</span>
                        <span className="text-xs text-muted-foreground">{p.categoria}</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.presentacion}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(p.unidades)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(p.precio_venta, simbolo)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatMoney(p.precio_costo, simbolo)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(p.stock_minimo)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-semibold tabular-nums',
                        est === 'SIN STOCK' && 'text-destructive',
                        est === 'STOCK BAJO' && 'text-warning-foreground',
                      )}
                    >
                      {formatNumber(p.stock_actual)}
                    </TableCell>
                    <TableCell>
                      <StockBadge estado={est} />
                    </TableCell>
                    {actions && (
                      <TableCell>
                        <div className="flex justify-end gap-1">{actions(p)}</div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {`Mostrando ${filtered.length} de ${productos.length} productos`}
      </p>
    </div>
  )
}

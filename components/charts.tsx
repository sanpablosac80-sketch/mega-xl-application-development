'use client'

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatMoney } from '@/lib/format'

const ventasConfig = {
  total: { label: 'Ventas', color: 'var(--chart-1)' },
} satisfies ChartConfig

export function VentasAreaChart({
  data,
  simbolo,
}: {
  data: { fecha: string; total: number }[]
  simbolo: string
}) {
  return (
    <ChartContainer config={ventasConfig} className="aspect-auto h-64 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="fillVentas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="fecha" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `${simbolo} ${v}`} />
        <ChartTooltip
          content={
            <ChartTooltipContent formatter={(value) => formatMoney(Number(value), simbolo)} />
          }
        />
        <Area
          dataKey="total"
          type="monotone"
          stroke="var(--color-total)"
          strokeWidth={2}
          fill="url(#fillVentas)"
        />
      </AreaChart>
    </ChartContainer>
  )
}

const topConfig = {
  total: { label: 'Ingresos', color: 'var(--chart-2)' },
} satisfies ChartConfig

export function TopProductosChart({
  data,
  simbolo,
}: {
  data: { nombre: string; total: number }[]
  simbolo: string
}) {
  return (
    <ChartContainer config={topConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          dataKey="nombre"
          type="category"
          tickLine={false}
          axisLine={false}
          width={130}
          tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent formatter={(value) => formatMoney(Number(value), simbolo)} />
          }
        />
        <Bar dataKey="total" fill="var(--color-total)" radius={6} />
      </BarChart>
    </ChartContainer>
  )
}

import type { EstadoStock, Producto } from './types'

const numberFormat = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const intFormat = new Intl.NumberFormat('es-MX')

const dateTimeFormat = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const shortDateFormat = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
})

export function formatMoney(value: number, simbolo = '$') {
  return `${simbolo} ${numberFormat.format(value)}`
}

export function formatNumber(value: number) {
  return intFormat.format(value)
}

export function formatDateTime(iso: string) {
  return dateTimeFormat.format(new Date(iso))
}

export function formatShortDate(date: Date) {
  return shortDateFormat.format(date)
}

export function estadoStock(p: Pick<Producto, 'stock_actual' | 'stock_minimo'>): EstadoStock {
  if (p.stock_actual <= 0) return 'SIN STOCK'
  if (p.stock_actual <= p.stock_minimo) return 'STOCK BAJO'
  return 'OK'
}

export function dayKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

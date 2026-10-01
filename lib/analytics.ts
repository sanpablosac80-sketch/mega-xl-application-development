import { dayKey, estadoStock, formatShortDate } from './format'
import type { Producto, Venta } from './types'

export function resumenInventario(productos: Producto[]) {
  let sinStock = 0
  let stockBajo = 0
  let valorCosto = 0
  let valorVenta = 0
  for (const p of productos) {
    const e = estadoStock(p)
    if (e === 'SIN STOCK') sinStock++
    else if (e === 'STOCK BAJO') stockBajo++
    valorCosto += p.stock_actual * p.precio_costo
    valorVenta += p.stock_actual * p.precio_venta
  }
  return { total: productos.length, sinStock, stockBajo, valorCosto, valorVenta }
}

export function resumenVentas(ventas: Venta[], now = new Date()) {
  const hoy = dayKey(now)
  const mes = hoy.slice(0, 7)
  let dia = 0
  let diaCount = 0
  let mesTotal = 0
  let mesCount = 0
  for (const v of ventas) {
    const key = dayKey(new Date(v.created_at))
    if (key === hoy) {
      dia += v.total
      diaCount++
    }
    if (key.startsWith(mes)) {
      mesTotal += v.total
      mesCount++
    }
  }
  return { dia, diaCount, mes: mesTotal, mesCount }
}

export function ventasPorDia(ventas: Venta[], days: number, now = new Date()) {
  const buckets = new Map<string, number>()
  const result: { key: string; fecha: string; total: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = dayKey(d)
    buckets.set(key, 0)
    result.push({ key, fecha: formatShortDate(d), total: 0 })
  }
  for (const v of ventas) {
    const key = dayKey(new Date(v.created_at))
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + v.total)
  }
  return result.map((r) => ({ ...r, total: Math.round((buckets.get(r.key) ?? 0) * 100) / 100 }))
}

export function topProductos(ventas: Venta[], limit = 5) {
  const map = new Map<string, { nombre: string; cantidad: number; total: number }>()
  for (const v of ventas) {
    for (const i of v.items) {
      const key = i.producto_id ?? i.producto_nombre
      const cur = map.get(key) ?? { nombre: i.producto_nombre, cantidad: 0, total: 0 }
      cur.cantidad += i.cantidad
      cur.total += i.subtotal
      map.set(key, cur)
    }
  }
  return [...map.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((p) => ({ ...p, total: Math.round(p.total * 100) / 100 }))
}

export function ventasPorMetodo(ventas: Venta[]) {
  const map = new Map<string, { metodo: string; total: number; count: number }>()
  for (const v of ventas) {
    const cur = map.get(v.metodo_pago) ?? { metodo: v.metodo_pago, total: 0, count: 0 }
    cur.total += v.total
    cur.count++
    map.set(v.metodo_pago, cur)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Configuracion, Movimiento, Producto, Repository, Venta } from '@/lib/types'

let client: SupabaseClient | null = null

function getSupabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseKey())
}

export function getSupabase() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = getSupabaseKey()
    if (!url || !key) throw new Error('Faltan las variables de entorno de Supabase')
    client = createClient(url, key, { auth: { persistSession: false } })
  }
  return client
}

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

const num = (v: unknown) => Number(v ?? 0)

function toProducto(row: Record<string, unknown>): Producto {
  return {
    ...(row as unknown as Producto),
    precio_venta: num(row.precio_venta),
    precio_costo: num(row.precio_costo),
  }
}

export const supabaseRepository: Repository = {
  async listProductos() {
    const data = check(await getSupabase().from('productos').select('*').order('sku'))
    return (data ?? []).map(toProducto)
  },
  async createProducto(input) {
    const res = await getSupabase()
      .from('productos')
      .insert({ ...input, stock_actual: input.stock_actual ?? 0 })
    if (res.error?.code === '23505') throw new Error(`Ya existe un producto con el SKU ${input.sku}`)
    check(res)
  },
  async updateProducto(id, input) {
    const { stock_actual: _ignored, ...rest } = input
    const res = await getSupabase().from('productos').update(rest).eq('id', id)
    if (res.error?.code === '23505') throw new Error(`Ya existe un producto con el SKU ${input.sku}`)
    check(res)
  },
  async deleteProducto(id) {
    check(await getSupabase().from('productos').delete().eq('id', id))
  },
  async listMovimientos(limit = 50) {
    const data = check(
      await getSupabase()
        .from('movimientos')
        .select('*, productos(nombre, sku)')
        .order('created_at', { ascending: false })
        .limit(limit),
    )
    return (data ?? []).map((row: Record<string, unknown>) => {
      const prod = row.productos as { nombre: string; sku: string } | null
      return {
        ...(row as unknown as Movimiento),
        producto_nombre: prod?.nombre ?? 'Producto eliminado',
        sku: prod?.sku ?? '-',
      }
    })
  },
  async registrarMovimiento(input) {
    check(
      await getSupabase().rpc('registrar_movimiento', {
        p_producto_id: input.producto_id,
        p_tipo: input.tipo,
        p_cantidad: input.cantidad,
        p_motivo: input.motivo,
      }),
    )
  },
  async listClientes() {
    return check(await getSupabase().from('clientes').select('*').order('nombre')) ?? []
  },
  async createCliente(input) {
    check(await getSupabase().from('clientes').insert(input))
  },
  async deleteCliente(id) {
    check(await getSupabase().from('clientes').delete().eq('id', id))
  },
  async listVentas() {
    const data = check(
      await getSupabase()
        .from('ventas')
        .select('*, clientes(nombre), venta_items(*)')
        .order('created_at', { ascending: false }),
    )
    return (data ?? []).map((row: Record<string, unknown>): Venta => {
      const items = (row.venta_items as Record<string, unknown>[]) ?? []
      return {
        id: row.id as string,
        numero: num(row.numero),
        cliente_id: (row.cliente_id as string) ?? null,
        cliente_nombre: (row.clientes as { nombre: string } | null)?.nombre ?? null,
        metodo_pago: row.metodo_pago as string,
        total: num(row.total),
        created_at: row.created_at as string,
        items: items.map((i) => ({
          producto_id: (i.producto_id as string) ?? null,
          producto_nombre: i.producto_nombre as string,
          cantidad: num(i.cantidad),
          precio_unitario: num(i.precio_unitario),
          subtotal: num(i.subtotal),
        })),
      }
    })
  },
  async registrarVenta(input) {
    check(
      await getSupabase().rpc('registrar_venta', {
        p_cliente_id: input.cliente_id,
        p_metodo_pago: input.metodo_pago,
        p_items: input.items,
      }),
    )
  },
  async getConfiguracion() {
    const data = check(
      await getSupabase().from('configuracion').select('*').eq('id', 1).maybeSingle(),
    )
    return (data as Configuracion) ?? {
      nombre_empresa: 'MEGA XL',
      ruc: '',
      direccion: '',
      telefono: '',
      email: '',
      simbolo_moneda: 'S/',
    }
  },
  async updateConfiguracion(input) {
    check(await getSupabase().from('configuracion').upsert({ id: 1, ...input }))
  },
}

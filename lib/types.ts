export type EstadoStock = 'OK' | 'STOCK BAJO' | 'SIN STOCK'

export interface Producto {
  id: string
  sku: string
  nombre: string
  presentacion: string
  categoria: string
  unidades: number
  precio_venta: number
  precio_costo: number
  stock_minimo: number
  stock_actual: number
  created_at: string
}

export interface ProductoInput {
  sku: string
  nombre: string
  presentacion: string
  categoria: string
  unidades: number
  precio_venta: number
  precio_costo: number
  stock_minimo: number
  stock_actual?: number
}

export type TipoMovimiento = 'entrada' | 'salida'

export interface Movimiento {
  id: string
  producto_id: string
  producto_nombre: string
  sku: string
  tipo: TipoMovimiento
  cantidad: number
  motivo: string
  created_at: string
}

export interface MovimientoInput {
  producto_id: string
  tipo: TipoMovimiento
  cantidad: number
  motivo: string
}

export interface Cliente {
  id: string
  nombre: string
  documento: string
  telefono: string
  email: string
  direccion: string
  created_at: string
}

export type ClienteInput = Omit<Cliente, 'id' | 'created_at'>

export interface VentaItem {
  producto_id: string | null
  producto_nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface Venta {
  id: string
  numero: number
  cliente_id: string | null
  cliente_nombre: string | null
  metodo_pago: string
  total: number
  items: VentaItem[]
  created_at: string
}

export interface VentaInput {
  cliente_id: string | null
  metodo_pago: string
  items: { producto_id: string; cantidad: number }[]
}

export interface Configuracion {
  nombre_empresa: string
  ruc: string
  direccion: string
  telefono: string
  email: string
  simbolo_moneda: string
}

export type DataMode = 'supabase' | 'demo'

export interface Repository {
  listProductos(): Promise<Producto[]>
  createProducto(input: ProductoInput, accessKey?: string): Promise<void>
  updateProducto(id: string, input: ProductoInput, accessKey?: string): Promise<void>
  deleteProducto(id: string): Promise<void>
  listMovimientos(limit?: number): Promise<Movimiento[]>
  registrarMovimiento(input: MovimientoInput, accessKey?: string): Promise<void>
  listClientes(): Promise<Cliente[]>
  createCliente(input: ClienteInput): Promise<void>
  deleteCliente(id: string): Promise<void>
  listVentas(): Promise<Venta[]>
  registrarVenta(input: VentaInput): Promise<void>
  getConfiguracion(): Promise<Configuracion>
  updateConfiguracion(input: Configuracion): Promise<void>
}

export const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia'] as const

export const MOTIVOS_ENTRADA = [
  'Compra a proveedor',
  'Devolución de cliente',
  'Ajuste de inventario',
] as const

export const MOTIVOS_SALIDA = [
  'Merma / producto dañado',
  'Consumo interno',
  'Devolución a proveedor',
  'Ajuste de inventario',
] as const

export const MAX_CANTIDAD = 10000

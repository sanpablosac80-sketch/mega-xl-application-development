import 'server-only'
import type {
  Cliente,
  Configuracion,
  Movimiento,
  Producto,
  Repository,
  Venta,
} from '@/lib/types'

interface Store {
  productos: Producto[]
  clientes: Cliente[]
  movimientos: Movimiento[]
  ventas: Venta[]
  configuracion: Configuracion
  nextNumero: number
}

const daysAgo = (days: number, hour = 10) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, (days * 17) % 60, 0, 0)
  return d.toISOString()
}

function seed(): Store {
  const base: Omit<Producto, 'id' | 'created_at'>[] = [
    { sku: 'MX-001', nombre: 'Arroz Extra 5 kg', presentacion: 'Saco', categoria: 'Abarrotes', unidades: 1, precio_venta: 18.5, precio_costo: 14.2, stock_minimo: 20, stock_actual: 85 },
    { sku: 'MX-002', nombre: 'Aceite Vegetal 1 L', presentacion: 'Caja x12', categoria: 'Abarrotes', unidades: 12, precio_venta: 96, precio_costo: 78, stock_minimo: 10, stock_actual: 6 },
    { sku: 'MX-003', nombre: 'Azúcar Rubia 1 kg', presentacion: 'Bolsa', categoria: 'Abarrotes', unidades: 1, precio_venta: 4.2, precio_costo: 3.1, stock_minimo: 50, stock_actual: 0 },
    { sku: 'MX-004', nombre: 'Leche Evaporada 400 g', presentacion: 'Paquete x6', categoria: 'Lácteos', unidades: 6, precio_venta: 22.8, precio_costo: 18, stock_minimo: 15, stock_actual: 40 },
    { sku: 'MX-005', nombre: 'Agua Mineral 625 ml', presentacion: 'Pack x15', categoria: 'Bebidas', unidades: 15, precio_venta: 15, precio_costo: 10.5, stock_minimo: 20, stock_actual: 12 },
    { sku: 'MX-006', nombre: 'Detergente en Polvo 2 kg', presentacion: 'Bolsa', categoria: 'Limpieza', unidades: 1, precio_venta: 24.9, precio_costo: 18.4, stock_minimo: 12, stock_actual: 30 },
    { sku: 'MX-007', nombre: 'Fideos Spaghetti 500 g', presentacion: 'Fardo x20', categoria: 'Abarrotes', unidades: 20, precio_venta: 52, precio_costo: 41, stock_minimo: 8, stock_actual: 22 },
    { sku: 'MX-008', nombre: 'Gaseosa Cola 3 L', presentacion: 'Pack x6', categoria: 'Bebidas', unidades: 6, precio_venta: 48, precio_costo: 36, stock_minimo: 10, stock_actual: 0 },
    { sku: 'MX-009', nombre: 'Papel Higiénico Doble Hoja', presentacion: 'Paquete x24', categoria: 'Limpieza', unidades: 24, precio_venta: 38.5, precio_costo: 29, stock_minimo: 10, stock_actual: 18 },
    { sku: 'MX-010', nombre: 'Atún en Aceite 170 g', presentacion: 'Caja x48', categoria: 'Conservas', unidades: 48, precio_venta: 210, precio_costo: 168, stock_minimo: 4, stock_actual: 9 },
    { sku: 'MX-011', nombre: 'Café Instantáneo 200 g', presentacion: 'Frasco', categoria: 'Abarrotes', unidades: 1, precio_venta: 19.9, precio_costo: 14.5, stock_minimo: 15, stock_actual: 11 },
    { sku: 'MX-012', nombre: 'Galletas de Soda', presentacion: 'Caja x30', categoria: 'Snacks', unidades: 30, precio_venta: 27, precio_costo: 20, stock_minimo: 10, stock_actual: 45 },
  ]
  const productos: Producto[] = base.map((p, i) => ({
    ...p,
    id: crypto.randomUUID(),
    created_at: daysAgo(40 - i),
  }))

  const clientes: Cliente[] = [
    { nombre: 'Bodega San Martín', documento: '20481234561', telefono: '987 654 321', email: 'compras@bodegasanmartin.com', direccion: 'Av. Los Olivos 245' },
    { nombre: 'Minimarket La Esquina', documento: '20512345672', telefono: '956 112 334', email: 'laesquina@correo.com', direccion: 'Jr. Las Flores 118' },
    { nombre: 'María Fernández', documento: '45678912', telefono: '912 345 678', email: 'maria.fernandez@correo.com', direccion: 'Calle Real 560' },
    { nombre: 'Comercial Andina SAC', documento: '20601234983', telefono: '944 221 009', email: 'ventas@comercialandina.pe', direccion: 'Av. Industrial 1020' },
    { nombre: 'Jorge Ramírez', documento: '41236587', telefono: '933 778 120', email: 'jramirez@correo.com', direccion: 'Pasaje Sol 33' },
  ].map((c, i) => ({ ...c, id: crypto.randomUUID(), created_at: daysAgo(35 - i) }))

  const metodos = ['Efectivo', 'Tarjeta', 'Transferencia']
  const ventas: Venta[] = []
  let numero = 1
  for (let day = 24; day >= 0; day--) {
    const count = 1 + ((day * 7) % 3)
    for (let n = 0; n < count; n++) {
      const seedIdx = day * 3 + n
      const lines = 1 + (seedIdx % 3)
      const items = Array.from({ length: lines }, (_, l) => {
        const p = productos[(seedIdx * 5 + l * 3) % productos.length]
        const cantidad = 1 + ((seedIdx + l) % 4)
        return {
          producto_id: p.id,
          producto_nombre: p.nombre,
          cantidad,
          precio_unitario: p.precio_venta,
          subtotal: Math.round(cantidad * p.precio_venta * 100) / 100,
        }
      })
      const cliente = seedIdx % 4 === 0 ? null : clientes[seedIdx % clientes.length]
      ventas.push({
        id: crypto.randomUUID(),
        numero: numero++,
        cliente_id: cliente?.id ?? null,
        cliente_nombre: cliente?.nombre ?? null,
        metodo_pago: metodos[seedIdx % metodos.length],
        total: Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100,
        items,
        created_at: daysAgo(day, 9 + n * 3),
      })
    }
  }

  const movimientos: Movimiento[] = productos.slice(0, 6).map((p, i) => ({
    id: crypto.randomUUID(),
    producto_id: p.id,
    producto_nombre: p.nombre,
    sku: p.sku,
    tipo: i === 2 ? 'salida' : 'entrada',
    cantidad: i === 2 ? 5 : 20 + i * 5,
    motivo: i === 2 ? 'Merma / producto dañado' : 'Compra a proveedor',
    created_at: daysAgo(i + 1, 8),
  }))

  return {
    productos,
    clientes,
    movimientos,
    ventas: ventas.reverse(),
    nextNumero: numero,
    configuracion: {
      nombre_empresa: 'MEGA XL',
      ruc: '20612345678',
      direccion: 'Av. Principal 1500, Lima',
      telefono: '01 456 7890',
      email: 'contacto@megaxl.com',
      simbolo_moneda: 'S/',
    },
  }
}

const globalStore = globalThis as unknown as { __megaxlStore?: Store }

function store(): Store {
  if (!globalStore.__megaxlStore) globalStore.__megaxlStore = seed()
  return globalStore.__megaxlStore
}

const round2 = (n: number) => Math.round(n * 100) / 100

export const memoryRepository: Repository = {
  async listProductos() {
    return [...store().productos].sort((a, b) => a.sku.localeCompare(b.sku))
  },
  async createProducto(input) {
    const s = store()
    if (s.productos.some((p) => p.sku.toLowerCase() === input.sku.toLowerCase())) {
      throw new Error(`Ya existe un producto con el SKU ${input.sku}`)
    }
    s.productos.push({
      ...input,
      stock_actual: input.stock_actual ?? 0,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    })
  },
  async updateProducto(id, input) {
    const s = store()
    const p = s.productos.find((x) => x.id === id)
    if (!p) throw new Error('Producto no encontrado')
    if (s.productos.some((x) => x.id !== id && x.sku.toLowerCase() === input.sku.toLowerCase())) {
      throw new Error(`Ya existe un producto con el SKU ${input.sku}`)
    }
    const { stock_actual: _ignored, ...rest } = input
    Object.assign(p, rest)
  },
  async deleteProducto(id) {
    const s = store()
    s.productos = s.productos.filter((p) => p.id !== id)
    s.movimientos = s.movimientos.filter((m) => m.producto_id !== id)
  },
  async listMovimientos(limit = 50) {
    return [...store().movimientos]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit)
  },
  async registrarMovimiento(input) {
    const s = store()
    const p = s.productos.find((x) => x.id === input.producto_id)
    if (!p) throw new Error('Producto no encontrado')
    if (input.tipo === 'salida' && p.stock_actual < input.cantidad) {
      throw new Error(`Stock insuficiente. Disponible: ${p.stock_actual}`)
    }
    p.stock_actual += input.tipo === 'entrada' ? input.cantidad : -input.cantidad
    s.movimientos.push({
      id: crypto.randomUUID(),
      producto_id: p.id,
      producto_nombre: p.nombre,
      sku: p.sku,
      tipo: input.tipo,
      cantidad: input.cantidad,
      motivo: input.motivo,
      created_at: new Date().toISOString(),
    })
  },
  async listClientes() {
    return [...store().clientes].sort((a, b) => a.nombre.localeCompare(b.nombre))
  },
  async createCliente(input) {
    store().clientes.push({ ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() })
  },
  async deleteCliente(id) {
    const s = store()
    s.clientes = s.clientes.filter((c) => c.id !== id)
    s.ventas.forEach((v) => {
      if (v.cliente_id === id) v.cliente_id = null
    })
  },
  async listVentas() {
    return [...store().ventas].sort((a, b) => b.created_at.localeCompare(a.created_at))
  },
  async registrarVenta(input) {
    const s = store()
    const totals = new Map<string, number>()
    for (const item of input.items) {
      totals.set(item.producto_id, (totals.get(item.producto_id) ?? 0) + item.cantidad)
    }
    const lines = [...totals].map(([id, cantidad]) => {
      const p = s.productos.find((x) => x.id === id)
      if (!p) throw new Error('Uno de los productos ya no existe')
      if (p.stock_actual < cantidad) {
        throw new Error(`Stock insuficiente para ${p.nombre}. Disponible: ${p.stock_actual}`)
      }
      return { p, cantidad }
    })
    const cliente = input.cliente_id ? s.clientes.find((c) => c.id === input.cliente_id) : null
    const now = new Date().toISOString()
    const numero = s.nextNumero++
    const items = lines.map(({ p, cantidad }) => {
      p.stock_actual -= cantidad
      s.movimientos.push({
        id: crypto.randomUUID(),
        producto_id: p.id,
        producto_nombre: p.nombre,
        sku: p.sku,
        tipo: 'salida',
        cantidad,
        motivo: `Venta #${numero}`,
        created_at: now,
      })
      return {
        producto_id: p.id,
        producto_nombre: p.nombre,
        cantidad,
        precio_unitario: p.precio_venta,
        subtotal: round2(cantidad * p.precio_venta),
      }
    })
    s.ventas.push({
      id: crypto.randomUUID(),
      numero,
      cliente_id: cliente?.id ?? null,
      cliente_nombre: cliente?.nombre ?? null,
      metodo_pago: input.metodo_pago,
      total: round2(items.reduce((sum, i) => sum + i.subtotal, 0)),
      items,
      created_at: now,
    })
  },
  async getConfiguracion() {
    return { ...store().configuracion }
  },
  async updateConfiguracion(input) {
    store().configuracion = { ...input }
  },
}

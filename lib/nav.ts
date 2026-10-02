import { BarChart3, FileText, Truck, Boxes, LayoutDashboard, Package, Settings, ShoppingCart, Users, Wrench, Calculator } from 'lucide-react'

export const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard, roles: ['A','B','C','D'] },
  { href: '/productos', label: 'Productos', icon: Package, roles: ['A','B','C'] },
  { href: '/inventario', label: 'Inventario', icon: Boxes, roles: ['A','B','C'] },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart, roles: ['A','B','C'] },
  { href: '/facturacion', label: 'Facturación', icon: FileText, roles: ['A','B','C','D'] },
  { href: '/guias-remision', label: 'Guías de remisión', icon: Truck, roles: ['A','B','C'] },
  { href: '/clientes', label: 'Clientes', icon: Users, roles: ['A','B','C'] },
  { href: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['A','B','D'] },
  { href: '/contabilidad', label: 'Contabilidad', icon: Calculator, roles: ['A','B','D'] },
  { href: '/taller', label: 'Taller', icon: Wrench, roles: ['A','B'] },
  { href: '/configuracion', label: 'Configuración', icon: Settings, roles: ['A','B'] },
] as const

export function isActivePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

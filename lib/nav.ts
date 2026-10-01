import {
  BarChart3,
  FileText,
  Truck,
  Boxes,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react'

export const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/productos', label: 'Productos', icon: Package },
  { href: '/inventario', label: 'Inventario', icon: Boxes },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/facturacion', label: 'Facturación', icon: FileText },
  { href: '/guias-remision', label: 'Guías de remisión', icon: Truck },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
] as const

export function isActivePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { logout } from '@/app/login/actions'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarRail, useSidebar,
} from '@/components/ui/sidebar'
import { NAV_ITEMS, isActivePath } from '@/lib/nav'
import { MegaMascot } from '@/components/mega-mascot'

export function AppSidebar({ role }: { role?: string | null }) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const items = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role as never)))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2.5 rounded-lg px-1.5 py-2" onClick={() => setOpenMobile(false)}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white"><MegaMascot className="size-9" /></span>
          <span className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold tracking-tight text-foreground">MEGA XL</span>
            <span className="text-xs text-muted-foreground">{role ? `Rol: ${role}` : 'Inventario y ventas'}</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActivePath(pathname, item.href)
                return <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton isActive={active} tooltip={item.label} className="h-10 data-active:bg-primary data-active:text-primary-foreground" render={<Link href={item.href} aria-current={active ? 'page' : undefined} onClick={() => setOpenMobile(false)} />}>
                    <item.icon /><span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <form action={logout}>
          <SidebarMenuButton tooltip="Cerrar sesión" className="h-10" type="submit">
            <LogOut /><span>Cerrar sesión</span>
          </SidebarMenuButton>
        </form>
        <p className="px-2 pb-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">© MEGA XL · v1.0</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

'use client'

import { usePathname } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { NAV_ITEMS, isActivePath } from '@/lib/nav'

export function AppHeader() {
  const pathname = usePathname()
  const current = NAV_ITEMS.find((i) => isActivePath(pathname, i.href))
  const today = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <span className="text-sm font-medium text-foreground">{current?.label ?? 'MEGA XL'}</span>
      <span className="ml-auto hidden text-sm capitalize text-muted-foreground sm:inline" suppressHydrationWarning>
        {today}
      </span>
    </header>
  )
}

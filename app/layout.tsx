import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { DemoBanner } from '@/components/demo-banner'
import { MegaAssistant } from '@/components/mega-assistant'
import { PwaRegister } from '@/components/pwa-register'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { getDataMode } from '@/lib/data'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: { default: 'MEGA XL | Inventario y Ventas', template: '%s | MEGA XL' },
  description: 'MEGA XL: sistema de gestión de inventario y ventas. Controla productos, stock, clientes y reportes.',
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
  applicationName: 'MEGA XL CRM',
  appleWebApp: { capable: true, title: 'MEGA XL', statusBarStyle: 'default' },
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }], apple: '/icon.svg' },
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#2f7fd1' }

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const mode = await getDataMode()
  return (
    <html lang="es" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <PwaRegister />
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <AppHeader />
            {mode === 'demo' && <DemoBanner />}
            <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
          </SidebarInset>
        </SidebarProvider>
        <MegaAssistant />
        <Toaster richColors position="top-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

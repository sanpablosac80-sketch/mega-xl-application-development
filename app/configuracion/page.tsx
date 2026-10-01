import type { Metadata } from 'next'
import { Database } from 'lucide-react'
import { ConfigForm } from '@/components/forms/config-form'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDataMode, getRepository } from '@/lib/data'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Configuración' }

export default async function ConfiguracionPage() {
  const [repo, mode] = await Promise.all([getRepository(), getDataMode()])
  const config = await repo.getConfiguracion()
  const connected = mode === 'supabase'

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title="Configuración" description="Datos de la empresa y preferencias del sistema." />

      <Card>
        <CardHeader>
          <CardTitle>Datos de la empresa</CardTitle>
          <CardDescription>Esta información se usa en reportes y comprobantes.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigForm config={config} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Base de datos</CardTitle>
          <CardDescription>Estado de la conexión con Supabase</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Database className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className={cn('size-2 rounded-full', connected ? 'bg-success' : 'bg-warning')} aria-hidden="true" />
                {connected ? 'Conectado a Supabase' : 'Modo demostración'}
              </span>
              <span className="text-xs text-muted-foreground">
                {connected
                  ? 'Los datos se guardan de forma permanente.'
                  : 'Los datos de ejemplo se reinician al reiniciar el servidor.'}
              </span>
            </div>
          </div>
          {!connected && (
            <ol className="flex list-decimal flex-col gap-1.5 rounded-lg bg-muted/60 p-4 pl-8 text-sm text-muted-foreground">
              <li>Conecta la integración de Supabase desde la configuración del proyecto.</li>
              <li>
                Ejecuta el script <code className="rounded bg-card px-1 py-0.5 font-mono text-xs text-foreground">scripts/001_create_schema.sql</code> en tu base de datos.
              </li>
              <li>La aplicación detectará las tablas y cambiará automáticamente a modo conectado.</li>
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

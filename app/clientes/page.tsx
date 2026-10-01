import type { Metadata } from 'next'
import { ClienteDialog } from '@/components/forms/cliente-dialog'
import { ClientesTable } from '@/components/clientes-table'
import { PageHeader } from '@/components/page-header'
import { getRepository } from '@/lib/data'

export const metadata: Metadata = { title: 'Clientes' }

export default async function ClientesPage() {
  const repo = await getRepository()
  const [clientes, ventas, config] = await Promise.all([
    repo.listClientes(),
    repo.listVentas(),
    repo.getConfiguracion(),
  ])

  const stats = new Map<string, { count: number; total: number }>()
  for (const v of ventas) {
    if (!v.cliente_id) continue
    const cur = stats.get(v.cliente_id) ?? { count: 0, total: 0 }
    cur.count++
    cur.total += v.total
    stats.set(v.cliente_id, cur)
  }
  const rows = clientes.map((c) => ({ ...c, compras: stats.get(c.id)?.count ?? 0, totalCompras: stats.get(c.id)?.total ?? 0 }))

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Clientes" description="Gestiona tu cartera de clientes y su historial de compras.">
        <ClienteDialog />
      </PageHeader>
      <ClientesTable clientes={rows} simbolo={config.simbolo_moneda} />
    </div>
  )
}

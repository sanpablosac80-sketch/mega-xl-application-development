import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { ProductosTable } from '@/components/productos-table'
import { ProductoDialog } from '@/components/forms/producto-dialog'
import { getRepository } from '@/lib/data'

export const metadata: Metadata = { title: 'Productos' }

export default async function ProductosPage() {
  const repo = await getRepository()
  const [productos, config] = await Promise.all([repo.listProductos(), repo.getConfiguracion()])

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Productos" description="Administra el catálogo de productos, precios y presentaciones.">
        <ProductoDialog />
      </PageHeader>
      <ProductosTable productos={productos} simbolo={config.simbolo_moneda} />
    </div>
  )
}

'use client'

import { eliminarProducto } from '@/app/actions'
import { DeleteButton } from '@/components/delete-button'
import { ProductoDialog } from '@/components/forms/producto-dialog'
import { InventarioTable } from '@/components/inventario-table'
import type { Producto } from '@/lib/types'

export function ProductosTable({ productos, simbolo }: { productos: Producto[]; simbolo: string }) {
  return (
    <InventarioTable
      productos={productos}
      simbolo={simbolo}
      actions={(p) => (
        <>
          <ProductoDialog producto={p} />
          <DeleteButton
            label={p.nombre}
            description="Se eliminará el producto y su historial de movimientos. Las ventas registradas se conservan."
            onConfirm={() => eliminarProducto(p.id)}
          />
        </>
      )}
    />
  )
}

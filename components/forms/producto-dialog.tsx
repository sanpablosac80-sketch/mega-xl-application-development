'use client'

import { useActionState, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { actualizarProducto, crearProducto } from '@/app/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Producto } from '@/lib/types'
import { FormField, fieldProps, initialActionState, useActionFeedback } from './form-field'

export function ProductoDialog({ producto }: { producto?: Producto }) {
  const [open, setOpen] = useState(false)
  const isEdit = Boolean(producto)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEdit ? (
        <DialogTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Editar ${producto?.nombre}`} />}
        >
          <Pencil />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <Plus data-icon="inline-start" />
          Agregar producto
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza los datos del producto. El stock se modifica con entradas y salidas.'
              : 'Completa la información para registrar un producto en el catálogo.'}
          </DialogDescription>
        </DialogHeader>
        {open && <ProductoForm producto={producto} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ProductoForm({ producto, onDone }: { producto?: Producto; onDone: () => void }) {
  const [state, action, pending] = useActionState(
    producto ? actualizarProducto : crearProducto,
    initialActionState,
  )
  useActionFeedback(state, onDone)
  const err = state.errors ?? {}

  return (
    <form action={action} className="flex flex-col gap-4">
      {producto && <input type="hidden" name="id" value={producto.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="sku" label="SKU" error={err.sku}>
          <Input {...fieldProps('sku', state)} defaultValue={producto?.sku} placeholder="MX-013" required />
        </FormField>
        <FormField id="categoria" label="Categoría" error={err.categoria}>
          <Input {...fieldProps('categoria', state)} defaultValue={producto?.categoria} placeholder="Abarrotes" />
        </FormField>
        <FormField id="nombre" label="Producto" error={err.nombre} className="sm:col-span-2">
          <Input {...fieldProps('nombre', state)} defaultValue={producto?.nombre} placeholder="Nombre del producto" required />
        </FormField>
        <FormField id="presentacion" label="Presentación" error={err.presentacion}>
          <Input {...fieldProps('presentacion', state)} defaultValue={producto?.presentacion} placeholder="Caja x12" required />
        </FormField>
        <FormField id="unidades" label="Unidades por presentación" error={err.unidades}>
          <Input {...fieldProps('unidades', state)} type="number" min={1} step={1} defaultValue={producto?.unidades ?? 1} required />
        </FormField>
        <FormField id="precio_venta" label="Precio de venta" error={err.precio_venta}>
          <Input {...fieldProps('precio_venta', state)} type="number" min={0} step="0.01" defaultValue={producto?.precio_venta} placeholder="0.00" required />
        </FormField>
        <FormField id="precio_costo" label="Precio de costo" error={err.precio_costo}>
          <Input {...fieldProps('precio_costo', state)} type="number" min={0} step="0.01" defaultValue={producto?.precio_costo} placeholder="0.00" required />
        </FormField>
        <FormField id="stock_minimo" label="Stock mínimo" error={err.stock_minimo}>
          <Input {...fieldProps('stock_minimo', state)} type="number" min={0} step={1} defaultValue={producto?.stock_minimo ?? 0} required />
        </FormField>
        {producto ? (
          <FormField id="stock_info" label="Stock actual" hint="Usa entradas o salidas de inventario para modificarlo.">
            <Input id="stock_info" value={producto.stock_actual} disabled readOnly />
          </FormField>
        ) : (
          <FormField id="stock_actual" label="Stock inicial" error={err.stock_actual}>
            <Input {...fieldProps('stock_actual', state)} type="number" min={0} step={1} defaultValue={0} required />
          </FormField>
        )}
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : producto ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </DialogFooter>
    </form>
  )
}

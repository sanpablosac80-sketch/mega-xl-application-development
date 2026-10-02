'use client'

import { useActionState, useState } from 'react'
import { Pencil, UserPlus } from 'lucide-react'
import { actualizarCliente, crearCliente } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Cliente } from '@/lib/types'
import { FormField, initialActionState, useActionFeedback } from './form-field'

export function ClienteDialog({ cliente }: { cliente?: Cliente }) {
  const [open, setOpen] = useState(false)
  const editing = Boolean(cliente)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={editing ? 'outline' : 'default'} size={editing ? 'sm' : 'default'} />}>
        {editing ? <Pencil data-icon="inline-start" /> : <UserPlus data-icon="inline-start" />}
        {editing ? 'Editar' : 'Nuevo cliente'}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>{editing ? 'Corrige los datos del cliente. Los comprobantes SUNAT ya emitidos no se modifican.' : 'Registra los datos del cliente para asociarlo a sus ventas.'}</DialogDescription>
        </DialogHeader>
        {open && <ClienteForm cliente={cliente} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ClienteForm({ cliente, onDone }: { cliente?: Cliente; onDone: () => void }) {
  const [state, action, pending] = useActionState(cliente ? actualizarCliente : crearCliente, initialActionState)
  useActionFeedback(state, onDone)
  const err = state.errors ?? {}
  return (
    <form action={action} className="flex flex-col gap-4">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="nombre" label="Nombre o razón social" error={err.nombre} className="sm:col-span-2">
          <Input name="nombre" id="nombre" defaultValue={cliente?.nombre ?? ''} placeholder="Bodega San Martín" required />
        </FormField>
        <FormField id="documento" label="DNI / RUC" error={err.documento}>
          <Input name="documento" id="documento" defaultValue={cliente?.documento ?? ''} inputMode="numeric" placeholder="20481234561" />
        </FormField>
        <FormField id="telefono" label="Teléfono">
          <Input name="telefono" id="telefono" defaultValue={cliente?.telefono ?? ''} type="tel" placeholder="987 654 321" />
        </FormField>
        <FormField id="email" label="Correo electrónico" error={err.email} className="sm:col-span-2">
          <Input name="email" id="email" defaultValue={cliente?.email ?? ''} type="email" placeholder="cliente@correo.com" />
        </FormField>
        <FormField id="direccion" label="Dirección" className="sm:col-span-2">
          <Input name="direccion" id="direccion" defaultValue={cliente?.direccion ?? ''} placeholder="Av. Principal 123" />
        </FormField>
      </div>
      {!state.ok && state.message && <p className="text-sm text-destructive">{state.message}</p>}
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" disabled={pending}>{pending ? 'Guardando...' : editingLabel(cliente)}</Button>
      </DialogFooter>
    </form>
  )
}
function editingLabel(cliente?: Cliente){ return cliente ? 'Guardar cambios' : 'Guardar cliente' }

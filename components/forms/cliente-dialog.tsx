'use client'

import { useActionState, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { crearCliente } from '@/app/actions'
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
import { FormField, fieldProps, initialActionState, useActionFeedback } from './form-field'

export function ClienteDialog() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlus data-icon="inline-start" />
        Nuevo cliente
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>Registra los datos del cliente para asociarlo a sus ventas.</DialogDescription>
        </DialogHeader>
        {open && <ClienteForm onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ClienteForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(crearCliente, initialActionState)
  useActionFeedback(state, onDone)
  const err = state.errors ?? {}

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="nombre" label="Nombre o razón social" error={err.nombre} className="sm:col-span-2">
          <Input {...fieldProps('nombre', state)} placeholder="Bodega San Martín" required />
        </FormField>
        <FormField id="documento" label="DNI / RUC">
          <Input {...fieldProps('documento', state)} inputMode="numeric" placeholder="20481234561" />
        </FormField>
        <FormField id="telefono" label="Teléfono">
          <Input {...fieldProps('telefono', state)} type="tel" placeholder="987 654 321" />
        </FormField>
        <FormField id="email" label="Correo electrónico" error={err.email} className="sm:col-span-2">
          <Input {...fieldProps('email', state)} type="email" placeholder="cliente@correo.com" />
        </FormField>
        <FormField id="direccion" label="Dirección" className="sm:col-span-2">
          <Input {...fieldProps('direccion', state)} placeholder="Av. Principal 123" />
        </FormField>
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar cliente'}
        </Button>
      </DialogFooter>
    </form>
  )
}

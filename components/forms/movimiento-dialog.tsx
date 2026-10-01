'use client'

import { useActionState, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { registrarMovimiento } from '@/app/actions'
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
import { NativeSelect } from '@/components/ui/native-select'
import { MOTIVOS_ENTRADA, MOTIVOS_SALIDA, type Producto, type TipoMovimiento } from '@/lib/types'
import { FormField, fieldProps, initialActionState, useActionFeedback } from './form-field'

export function MovimientoDialog({
  tipo,
  productos,
}: {
  tipo: TipoMovimiento
  productos: Producto[]
}) {
  const [open, setOpen] = useState(false)
  const isEntrada = tipo === 'entrada'
  const Icon = isEntrada ? ArrowDownToLine : ArrowUpFromLine

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={isEntrada ? 'default' : 'outline'} />}>
        <Icon data-icon="inline-start" />
        {isEntrada ? 'Registrar entrada' : 'Registrar salida'}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEntrada ? 'Entrada de inventario' : 'Salida de inventario'}</DialogTitle>
          <DialogDescription>
            {isEntrada
              ? 'Registra el ingreso de mercadería al almacén.'
              : 'Registra mermas, consumos o devoluciones. Las ventas descuentan stock automáticamente.'}
          </DialogDescription>
        </DialogHeader>
        {open && <MovimientoForm tipo={tipo} productos={productos} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function MovimientoForm({
  tipo,
  productos,
  onDone,
}: {
  tipo: TipoMovimiento
  productos: Producto[]
  onDone: () => void
}) {
  const [state, action, pending] = useActionState(registrarMovimiento, initialActionState)
  const [productoId, setProductoId] = useState('')
  useActionFeedback(state, onDone)
  const err = state.errors ?? {}
  const selected = productos.find((p) => p.id === productoId)
  const motivos = tipo === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SALIDA

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="tipo" value={tipo} />
      <FormField
        id="producto_id"
        label="Producto"
        error={err.producto_id}
        hint={selected ? `Stock actual: ${selected.stock_actual} · ${selected.presentacion}` : undefined}
      >
        <NativeSelect
          {...fieldProps('producto_id', state)}
          value={productoId}
          onChange={(e) => setProductoId(e.target.value)}
          required
        >
          <option value="" disabled>
            Selecciona un producto
          </option>
          {productos.map((p) => (
            <option key={p.id} value={p.id} disabled={tipo === 'salida' && p.stock_actual <= 0}>
              {`${p.sku} · ${p.nombre} (${p.stock_actual})`}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="cantidad" label="Cantidad" error={err.cantidad}>
          <Input
            {...fieldProps('cantidad', state)}
            type="number"
            min={1}
            max={tipo === 'salida' && selected ? selected.stock_actual : undefined}
            step={1}
            placeholder="0"
            required
          />
        </FormField>
        <FormField id="motivo" label="Motivo" error={err.motivo}>
          <NativeSelect {...fieldProps('motivo', state)} defaultValue={motivos[0]} required>
            {motivos.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      <FormField id="nota" label="Nota (opcional)">
        <Input id="nota" name="nota" maxLength={140} placeholder="Ej. Factura F001-2345" />
      </FormField>
      <FormField id="access_key" label="Clave de acceso" hint="Obligatoria para modificar el inventario.">
        <Input id="access_key" name="access_key" type="password" autoComplete="off" required placeholder="Clave administrativa" />
      </FormField>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? 'Registrando...' : tipo === 'entrada' ? 'Registrar entrada' : 'Registrar salida'}
        </Button>
      </DialogFooter>
    </form>
  )
}

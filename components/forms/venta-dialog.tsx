'use client'

import { useActionState, useState } from 'react'
import { Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { registrarVenta } from '@/app/actions'
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
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { formatMoney } from '@/lib/format'
import { METODOS_PAGO, type Cliente, type Producto } from '@/lib/types'
import { FormField, initialActionState, useActionFeedback } from './form-field'

interface Props {
  productos: Producto[]
  clientes: Cliente[]
  simbolo: string
}

export function VentaDialog(props: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <ShoppingCart data-icon="inline-start" />
        Registrar venta
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva venta</DialogTitle>
          <DialogDescription>
            Agrega los productos vendidos. El stock se descontará automáticamente.
          </DialogDescription>
        </DialogHeader>
        {open && <VentaForm {...props} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

interface Linea {
  key: number
  producto_id: string
  cantidad: number
}

function VentaForm({ productos, clientes, simbolo, onDone }: Props & { onDone: () => void }) {
  const [state, action, pending] = useActionState(registrarVenta, initialActionState)
  const [lineas, setLineas] = useState<Linea[]>([{ key: 1, producto_id: '', cantidad: 1 }])
  useActionFeedback(state, onDone)

  const disponibles = productos.filter((p) => p.stock_actual > 0)
  const byId = new Map(productos.map((p) => [p.id, p]))
  const validas = lineas.filter((l) => l.producto_id && l.cantidad > 0)
  const total = validas.reduce(
    (sum, l) => sum + (byId.get(l.producto_id)?.precio_venta ?? 0) * l.cantidad,
    0,
  )

  const update = (key: number, patch: Partial<Linea>) =>
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  return (
    <form action={action} className="flex flex-col gap-5">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(validas.map(({ producto_id, cantidad }) => ({ producto_id, cantidad })))}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="cliente_id" label="Cliente">
          <NativeSelect id="cliente_id" name="cliente_id" defaultValue="">
            <option value="">Cliente general</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="metodo_pago" label="Método de pago">
          <NativeSelect id="metodo_pago" name="metodo_pago" defaultValue={METODOS_PAGO[0]}>
            {METODOS_PAGO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Productos</legend>
        {lineas.map((l, idx) => {
          const p = byId.get(l.producto_id)
          const exceeds = p ? l.cantidad > p.stock_actual : false
          return (
            <div key={l.key} className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`producto-${l.key}`} className="text-xs text-muted-foreground">
                  {`Producto ${idx + 1}`}
                </Label>
                <NativeSelect
                  id={`producto-${l.key}`}
                  value={l.producto_id}
                  onChange={(e) => update(l.key, { producto_id: e.target.value })}
                >
                  <option value="" disabled>
                    Selecciona un producto
                  </option>
                  {disponibles.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {`${prod.nombre} · ${formatMoney(prod.precio_venta, simbolo)} (stock ${prod.stock_actual})`}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex w-24 flex-col gap-1.5">
                  <Label htmlFor={`cantidad-${l.key}`} className="text-xs text-muted-foreground">
                    Cantidad
                  </Label>
                  <Input
                    id={`cantidad-${l.key}`}
                    type="number"
                    min={1}
                    max={p?.stock_actual}
                    step={1}
                    value={l.cantidad}
                    aria-invalid={exceeds || undefined}
                    onChange={(e) => update(l.key, { cantidad: Math.max(0, Math.floor(Number(e.target.value))) })}
                  />
                </div>
                <p className="w-28 pb-2 text-right text-sm font-semibold tabular-nums">
                  {formatMoney((p?.precio_venta ?? 0) * l.cantidad, simbolo)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar producto ${idx + 1}`}
                  disabled={lineas.length === 1}
                  onClick={() => setLineas((prev) => prev.filter((x) => x.key !== l.key))}
                >
                  <Trash2 />
                </Button>
              </div>
              {exceeds && (
                <p className="text-xs text-destructive sm:hidden">{`Máximo disponible: ${p?.stock_actual}`}</p>
              )}
            </div>
          )
        })}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() =>
            setLineas((prev) => [...prev, { key: Date.now(), producto_id: '', cantidad: 1 }])
          }
        >
          <Plus data-icon="inline-start" />
          Agregar producto
        </Button>
      </fieldset>

      <div className="flex items-center justify-between rounded-lg bg-accent px-4 py-3">
        <span className="text-sm font-medium text-accent-foreground">Total a cobrar</span>
        <span className="text-xl font-bold tabular-nums text-accent-foreground">
          {formatMoney(total, simbolo)}
        </span>
      </div>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
        <Button type="submit" disabled={pending || validas.length === 0}>
          {pending ? 'Registrando...' : 'Confirmar venta'}
        </Button>
      </DialogFooter>
    </form>
  )
}

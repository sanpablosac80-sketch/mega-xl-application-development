'use client'
import { useActionState } from 'react'
import { crearComprobante } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { FormField, initialActionState } from './form-field'

export function ComprobanteForm({ ventas }: { ventas: {id:string;numero:number;cliente_nombre:string|null;total:number}[] }) {
 const [state, action, pending] = useActionState(crearComprobante, initialActionState)
 return <form action={action} className="grid gap-4 sm:grid-cols-3">
  <FormField id="venta_id" label="Venta"><NativeSelect id="venta_id" name="venta_id" required defaultValue=""><option value="" disabled>Selecciona una venta</option>{ventas.map(v=><option key={v.id} value={v.id}>{`#${v.numero} · ${v.cliente_nombre ?? 'Cliente general'} · S/ ${v.total.toFixed(2)}`}</option>)}</NativeSelect></FormField>
  <FormField id="tipo" label="Comprobante"><NativeSelect id="tipo" name="tipo" defaultValue="boleta"><option value="boleta">Boleta</option><option value="factura">Factura</option></NativeSelect></FormField>
  <div className="flex items-end"><Button type="submit" disabled={pending}>{pending?'Registrando...':'Crear comprobante'}</Button></div>
  {state.message && <p className={`text-sm sm:col-span-3 ${state.ok?'text-green-700':'text-destructive'}`}>{state.message}</p>}
 </form>
}
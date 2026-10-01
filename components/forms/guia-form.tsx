'use client'
import { useActionState } from 'react'
import { crearGuiaRemision } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { FormField, initialActionState } from './form-field'

export function GuiaForm({ ventas }: { ventas:{id:string;numero:number;cliente_nombre:string|null}[] }) {
 const [state,action,pending]=useActionState(crearGuiaRemision,initialActionState)
 return <form action={action} className="grid gap-4 sm:grid-cols-2">
  <FormField id="venta_id" label="Venta"><NativeSelect id="venta_id" name="venta_id" required defaultValue=""><option value="" disabled>Selecciona una venta</option>{ventas.map(v=><option key={v.id} value={v.id}>{`#${v.numero} · ${v.cliente_nombre??'Cliente general'}`}</option>)}</NativeSelect></FormField>
  <FormField id="tipo" label="Tipo de GRE"><NativeSelect id="tipo" name="tipo" defaultValue="remitente"><option value="remitente">Remitente</option><option value="transportista">Transportista</option><option value="evento">Evento</option></NativeSelect></FormField>
  <FormField id="motivo" label="Motivo de traslado"><Input id="motivo" name="motivo" defaultValue="Venta" required /></FormField>
  <FormField id="fecha" label="Inicio de traslado"><Input id="fecha" name="fecha" type="date" /></FormField>
  <FormField id="partida" label="Punto de partida"><Input id="partida" name="partida" required /></FormField>
  <FormField id="llegada" label="Punto de llegada"><Input id="llegada" name="llegada" required /></FormField>
  <FormField id="modalidad" label="Transporte"><NativeSelect id="modalidad" name="modalidad" defaultValue="privado"><option value="privado">Privado</option><option value="publico">Público</option></NativeSelect></FormField>
  <FormField id="placa" label="Placa"><Input id="placa" name="placa" /></FormField>
  <FormField id="transportista_ruc" label="RUC transportista"><Input id="transportista_ruc" name="transportista_ruc" /></FormField>
  <FormField id="transportista_nombre" label="Transportista"><Input id="transportista_nombre" name="transportista_nombre" /></FormField>
  <FormField id="conductor_documento" label="Documento conductor"><Input id="conductor_documento" name="conductor_documento" /></FormField>
  <FormField id="conductor_licencia" label="Licencia conductor"><Input id="conductor_licencia" name="conductor_licencia" /></FormField>
  <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending?'Registrando...':'Crear guía de remisión'}</Button></div>
  {state.message&&<p className={`text-sm sm:col-span-2 ${state.ok?'text-green-700':'text-destructive'}`}>{state.message}</p>}
 </form>
}
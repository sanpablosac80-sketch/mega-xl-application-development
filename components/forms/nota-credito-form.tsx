'use client'
import {useActionState} from 'react'
import {crearNotaCredito} from '@/app/actions'
import {Button} from '@/components/ui/button'
import {NativeSelect} from '@/components/ui/native-select'
import {FormField,initialActionState} from './form-field'
export function NotaCreditoForm({documents}:{documents:{id:string;serie:string;correlativo:number;total:number}[]}){
 const [state,action,pending]=useActionState(crearNotaCredito,initialActionState)
 return <form action={action} className="grid gap-3">
 <FormField id="nc-ref" label="Comprobante aceptado en producción"><NativeSelect id="nc-ref" name="comprobante_id" required defaultValue=""><option value="" disabled>Selecciona el comprobante</option>{documents.map(d=><option key={d.id} value={d.id}>{d.serie}-{d.correlativo} · S/ {Number(d.total).toFixed(2)}</option>)}</NativeSelect></FormField>
 <p className="text-sm">Motivo: 01 — Anulación de la operación, por el importe total.</p>
 <FormField id="nc-description" label="Descripción del motivo"><input className="w-full rounded-md border p-2" id="nc-description" name="descripcion" required minLength={5} maxLength={200}/></FormField>
 <Button disabled={pending||!documents.length}>{pending?'Registrando…':'Crear nota de crédito'}</Button>
 {state.message&&<p role="status" className="text-sm">{state.message}</p>}
 </form>
}

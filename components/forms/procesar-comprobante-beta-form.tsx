'use client'
import { useActionState } from 'react'
import { procesarComprobanteBeta } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { initialActionState } from './form-field'

export function ProcesarComprobanteBetaForm({id,label}:{id:string;label:string}){
 const [state,action,pending]=useActionState(procesarComprobanteBeta,initialActionState)
 return <form action={action} className="flex flex-col gap-2">
  <input type="hidden" name="comprobante_id" value={id}/>
  <Button type="submit" disabled={pending}>{pending?'Procesando BETA...':`Probar ${label} en SUNAT BETA`}</Button>
  {state.message&&<p className={`text-sm ${state.ok?'text-green-700':'text-destructive'}`}>{state.message}</p>}
 </form>
}
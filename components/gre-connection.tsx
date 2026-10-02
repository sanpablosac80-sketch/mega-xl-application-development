'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {Button} from '@/components/ui/button'
export function GreConnection(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function check(){
  setBusy(true);setMessage('')
  try{
   const response=await fetch('/api/gre-auth',{method:'POST'})
   const data=await response.json()
   setMessage(data.message||data.error||'No se pudo comprobar la conexión')
  }catch{setMessage('No se pudo comprobar la conexión. Inténtalo de nuevo.')}
  finally{setBusy(false)}
 }
 return <div className="space-y-2"><Button variant="outline" disabled={busy} onClick={check}>{busy?'Comprobando conexión…':'Comprobar conexión SUNAT'}</Button><p className="text-xs text-muted-foreground">Disponible para administrador y gerente. Comprueba las credenciales; no envía guías.</p>{message&&<p role="status" className="text-sm">{message}</p>}</div>
}
export function GreRestActions({guiaId,ticket}:{guiaId:string,ticket?:string|null}){
 const router=useRouter()
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function run(){
  setBusy(true);setMessage('')
  try{
   const response=await fetch('/api/gre-rest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guia_id:guiaId,action:ticket?'consult':'prepare'})})
   const data=await response.json()
   if(ticket&&data.ok)router.refresh()
   setMessage(Array.isArray(data.errors)?data.errors.join('. '):data.description||data.error||(data.ok?(ticket?'Estado SUNAT: '+data.state:'Revisión previa superada. Sin envío a SUNAT.'):'No se pudo completar la revisión.'))
  }catch{setMessage('No se pudo completar la operación. Inténtalo de nuevo.')}
  finally{setBusy(false)}
 }
 return <div className="space-y-2"><Button variant="outline" disabled={busy} onClick={run}>{busy?'Consultando…':ticket?'Consultar ticket SUNAT':'Revisar para API SUNAT'}</Button>{ticket&&<p className="text-xs">Ticket: {ticket}</p>}{message&&<p role="status" className="max-w-md text-sm">{message}</p>}</div>
}

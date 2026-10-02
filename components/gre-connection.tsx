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
export function GreRestActions({guiaId,ticket,canEmit=false}:{guiaId:string,ticket?:string|null,canEmit?:boolean}){
 const router=useRouter()
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const [confirmed,setConfirmed]=useState(false)
 async function run(emit=false){
  setBusy(true);setMessage('')
  try{
   if(emit){
    if(!confirmed)return
    const approval=await fetch('/api/gre-rest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guia_id:guiaId,action:'authorize',confirm_production:true})})
    const result=await approval.json()
    if(!approval.ok||!result.ok){setMessage(Array.isArray(result.errors)?result.errors.join('. '):result.error||'No se pudo autorizar la guía');return}
   }
   const response=await fetch('/api/gre-rest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guia_id:guiaId,action:emit?'send':ticket?'consult':'prepare',confirm_production:emit&&confirmed})})
   const data=await response.json()
   if((ticket||emit)&&data.ok)router.refresh()
   setMessage(Array.isArray(data.errors)?data.errors.join('. '):data.description||data.error||(data.ok?((ticket||emit)?'Estado SUNAT: '+data.state:'Revisión previa superada. Sin envío a SUNAT.'):'No se pudo completar la revisión.'))
  }catch{setMessage('No se pudo completar la operación. Inténtalo de nuevo.')}
  finally{setBusy(false)}
 }
 return <div className="space-y-2"><Button variant="outline" disabled={busy} onClick={()=>run()}>{busy?'Procesando…':ticket?'Consultar ticket SUNAT':'Revisar para API SUNAT'}</Button>{canEmit&&!ticket&&<div className="max-w-sm space-y-2"><label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/><span>Confirmo los datos del PDF y autorizo la emisión real de esta guía en SUNAT.</span></label><Button disabled={busy||!confirmed} onClick={()=>run(true)}>Emitir guía en SUNAT</Button></div>}{ticket&&<p className="text-xs">Ticket: {ticket}</p>}{message&&<p role="status" className="max-w-md text-sm">{message}</p>}</div>
}

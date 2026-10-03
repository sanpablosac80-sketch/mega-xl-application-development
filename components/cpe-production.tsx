'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {Button} from '@/components/ui/button'
export function CpeProduction({id,state,canEmit}:{id:string;state:string;canEmit:boolean}){
 const [busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[message,setMessage]=useState(''),router=useRouter()
 async function run(action:string){setBusy(true);setMessage('');try{
  const call=async(action:string)=>{const r=await fetch('/api/cpe-production',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({comprobante_id:id,action,confirm_production:confirmed})});const d=await r.json();if(!r.ok||d.error)throw Error(d.error||'No se completó la operación');return d}
  if(action==='send')await call('authorize');const d=await call(action);setMessage(d.message||d.state||'Operación completada');setConfirmed(false);router.refresh()
 }catch(e){setMessage(e instanceof Error?e.message:'No se completó la operación')}finally{setBusy(false)}}
 if(!canEmit)return null
 return <div className="mt-3 grid gap-3">
 <Button variant="outline" disabled={busy} onClick={()=>run('diagnose')}>{busy?'Verificando…':'Verificar conexión SUNAT'}</Button>
 {state==='PENDIENTE'&&<Button disabled={busy} onClick={()=>run('prepare')}>Preparar XML y PDF</Button>}
 {state==='PREPARADO_PRODUCCION'&&<><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>He revisado el PDF y confirmo que corresponde a una operación real. Autorizar emisión a SUNAT.</label><Button disabled={busy||!confirmed} onClick={()=>run('send')}>{busy?'Enviando…':'Emitir a SUNAT'}</Button></>}
 {['PROCESANDO','ENVIO_INCIERTO','ENVIANDO'].includes(state)&&<Button disabled={busy} onClick={()=>run('consult')}>Consultar resultado en SUNAT</Button>}
 {message&&<p role="status" className="text-sm">{message}</p>}
 </div>
}

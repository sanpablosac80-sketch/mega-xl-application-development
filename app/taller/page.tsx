'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const productos = [
 { id:'ph15', nombre:'PH 15 mt', peso:1, unidades:20 },
 { id:'pi45', nombre:'Papel institucional 45 mt', peso:1, unidades:6 },
 { id:'pt23', nombre:'Papel toalla 23 mt', peso:2, unidades:24 },
 { id:'ph40', nombre:'PH 40 mt', peso:3.5, unidades:24 },
]

export default function TallerPage(){
 const [kg,setKg]=useState(500); const [merma,setMerma]=useState(0); const [id,setId]=useState('ph15')
 const p=productos.find(x=>x.id===id)!
 const r=useMemo(()=>{const util=kg*(1-merma/100);const planchas=Math.floor(util/p.peso);return {util,planchas,rollos:planchas*p.unidades,sobrante:util-planchas*p.peso}},[kg,merma,p])
 return <div className="mx-auto flex max-w-6xl flex-col gap-6">
  <PageHeader title="Taller · Simulador de producción" description="Módulo aislado: sus cálculos no modifican inventario, ventas ni contabilidad." />
  <Card><CardHeader><CardTitle>Bobina madre</CardTitle><CardDescription>Rango admitido: 450 a 580 kg. Puedes simular merma sin registrar movimientos.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
   <div><Label htmlFor="kg">Peso (kg)</Label><Input id="kg" type="number" min={450} max={580} step="0.1" value={kg} onChange={e=>setKg(Math.min(580,Math.max(450,Number(e.target.value)||450)))} /></div>
   <div><Label htmlFor="merma">Merma estimada (%)</Label><Input id="merma" type="number" min={0} max={30} step="0.1" value={merma} onChange={e=>setMerma(Math.min(30,Math.max(0,Number(e.target.value)||0)))} /></div>
   <div><Label htmlFor="prod">Producto terminado</Label><select id="prod" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={id} onChange={e=>setId(e.target.value)}>{productos.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></div>
  </CardContent></Card>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
   <Card><CardHeader><CardDescription>Kg aprovechables</CardDescription><CardTitle>{r.util.toFixed(2)} kg</CardTitle></CardHeader></Card>
   <Card><CardHeader><CardDescription>Planchas completas</CardDescription><CardTitle>{r.planchas.toLocaleString('es-PE')}</CardTitle></CardHeader></Card>
   <Card><CardHeader><CardDescription>Rollos estimados</CardDescription><CardTitle>{r.rollos.toLocaleString('es-PE')}</CardTitle></CardHeader></Card>
   <Card><CardHeader><CardDescription>Sobrante teórico</CardDescription><CardTitle>{r.sobrante.toFixed(2)} kg</CardTitle></CardHeader></Card>
  </div>
  <Card><CardHeader><CardTitle>Parámetros de conversión</CardTitle><CardDescription>Predicción teórica por peso de plancha; no descuenta stock.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Producto</th><th className="p-2">Peso/plancha</th><th className="p-2">Rollos/plancha</th></tr></thead><tbody>{productos.map(x=><tr className="border-b" key={x.id}><td className="p-2">{x.nombre}</td><td className="p-2">{x.peso} kg</td><td className="p-2">{x.unidades}</td></tr>)}</tbody></table></CardContent></Card>
 </div>
}

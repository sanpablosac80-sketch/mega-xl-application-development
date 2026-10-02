'use client'
import { useActionState, useState } from 'react'
import { crearGuiaRemision } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { FormField, initialActionState } from './form-field'

const MOTIVOS=[
 ['01','Venta'],['14','Venta sujeta a confirmación del comprador'],['02','Compra'],
 ['04','Traslado entre establecimientos de la misma empresa'],['18','Traslado emisor itinerante CP'],
 ['08','Importación'],['09','Exportación'],['19','Traslado a zona primaria'],['13','Otros'],
] as const

export function GuiaForm({ ventas }: { ventas:{id:string;numero:number;cliente_nombre:string|null}[] }) {
 const [state,action,pending]=useActionState(crearGuiaRemision,initialActionState)
 const [motivo,setMotivo]=useState('01')
 const [modalidad,setModalidad]=useState('02')
 const aduanero=['08','09','19'].includes(motivo)
 return <form action={action} className="grid gap-4 sm:grid-cols-2">
  <FormField id="venta_id" label="Venta"><NativeSelect id="venta_id" name="venta_id" required defaultValue=""><option value="" disabled>Selecciona una venta</option>{ventas.map(v=><option key={v.id} value={v.id}>{`#${v.numero} · ${v.cliente_nombre??'Cliente general'}`}</option>)}</NativeSelect></FormField>
  <FormField id="tipo" label="Tipo de GRE"><NativeSelect id="tipo" name="tipo" defaultValue="remitente"><option value="remitente">GRE Remitente</option></NativeSelect></FormField>
  <FormField id="motivo_codigo" label="Motivo de traslado · SUNAT Catálogo 20"><NativeSelect id="motivo_codigo" name="motivo_codigo" value={motivo} onChange={e=>setMotivo(e.target.value)}>{MOTIVOS.map(([c,n])=><option key={c} value={c}>{c} · {n}</option>)}</NativeSelect></FormField>
  {motivo==='13'&&<FormField id="motivo_detalle" label="Detalle del motivo (obligatorio)"><Input id="motivo_detalle" name="motivo_detalle" required maxLength={100} placeholder="Especifique el motivo del traslado" /></FormField>}
  <FormField id="fecha" label="Inicio de traslado"><Input id="fecha" name="fecha" type="date" required /></FormField>
  <FormField id="peso_bruto" label="Peso bruto total (kg)"><Input id="peso_bruto" name="peso_bruto" type="number" min="0.001" step="0.001" required /></FormField>
  <FormField id="partida" label="Dirección punto de partida"><Input id="partida" name="partida" required maxLength={200} /></FormField>
  <FormField id="partida_ubigeo" label="Ubigeo partida"><Input id="partida_ubigeo" name="partida_ubigeo" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="6 dígitos" /></FormField>
  <FormField id="llegada" label="Dirección punto de llegada"><Input id="llegada" name="llegada" required maxLength={200} /></FormField>
  <FormField id="llegada_ubigeo" label="Ubigeo llegada"><Input id="llegada_ubigeo" name="llegada_ubigeo" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="6 dígitos" /></FormField>
  <FormField id="modalidad" label="Modalidad · SUNAT Catálogo 18"><NativeSelect id="modalidad" name="modalidad" value={modalidad} onChange={e=>setModalidad(e.target.value)}><option value="02">02 · Transporte privado</option><option value="01">01 · Transporte público</option></NativeSelect></FormField>
  {modalidad==='02'&&<>
   <FormField id="placa" label="Placa del vehículo"><Input id="placa" name="placa" required /></FormField>
   <FormField id="conductor_documento" label="Documento conductor"><Input id="conductor_documento" name="conductor_documento" required /></FormField>
   <FormField id="conductor_licencia" label="Licencia conductor"><Input id="conductor_licencia" name="conductor_licencia" required /></FormField>
  </>}
  {modalidad==='01'&&<>
   <FormField id="transportista_ruc" label="RUC transportista"><Input id="transportista_ruc" name="transportista_ruc" inputMode="numeric" pattern="[0-9]{11}" maxLength={11} required /></FormField>
   <FormField id="transportista_nombre" label="Razón social transportista"><Input id="transportista_nombre" name="transportista_nombre" required /></FormField>
  </>}
  {aduanero&&<>
   <FormField id="documento_aduanero" label="DAM / DS / Manifiesto de carga"><Input id="documento_aduanero" name="documento_aduanero" required /></FormField>
   <FormField id="numero_contenedor" label="Número de contenedor (si corresponde)"><Input id="numero_contenedor" name="numero_contenedor" maxLength={17} /></FormField>
   <FormField id="numero_bultos" label="Número de bultos (si corresponde)"><Input id="numero_bultos" name="numero_bultos" type="number" min="1" step="1" /></FormField>
   <FormField id="numero_precinto" label="Número de precinto (si corresponde)"><Input id="numero_precinto" name="numero_precinto" /></FormField>
  </>}
  <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending?'Validando...':'Crear GRE Remitente'}</Button></div>
  {state.message&&<p className={`text-sm sm:col-span-2 ${state.ok?'text-green-700':'text-destructive'}`}>{state.message}</p>}
 </form>
}
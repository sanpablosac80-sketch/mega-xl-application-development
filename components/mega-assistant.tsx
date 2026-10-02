'use client'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { MegaMascot } from '@/components/mega-mascot'
const HELP:Record<string,{title:string;body:string[]}>={
 '/':['Inicio','Aquí ves el resumen general de Mega XL y los principales indicadores.'],
 '/productos':['Productos','Crea y modifica productos, presentaciones, precios de venta/costo y stock mínimo.'],
 '/inventario':['Inventario','Registra entradas y salidas. Las modificaciones protegidas requieren la clave administrativa.'],
 '/ventas':['Ventas','Registra ventas, clientes, descuento e IGV. El stock se descuenta al confirmar la venta.'],
 '/facturacion':['Facturación','Genera boletas o facturas desde ventas registradas y consulta el estado de SUNAT.'],
 '/guias-remision':['Guías de remisión','Genera una guía desde una venta y completa los datos de traslado.'],
 '/clientes':['Clientes','Registra y consulta clientes y sus datos de identificación y contacto.'],
 '/reportes':['Reportes','Consulta indicadores, ventas, margen estimado e inventario.'],
 '/contabilidad':['Contabilidad','Consulta el resumen contable y financiero generado con los datos registrados.'],
 '/taller':['Taller','Simula cuántos rollos pueden obtenerse de una bobina madre. Este módulo está aislado y no modifica inventario ni ventas.'],
 '/configuracion':['Configuración','Administra los datos generales y fiscales de la empresa.'],
}
export function MegaAssistant(){const path=usePathname();const [open,setOpen]=useState(false);const key=Object.keys(HELP).find(k=>k==='/'?path==='/':path.startsWith(k))||'/';const [title,...body]=HELP[key]
return <div className="fixed bottom-5 right-5 z-50"><button onClick={()=>setOpen(!open)} className="flex size-16 items-center justify-center rounded-full border bg-white shadow-xl" aria-label="Abrir asistente Mega XL"><MegaMascot className="size-14"/></button>{open&&<div className="absolute bottom-20 right-0 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border bg-background p-4 shadow-2xl"><div className="flex items-center gap-3"><MegaMascot className="size-14"/><div><p className="font-bold">Asistente Mega XL</p><p className="text-sm font-medium">{title}</p></div></div><div className="mt-3 space-y-2 text-sm text-muted-foreground">{body.map(x=><p key={x}>{x}</p>)}</div><p className="mt-3 rounded-lg bg-muted p-2 text-xs">Ayuda contextual. No realiza cambios automáticamente.</p></div>}</div>}

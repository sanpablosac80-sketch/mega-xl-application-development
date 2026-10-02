'use server'

import { revalidatePath } from 'next/cache'
import { getRepository } from '@/lib/data'
import {
  MAX_CANTIDAD,
  METODOS_PAGO,
  MOTIVOS_ENTRADA,
  MOTIVOS_SALIDA,
  type ProductoInput,
  type TipoMovimiento,
} from '@/lib/types'

export interface ActionState {
  ok: boolean
  message: string
  errors?: Record<string, string>
  ts?: number
}

const fail = (message: string, errors?: Record<string, string>): ActionState => ({
  ok: false, message, errors, ts: Date.now(),
})
const success = (message: string): ActionState => ({ ok: true, message, ts: Date.now() })
const text = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? '').trim().slice(0, max)
function int(fd: FormData, key: string) { const raw=String(fd.get(key)??'').trim(); if(raw==='') return NaN; const n=Number(raw); return Number.isInteger(n)?n:NaN }
function money(fd: FormData, key: string) { const raw=String(fd.get(key)??'').trim().replace(',','.'); if(raw==='') return NaN; const n=Number(raw); return Number.isFinite(n)?Math.round(n*100)/100:NaN }
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Ocurrió un error inesperado. Inténtalo de nuevo.'
function revalidateAll(){revalidatePath('/','layout')}

function parseProducto(fd:FormData,isNew:boolean){
 const errors:Record<string,string>={}
 const input:ProductoInput={sku:text(fd,'sku',40).toUpperCase(),nombre:text(fd,'nombre',120),presentacion:text(fd,'presentacion',60),categoria:text(fd,'categoria',60)||'General',unidades:int(fd,'unidades'),precio_venta:money(fd,'precio_venta'),precio_costo:money(fd,'precio_costo'),stock_minimo:int(fd,'stock_minimo')}
 if(!/^[A-Z0-9-_.]{2,40}$/.test(input.sku)) errors.sku='Usa 2-40 caracteres: letras, números o guiones.'
 if(input.nombre.length<2) errors.nombre='Ingresa el nombre del producto.'
 if(!input.presentacion) errors.presentacion='Ingresa la presentación.'
 if(!(input.unidades>=1&&input.unidades<=MAX_CANTIDAD)) errors.unidades='Debe ser un número entero mayor a 0.'
 if(!(input.precio_venta>=0)) errors.precio_venta='Precio inválido.'
 if(!(input.precio_costo>=0)) errors.precio_costo='Precio inválido.'
 if(!(input.stock_minimo>=0&&input.stock_minimo<=MAX_CANTIDAD)) errors.stock_minimo='Debe ser un entero mayor o igual a 0.'
 if(isNew){const stock=int(fd,'stock_actual');if(!(stock>=0&&stock<=MAX_CANTIDAD)) errors.stock_actual='Debe ser un entero mayor o igual a 0.';input.stock_actual=stock}
 return {input,errors}
}
export async function crearProducto(_:ActionState,fd:FormData):Promise<ActionState>{const {input,errors}=parseProducto(fd,true);if(Object.keys(errors).length)return fail('Revisa los campos marcados.',errors);try{await(await getRepository()).createProducto(input,text(fd,'access_key',80))}catch(e){return fail(errorMessage(e))}revalidateAll();return success(`Producto ${input.nombre} creado.`)}
export async function actualizarProducto(_:ActionState,fd:FormData):Promise<ActionState>{const id=text(fd,'id',64);if(!id)return fail('Producto no válido.');const {input,errors}=parseProducto(fd,false);if(Object.keys(errors).length)return fail('Revisa los campos marcados.',errors);try{await(await getRepository()).updateProducto(id,input,text(fd,'access_key',80))}catch(e){return fail(errorMessage(e))}revalidateAll();return success(`Producto ${input.nombre} actualizado.`)}
export async function eliminarProducto(id:string):Promise<ActionState>{try{await(await getRepository()).deleteProducto(id)}catch(e){return fail(errorMessage(e))}revalidateAll();return success('Producto eliminado.')}
export async function registrarMovimiento(_:ActionState,fd:FormData):Promise<ActionState>{const tipo=text(fd,'tipo') as TipoMovimiento,producto_id=text(fd,'producto_id',64),cantidad=int(fd,'cantidad'),motivoBase=text(fd,'motivo',60),nota=text(fd,'nota',140),errors:Record<string,string>={};if(tipo!=='entrada'&&tipo!=='salida')return fail('Tipo de movimiento inválido.');const motivos:readonly string[]=tipo==='entrada'?MOTIVOS_ENTRADA:MOTIVOS_SALIDA;if(!producto_id)errors.producto_id='Selecciona un producto.';if(!(cantidad>=1&&cantidad<=MAX_CANTIDAD))errors.cantidad=`Ingresa un entero entre 1 y ${MAX_CANTIDAD}.`;if(!motivos.includes(motivoBase))errors.motivo='Selecciona un motivo.';if(Object.keys(errors).length)return fail('Revisa los campos marcados.',errors);try{await(await getRepository()).registrarMovimiento({producto_id,tipo,cantidad,motivo:nota?`${motivoBase} - ${nota}`:motivoBase},text(fd,'access_key',80))}catch(e){return fail(errorMessage(e))}revalidateAll();return success(tipo==='entrada'?'Entrada registrada.':'Salida registrada.')}
export async function registrarVenta(_:ActionState,fd:FormData):Promise<ActionState>{const cliente_id=text(fd,'cliente_id',64)||null,metodo_pago=text(fd,'metodo_pago',30),descuento_porcentaje=money(fd,'descuento_porcentaje');if(!Number.isFinite(descuento_porcentaje)||descuento_porcentaje<0||descuento_porcentaje>100)return fail('El descuento debe estar entre 0% y 100%.');if(!(METODOS_PAGO as readonly string[]).includes(metodo_pago))return fail('Selecciona un método de pago.');let items:{producto_id:string;cantidad:number}[];try{const parsed=JSON.parse(String(fd.get('items')??'[]'));if(!Array.isArray(parsed)||parsed.length===0||parsed.length>100)throw new Error();items=parsed.map(i=>({producto_id:String(i.producto_id),cantidad:Number(i.cantidad)}))}catch{return fail('Agrega al menos un producto a la venta.')}const totals=new Map<string,number>();for(const i of items){if(!i.producto_id||!Number.isInteger(i.cantidad)||i.cantidad<1)return fail('Las cantidades deben ser enteros mayores a 0.');totals.set(i.producto_id,(totals.get(i.producto_id)??0)+i.cantidad)}if([...totals.values()].some(c=>c>MAX_CANTIDAD))return fail(`La cantidad máxima por producto es ${MAX_CANTIDAD}.`);try{await(await getRepository()).registrarVenta({cliente_id,metodo_pago,descuento_porcentaje,items:[...totals].map(([producto_id,cantidad])=>({producto_id,cantidad}))})}catch(e){return fail(errorMessage(e))}revalidateAll();return success('Venta registrada correctamente.')}
function parseCliente(fd:FormData){const input={nombre:text(fd,'nombre',120),documento:text(fd,'documento',20).replace(/\s/g,''),telefono:text(fd,'telefono',30),email:text(fd,'email',120),direccion:text(fd,'direccion',200)},errors:Record<string,string>={};if(input.nombre.length<2)errors.nombre='Ingresa el nombre o razón social.';if(input.documento&&!/^(\d{8}|\d{11})$/.test(input.documento))errors.documento='Ingresa un DNI de 8 dígitos o RUC de 11 dígitos.';if(input.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))errors.email='Correo electrónico inválido.';return {input,errors}}
export async function crearCliente(_:ActionState,fd:FormData):Promise<ActionState>{const {input,errors}=parseCliente(fd);if(Object.keys(errors).length)return fail('Revisa los campos marcados.',errors);try{const repo=await getRepository();const duplicado=(await repo.listClientes()).some(c=>input.documento&&c.documento===input.documento);if(duplicado)return fail('Ya existe un cliente con ese DNI/RUC.',{documento:'DNI/RUC ya registrado.'});await repo.createCliente(input)}catch(e){return fail(errorMessage(e))}revalidateAll();return success(`Cliente ${input.nombre} registrado.`)}
export async function actualizarCliente(_:ActionState,fd:FormData):Promise<ActionState>{const id=text(fd,'id',64);if(!id)return fail('Cliente no válido.');const {input,errors}=parseCliente(fd);if(Object.keys(errors).length)return fail('Revisa los campos marcados.',errors);try{const repo=await getRepository();const duplicado=(await repo.listClientes()).some(c=>c.id!==id&&input.documento&&c.documento===input.documento);if(duplicado)return fail('Ya existe otro cliente con ese DNI/RUC.',{documento:'DNI/RUC ya registrado.'});await repo.updateCliente(id,input)}catch(e){return fail(errorMessage(e))}revalidateAll();return success(`Cliente ${input.nombre} actualizado.`)}
export async function eliminarCliente(id:string):Promise<ActionState>{try{await(await getRepository()).deleteCliente(id)}catch(e){return fail(errorMessage(e))}revalidateAll();return success('Cliente eliminado.')}
export async function guardarConfiguracion(_:ActionState,fd:FormData):Promise<ActionState>{const input={nombre_empresa:text(fd,'nombre_empresa',120),ruc:text(fd,'ruc',20),direccion:text(fd,'direccion',200),telefono:text(fd,'telefono',30),email:text(fd,'email',120),simbolo_moneda:text(fd,'simbolo_moneda',5)},errors:Record<string,string>={};if(input.nombre_empresa.length<2)errors.nombre_empresa='Ingresa el nombre de la empresa.';if(!input.simbolo_moneda)errors.simbolo_moneda='Ingresa el símbolo de moneda.';if(input.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))errors.email='Correo electrónico inválido.';if(Object.keys(errors).length)return fail('Revisa los campos marcados.',errors);try{await(await getRepository()).updateConfiguracion(input)}catch(e){return fail(errorMessage(e))}revalidateAll();return success('Configuración guardada.')}

export async function crearComprobante(_:ActionState,fd:FormData):Promise<ActionState>{
 const venta_id=text(fd,'venta_id',64),tipo=text(fd,'tipo',20)
 if(!venta_id||!['factura','boleta'].includes(tipo))return fail('Selecciona una venta y tipo de comprobante.')
 try{
  const {getSupabase}=await import('@/lib/data/supabase')
  const sb=getSupabase()
  const {data:comprobanteId,error}=await sb.rpc('crear_comprobante_desde_venta',{p_venta_id:venta_id,p_tipo:tipo})
  if(error)throw new Error(error.message)
  if(!comprobanteId)throw new Error('No se recibió el identificador del comprobante.')
  const invoke=async(name:string,body:Record<string,unknown>)=>{
   const {data,error}=await sb.functions.invoke(name,{body})
   if(error)throw new Error(`${name}: ${error.message}`)
   if(!data?.ok)throw new Error(`${name}: ${data?.error||'la etapa no terminó correctamente'}`)
   return data
  }
  await invoke('sunat-ubl',{comprobante_id:comprobanteId})
  await invoke('sunat-sign',{comprobante_id:comprobanteId})
  await invoke('sunat-zip',{comprobante_id:comprobanteId})
  const beta=await invoke('sunat-beta-send',{comprobante_id:comprobanteId,confirm_beta:true})
  revalidateAll()
  return success(`${tipo==='factura'?'Factura':'Boleta'} creada. UBL firmado, ZIP generado y prueba SUNAT BETA ejecutada${beta.cdr_received?' con CDR recibido':''}. Producción permanece bloqueada.`)
 }catch(e){revalidateAll();return fail(errorMessage(e))}
}
export async function procesarComprobanteBeta(_:ActionState,fd:FormData):Promise<ActionState>{
 const comprobante_id=text(fd,'comprobante_id',64)
 if(!comprobante_id)return fail('Comprobante no válido.')
 try{
  const {getSupabase}=await import('@/lib/data/supabase')
  const sb=getSupabase()
  const invoke=async(name:string,body:Record<string,unknown>)=>{
   const {data,error}=await sb.functions.invoke(name,{body})
   if(error)throw new Error(`${name}: ${error.message}`)
   if(!data?.ok)throw new Error(`${name}: ${data?.error||data?.fault||'la etapa no terminó correctamente'}`)
   return data
  }
  await invoke('sunat-ubl',{comprobante_id})
  await invoke('sunat-sign',{comprobante_id})
  await invoke('sunat-zip',{comprobante_id})
  const beta=await invoke('sunat-beta-send',{comprobante_id,confirm_beta:true})
  revalidateAll()
  if(beta.accepted===true && String(beta.response_code)==='0' && beta.cdr_received===true){
   return success(`ACEPTADO POR SUNAT BETA · ResponseCode 0 · ${beta.description||'CDR recibido y validado correctamente.'}`)
  }
  const code=beta.response_code!=null?` · ResponseCode ${beta.response_code}`:''
  const detail=beta.description||beta.fault||beta.error||'SUNAT no confirmó la aceptación del comprobante.'
  return fail(`NO ACEPTADO POR SUNAT BETA${code} · ${detail}`)
 }catch(e){revalidateAll();return fail(errorMessage(e))}
}
export async function crearGuiaRemision(_:ActionState,fd:FormData):Promise<ActionState>{
 const venta_id=text(fd,'venta_id',64),tipo=text(fd,'tipo',20),motivo_codigo=text(fd,'motivo_codigo',2),motivo_detalle=text(fd,'motivo_detalle',100),modalidad=text(fd,'modalidad',2)
 const motivos:Record<string,string>={'01':'Venta','14':'Venta sujeta a confirmación del comprador','02':'Compra','04':'Traslado entre establecimientos de la misma empresa','18':'Traslado emisor itinerante CP','08':'Importación','09':'Exportación','19':'Traslado a zona primaria','13':'Otros'}
 if(!venta_id)return fail('Selecciona una venta.')
 if(tipo!=='remitente')return fail('Por ahora esta prueba corresponde a GRE Remitente.')
 if(!motivos[motivo_codigo])return fail('Selecciona un motivo SUNAT válido.')
 if(motivo_codigo==='13'&&!motivo_detalle)return fail('Cuando seleccionas Otros debes especificar el motivo.')
 if(!['01','02'].includes(modalidad))return fail('Selecciona una modalidad SUNAT válida.')
 const partida_ubigeo=text(fd,'partida_ubigeo',6),llegada_ubigeo=text(fd,'llegada_ubigeo',6),peso=money(fd,'peso_bruto')
 if(!/^\d{6}$/.test(partida_ubigeo)||!/^\d{6}$/.test(llegada_ubigeo))return fail('Los ubigeos de partida y llegada deben tener 6 dígitos.')
 if(!(peso>0))return fail('Indica un peso bruto total mayor a cero.')
 const bultosRaw=text(fd,'numero_bultos',10),bultos=bultosRaw?Number(bultosRaw):null
 if(bultos!==null&&(!Number.isInteger(bultos)||bultos<1))return fail('El número de bultos debe ser un entero mayor a cero.')
 if(modalidad==='01'&&!/^\d{11}$/.test(text(fd,'transportista_ruc',11)))return fail('Para transporte público indica el RUC de 11 dígitos del transportista.')
 if(modalidad==='02'&&(!text(fd,'placa',20)||!text(fd,'conductor_documento',20)||!text(fd,'conductor_licencia',30)))return fail('Para transporte privado completa placa, documento y licencia del conductor.')
 if(['08','09','19'].includes(motivo_codigo)&&!text(fd,'documento_aduanero',100))return fail('Para este motivo SUNAT requiere el documento aduanero relacionado.')
 try{
  const {getSupabase}=await import('@/lib/data/supabase')
  const {error}=await getSupabase().rpc('crear_gre_remitente',{
   p_venta_id:venta_id,p_motivo_codigo:motivo_codigo,p_motivo_detalle:motivo_detalle||null,
   p_partida:text(fd,'partida',200),p_partida_ubigeo:partida_ubigeo,p_llegada:text(fd,'llegada',200),p_llegada_ubigeo:llegada_ubigeo,
   p_modalidad:modalidad,p_transportista_ruc:text(fd,'transportista_ruc',20),p_transportista_nombre:text(fd,'transportista_nombre',120),
   p_placa:text(fd,'placa',20),p_conductor_documento:text(fd,'conductor_documento',20),p_conductor_licencia:text(fd,'conductor_licencia',30),
   p_fecha:text(fd,'fecha',10)||null,p_peso_bruto:peso,p_documento_aduanero:text(fd,'documento_aduanero',100)||null,
   p_numero_contenedor:text(fd,'numero_contenedor',17)||null,p_numero_bultos:bultos,p_numero_precinto:text(fd,'numero_precinto',50)||null
  })
  if(error)throw new Error(error.message)
 }catch(e){return fail(errorMessage(e))}
 revalidateAll();return success('GRE Remitente registrada como pendiente. Aún no ha sido enviada a SUNAT.')
}


export async function generarGreUbl(fd:FormData):Promise<void>{
 const guia_id=text(fd,'guia_id',64)
 if(!guia_id) return
 try{
  const {getSupabase}=await import('@/lib/data/supabase')
  const sb=getSupabase()
  const {data,error}=await sb.functions.invoke('sunat-gre-ubl',{body:{guia_id}})
  if(error)throw new Error(error.message)
  if(!data?.ok)throw new Error(data?.error||'No se pudo generar el XML GRE.')
 }catch(e){console.error('generarGreUbl',errorMessage(e))}
 revalidatePath('/guias-remision')
}


export async function firmarGre(fd:FormData):Promise<void>{
 const guia_id=text(fd,'guia_id',64)
 if(!guia_id)return
 try{
  const {getSupabase}=await import('@/lib/data/supabase')
  const {data,error}=await getSupabase().functions.invoke('sunat-gre-sign',{body:{guia_id}})
  if(error)throw new Error(error.message)
  if(!data?.ok||data?.local_verified!==true)throw new Error(data?.detail||data?.error||'La firma GRE no pudo validarse localmente.')
 }catch(e){console.error('firmarGre',errorMessage(e))}
 revalidatePath('/guias-remision')
}


export async function generarGreZip(fd:FormData):Promise<void>{
 const guia_id=text(fd,'guia_id',64)
 if(!guia_id)return
 try{
  const {getSupabase}=await import('@/lib/data/supabase')
  const {data,error}=await getSupabase().functions.invoke('sunat-gre-zip',{body:{guia_id}})
  if(error)throw new Error(error.message)
  if(!data?.ok)throw new Error(data?.detail||data?.error||'No se pudo generar el ZIP GRE.')
 }catch(e){console.error('generarGreZip',errorMessage(e))}
 revalidatePath('/guias-remision')
}

create function public.crear_nota_credito_produccion(p_referencia uuid,p_descripcion text) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.comprobantes%rowtype; s text; c bigint; result uuid;
begin
 if not exists(select 1 from public.perfiles_usuario where id=auth.uid() and activo and rol_codigo in ('A','B')) then raise exception 'Acceso no autorizado'; end if;
 if length(trim(p_descripcion))<5 or length(p_descripcion)>200 then raise exception 'Describe el motivo de anulación'; end if;
 select * into r from public.comprobantes where id=p_referencia for update;
 if not found or r.tipo not in ('factura','boleta') or r.estado_sunat<>'ACEPTADO' or not exists(select 1 from public.cpe_production_jobs where comprobante_id=r.id and state='ACEPTADO' and cdr_path is not null) then raise exception 'Se requiere un comprobante aceptado en producción'; end if;
 if exists(select 1 from public.comprobantes where comprobante_referencia_id=r.id and estado_sunat<>'RECHAZADO') then raise exception 'Ya existe una nota para esta operación'; end if;
 s:=case when r.tipo='factura' then 'FC01' else 'BC01' end;
 perform pg_advisory_xact_lock(hashtext('comprobante-'||s));
 select coalesce(max(correlativo),0)+1 into c from public.comprobantes where serie=s;
 insert into public.comprobantes(venta_id,tipo,serie,correlativo,cliente_nombre,cliente_documento,subtotal,descuento,valor_venta,igv,total,comprobante_referencia_id,motivo_codigo,motivo_descripcion)
 values(r.venta_id,'nota_credito',s,c,r.cliente_nombre,r.cliente_documento,r.subtotal,r.descuento,r.valor_venta,r.igv,r.total,r.id,'01',trim(p_descripcion)) returning id into result;
 return result;
end $$;
revoke all on function public.crear_nota_credito_produccion(uuid,text) from public,anon;
grant execute on function public.crear_nota_credito_produccion(uuid,text) to authenticated;


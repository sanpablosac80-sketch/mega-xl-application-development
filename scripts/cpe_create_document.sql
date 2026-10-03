create or replace function public.crear_comprobante_desde_venta(p_venta_id uuid,p_tipo text) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_id uuid; v_serie text; v_corr bigint; v record;
begin
 if not exists(select 1 from public.perfiles_usuario where id=auth.uid() and activo and rol_codigo in ('A','B')) then raise exception 'Acceso no autorizado'; end if;
 if p_tipo not in ('factura','boleta') then raise exception 'Tipo de comprobante inválido'; end if;
 perform pg_advisory_xact_lock(hashtext('venta-comprobante-'||p_venta_id));
 select ve.*,coalesce(c.nombre,'Cliente general') cliente_nombre,coalesce(c.documento,'') cliente_documento into v from public.ventas ve left join public.clientes c on c.id=ve.cliente_id where ve.id=p_venta_id;
 if not found then raise exception 'Venta no encontrada'; end if;
 if p_tipo='factura' and v.cliente_documento !~ '^[0-9]{11}$' then raise exception 'Para factura el cliente debe tener RUC de 11 dígitos'; end if;
 if exists(select 1 from public.comprobantes where venta_id=p_venta_id and tipo in ('factura','boleta') and estado_sunat not like '%BETA%' and estado_sunat<>'RECHAZADO') then raise exception 'La venta ya tiene un comprobante real registrado'; end if;
 v_serie:=case when p_tipo='factura' then 'F001' else 'B001' end;
 perform pg_advisory_xact_lock(hashtext('comprobante-'||v_serie));
 select coalesce(max(correlativo),0)+1 into v_corr from public.comprobantes where serie=v_serie;
 insert into public.comprobantes(venta_id,tipo,serie,correlativo,cliente_nombre,cliente_documento,subtotal,descuento,valor_venta,igv,total)
 values(p_venta_id,p_tipo,v_serie,v_corr,v.cliente_nombre,v.cliente_documento,v.subtotal,v.descuento,v.valor_venta,v.igv,v.total) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.crear_comprobante_desde_venta(uuid,text) from public,anon;
grant execute on function public.crear_comprobante_desde_venta(uuid,text) to authenticated;


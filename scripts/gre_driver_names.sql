-- Applied with Supabase apply_migration: gre_driver_names.
alter table public.guias_remision
 add column if not exists conductor_nombres text,
 add column if not exists conductor_apellidos text;
create or replace function public.crear_gre_remitente_v2(p_payload jsonb)
returns uuid language plpgsql set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from perfiles_usuario where id=auth.uid() and activo and rol_codigo in ('A','B','C')) then
  raise exception 'Acceso no autorizado';
 end if;
 if p_payload->>'p_modalidad'='02' and (coalesce(trim(p_payload->>'p_conductor_nombres'),'')='' or coalesce(trim(p_payload->>'p_conductor_apellidos'),'')='') then
  raise exception 'Completa nombres y apellidos del conductor';
 end if;
 v_id:=public.crear_gre_remitente(
  (p_payload->>'p_venta_id')::uuid,p_payload->>'p_motivo_codigo',p_payload->>'p_motivo_detalle',
  p_payload->>'p_partida',p_payload->>'p_partida_ubigeo',p_payload->>'p_llegada',p_payload->>'p_llegada_ubigeo',
  p_payload->>'p_modalidad',p_payload->>'p_transportista_ruc',p_payload->>'p_transportista_nombre',
  p_payload->>'p_placa',p_payload->>'p_conductor_documento',p_payload->>'p_conductor_licencia',
  (p_payload->>'p_fecha')::date,(p_payload->>'p_peso_bruto')::numeric,p_payload->>'p_documento_aduanero',
  p_payload->>'p_numero_contenedor',(p_payload->>'p_numero_bultos')::integer,p_payload->>'p_numero_precinto');
 update public.guias_remision set conductor_nombres=nullif(trim(p_payload->>'p_conductor_nombres'),''),
  conductor_apellidos=nullif(trim(p_payload->>'p_conductor_apellidos'),'') where id=v_id;
 return v_id;
end $$;
revoke all on function public.crear_gre_remitente_v2(jsonb) from public,anon;
grant execute on function public.crear_gre_remitente_v2(jsonb) to authenticated;

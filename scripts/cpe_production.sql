create table public.cpe_production_jobs (
 comprobante_id uuid primary key references public.comprobantes(id),
 actor_id uuid not null references auth.users(id),
 state text not null default 'PREPARADO',
 document_name text not null,
 submission_name text not null unique,
 submission_method text not null check(submission_method in ('sendBill','sendSummary')),
 xml_path text not null,
 zip_path text not null,
 xml_hash text not null,
 approved_hash text,
 ticket text unique,
 cdr_path text,
 response_code text,
 message text,
 created_at timestamptz not null default now(),
 approved_at timestamptz,
 sent_at timestamptz,
 responded_at timestamptz
);
alter table public.cpe_production_jobs enable row level security;
revoke all on public.cpe_production_jobs from public,anon,authenticated;
grant all on public.cpe_production_jobs to service_role;
grant select on public.cpe_production_jobs to authenticated;
create policy cpe_jobs_staff_read on public.cpe_production_jobs for select to authenticated using(exists(select 1 from public.perfiles_usuario p where p.id=(select auth.uid()) and p.activo and p.rol_codigo in ('A','B','D')));
create sequence public.cpe_summary_sequence;
revoke all on sequence public.cpe_summary_sequence from public,anon,authenticated;
grant usage on sequence public.cpe_summary_sequence to service_role;
create function public.next_cpe_summary_number() returns bigint language sql security invoker set search_path=public,pg_temp as $$select nextval('public.cpe_summary_sequence')$$;
revoke all on function public.next_cpe_summary_number() from public,anon,authenticated;
grant execute on function public.next_cpe_summary_number() to service_role;
create function public.guard_production_comprobante() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if current_user not in ('postgres','service_role') and (coalesce(old.estado_sunat,'') in ('PREPARADO_PRODUCCION','ENVIANDO','PROCESANDO','ENVIO_INCIERTO','ACEPTADO','RECHAZADO') or coalesce(new.estado_sunat,'') in ('PREPARADO_PRODUCCION','ENVIANDO','PROCESANDO','ENVIO_INCIERTO','ACEPTADO','RECHAZADO')) then raise exception 'Comprobante de producción protegido'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger protect_production_comprobante before insert or update or delete on public.comprobantes for each row execute function public.guard_production_comprobante();


-- Applied with Supabase apply_migration: gre_rest_tracking.
alter table public.guias_remision
 add column if not exists sunat_ticket text,
 add column if not exists cdr_path text,
 add column if not exists gre_environment text,
 add column if not exists gre_zip_hash text;
create unique index if not exists guias_sunat_ticket_unique on public.guias_remision(sunat_ticket) where sunat_ticket is not null;

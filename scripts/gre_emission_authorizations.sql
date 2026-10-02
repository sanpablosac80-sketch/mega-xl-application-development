-- Per-guide authorization binds the approver to the reviewed signed XML.
create table if not exists public.gre_emission_authorizations (
 guia_id uuid primary key references public.guias_remision(id),
 actor_id uuid not null references auth.users(id),
 xml_sha256 text not null check (xml_sha256 ~ '^[0-9a-f]{64}$'),
 approved_at timestamptz not null default now()
);
alter table public.gre_emission_authorizations enable row level security;
revoke all on public.gre_emission_authorizations from public,anon,authenticated;
grant all on public.gre_emission_authorizations to service_role;

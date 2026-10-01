-- MEGA XL: esquema de base de datos para Supabase
create extension if not exists pgcrypto;

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  nombre text not null,
  presentacion text not null default 'Unidad',
  categoria text not null default 'General',
  unidades integer not null default 1 check (unidades > 0),
  precio_venta numeric(12,2) not null default 0 check (precio_venta >= 0),
  precio_costo numeric(12,2) not null default 0 check (precio_costo >= 0),
  stock_minimo integer not null default 0 check (stock_minimo >= 0),
  stock_actual integer not null default 0 check (stock_actual >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  documento text not null default '',
  telefono text not null default '',
  email text not null default '',
  direccion text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'salida')),
  cantidad integer not null check (cantidad > 0),
  motivo text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  cliente_id uuid references public.clientes(id) on delete set null,
  metodo_pago text not null default 'Efectivo',
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  producto_nombre text not null,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null,
  subtotal numeric(12,2) not null
);

create table if not exists public.configuracion (
  id integer primary key default 1 check (id = 1),
  nombre_empresa text not null default 'MEGA XL',
  ruc text not null default '',
  direccion text not null default '',
  telefono text not null default '',
  email text not null default '',
  simbolo_moneda text not null default 'S/'
);

insert into public.configuracion (id) values (1) on conflict (id) do nothing;

create index if not exists movimientos_created_at_idx on public.movimientos (created_at desc);
create index if not exists ventas_created_at_idx on public.ventas (created_at desc);
create index if not exists venta_items_venta_idx on public.venta_items (venta_id);

-- Registro atómico de entradas/salidas de inventario
create or replace function public.registrar_movimiento(
  p_producto_id uuid, p_tipo text, p_cantidad integer, p_motivo text
) returns void language plpgsql as $$
declare v_stock integer;
begin
  if p_cantidad is null or p_cantidad <= 0 or p_cantidad > 10000 then
    raise exception 'Cantidad inválida';
  end if;
  if p_tipo not in ('entrada', 'salida') then
    raise exception 'Tipo de movimiento inválido';
  end if;

  select stock_actual into v_stock from public.productos where id = p_producto_id for update;
  if not found then raise exception 'Producto no encontrado'; end if;
  if p_tipo = 'salida' and v_stock < p_cantidad then
    raise exception 'Stock insuficiente. Disponible: %', v_stock;
  end if;

  update public.productos
    set stock_actual = stock_actual + case when p_tipo = 'entrada' then p_cantidad else -p_cantidad end
    where id = p_producto_id;

  insert into public.movimientos (producto_id, tipo, cantidad, motivo)
    values (p_producto_id, p_tipo, p_cantidad, coalesce(p_motivo, ''));
end; $$;

-- Registro atómico de ventas: precios calculados en el servidor
create or replace function public.registrar_venta(
  p_cliente_id uuid, p_metodo_pago text, p_items jsonb
) returns uuid language plpgsql as $$
declare
  v_venta_id uuid;
  v_numero bigint;
  v_total numeric(12,2) := 0;
  r record;
  p record;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un producto';
  end if;

  insert into public.ventas (cliente_id, metodo_pago)
    values (p_cliente_id, p_metodo_pago)
    returning id, numero into v_venta_id, v_numero;

  for r in
    select (e->>'producto_id')::uuid as producto_id, sum((e->>'cantidad')::integer) as cantidad
    from jsonb_array_elements(p_items) e
    group by 1
  loop
    if r.cantidad is null or r.cantidad <= 0 or r.cantidad > 10000 then
      raise exception 'Cantidad inválida';
    end if;

    select id, nombre, precio_venta, stock_actual into p
      from public.productos where id = r.producto_id for update;
    if not found then raise exception 'Uno de los productos ya no existe'; end if;
    if p.stock_actual < r.cantidad then
      raise exception 'Stock insuficiente para %. Disponible: %', p.nombre, p.stock_actual;
    end if;

    update public.productos set stock_actual = stock_actual - r.cantidad where id = p.id;
    insert into public.venta_items (venta_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal)
      values (v_venta_id, p.id, p.nombre, r.cantidad, p.precio_venta, round(r.cantidad * p.precio_venta, 2));
    insert into public.movimientos (producto_id, tipo, cantidad, motivo)
      values (p.id, 'salida', r.cantidad, 'Venta #' || v_numero);
    v_total := v_total + round(r.cantidad * p.precio_venta, 2);
  end loop;

  update public.ventas set total = v_total where id = v_venta_id;
  return v_venta_id;
end; $$;

-- Seguridad: RLS habilitado. Estas políticas permiten acceso a la app sin login.
-- Al agregar autenticación, reemplázalas por políticas basadas en auth.uid().
alter table public.productos enable row level security;
alter table public.clientes enable row level security;
alter table public.movimientos enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_items enable row level security;
alter table public.configuracion enable row level security;

do $$
declare t text;
begin
  foreach t in array array['productos','clientes','movimientos','ventas','venta_items','configuracion'] loop
    execute format('drop policy if exists app_access on public.%I', t);
    execute format('create policy app_access on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ============================================================
-- Tabla: {{TABLA}}   (multi-tenant, club-scoped)
-- Idempotente: seguro de re-ejecutar sobre bases existentes.
-- ============================================================

-- 1. Tabla
create table if not exists public.{{TABLA}} (
  id         bigint generated always as identity primary key,
  club_id    bigint not null references public.clubs(id) on delete cascade,
  -- {{COLUMNAS_DE_NEGOCIO}}  ej:
  -- member_id bigint not null references public.socios(id) on delete cascade,
  -- fecha     date not null,
  -- valor     numeric(10,2) not null default 0 check (valor >= 0),
  created_at timestamptz not null default now()
);

-- 2. Columnas idempotentes (para bases que ya tenían la tabla)
alter table public.{{TABLA}}
  add column if not exists club_id bigint references public.clubs(id) on delete cascade;
  -- add column if not exists {{COLUMNA}} {{TIPO}};

-- 3. Índices
create index if not exists idx_{{TABLA}}_club_id on public.{{TABLA}}(club_id);
-- create index if not exists idx_{{TABLA}}_{{COLUMNA}} on public.{{TABLA}}({{COLUMNA}});

-- 4. RLS
alter table public.{{TABLA}} enable row level security;

drop policy if exists "Club scoped {{TABLA}}" on public.{{TABLA}};
create policy "Club scoped {{TABLA}}"
on public.{{TABLA}}
for all
to authenticated
using (club_id = public.current_club_id() or public.is_superadmin())
with check (club_id = public.current_club_id() or public.is_superadmin());

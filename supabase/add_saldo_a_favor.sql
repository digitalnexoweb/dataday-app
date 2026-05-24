-- Migración: tabla saldo_a_favor
-- Registra créditos acumulados por cada socio (pagos parciales o excedentes).
-- Ejecutar en el SQL Editor de Supabase.

create table if not exists public.saldo_a_favor (
  id          bigint generated always as identity primary key,
  member_id   bigint not null references public.socios(id) on delete cascade,
  club_id     bigint not null references public.clubs(id) on delete cascade,
  amount      numeric(10, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists saldo_a_favor_member_id_idx on public.saldo_a_favor(member_id);
create index if not exists saldo_a_favor_club_id_idx   on public.saldo_a_favor(club_id);

-- RLS: misma política que pagos
alter table public.saldo_a_favor enable row level security;

create policy "Club staff can manage their credits"
  on public.saldo_a_favor
  for all
  using (
    club_id in (
      select club_id from public.profiles where id = auth.uid()
    )
  );

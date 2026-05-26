create extension if not exists pgcrypto;

create table if not exists public.clubs (
  id bigint generated always as identity primary key,
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  id bigint generated always as identity primary key,
  full_name text not null,
  email text not null,
  club_name text not null,
  phone text,
  message text,
  status text not null default 'pending',
  club_id bigint references public.clubs(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  club_id bigint references public.clubs(id) on delete set null,
  role text not null default 'staff',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categorias (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  monthly_fee numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.socios (
  id bigint generated always as identity primary key,
  full_name text not null,
  birth_date date,
  address text,
  phone text,
  email text,
  enrollment_date date not null default current_date,
  category_id bigint references public.categorias(id) on delete set null,
  notes text,
  photo_url text,
  active boolean not null default true,
  saldo_a_favor numeric(10, 2) not null default 0
    check (saldo_a_favor >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.pagos (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.socios(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null check (year between 2024 and 2100),
  amount numeric(10, 2) not null check (amount >= 0),
  payment_method text not null check (
    payment_method in ('Efectivo', 'Transferencia', 'Mercado Pago', 'Otro')
  ),
  payment_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  unique (member_id, month, year)
);

create table if not exists public.medical_records (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.socios(id) on delete cascade,
  club_id bigint references public.clubs(id) on delete cascade,
  restricciones_medicas text,
  enfermedades text,
  alergias text,
  medicacion_actual text,
  antecedentes_medicos text,
  lesiones text,
  contacto_emergencia text,
  telefono_emergencia text,
  observaciones_medicas text,
  apto_fisico boolean not null default false,
  vencimiento_apto_fisico date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id)
);

create table if not exists public.saldo_a_favor (
  id           bigint generated always as identity primary key,
  member_id    bigint not null references public.socios(id) on delete cascade,
  club_id      bigint not null references public.clubs(id) on delete cascade,
  amount       numeric(10, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  notes        text not null default '',
  created_at   timestamptz not null default now()
);

alter table public.access_requests
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists club_name text,
  add column if not exists phone text,
  add column if not exists message text,
  add column if not exists status text default 'pending',
  add column if not exists club_id bigint references public.clubs(id) on delete set null,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists created_at timestamptz default now();

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists club_id bigint references public.clubs(id) on delete set null,
  add column if not exists role text default 'staff',
  add column if not exists approved boolean default false,
  add column if not exists created_at timestamptz default now();

alter table public.clubs
  add column if not exists name text,
  add column if not exists logo_url text,
  add column if not exists created_at timestamptz default now();

alter table public.categorias
  add column if not exists club_id bigint references public.clubs(id) on delete cascade,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists monthly_fee numeric(10, 2) default 0,
  add column if not exists created_at timestamptz default now();

alter table public.socios
  add column if not exists club_id bigint references public.clubs(id) on delete cascade,
  add column if not exists full_name text,
  add column if not exists birth_date date,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists enrollment_date date default current_date,
  add column if not exists category_id bigint references public.categorias(id) on delete set null,
  add column if not exists notes text,
  add column if not exists photo_url text,
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now();

alter table public.pagos
  add column if not exists club_id bigint references public.clubs(id) on delete cascade,
  add column if not exists member_id bigint references public.socios(id) on delete cascade,
  add column if not exists month int,
  add column if not exists year int,
  add column if not exists amount numeric(10, 2),
  add column if not exists payment_method text,
  add column if not exists payment_date date default current_date,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now();

alter table public.medical_records
  add column if not exists member_id bigint references public.socios(id) on delete cascade,
  add column if not exists club_id bigint references public.clubs(id) on delete cascade,
  add column if not exists restricciones_medicas text,
  add column if not exists enfermedades text,
  add column if not exists alergias text,
  add column if not exists medicacion_actual text,
  add column if not exists antecedentes_medicos text,
  add column if not exists lesiones text,
  add column if not exists contacto_emergencia text,
  add column if not exists telefono_emergencia text,
  add column if not exists observaciones_medicas text,
  add column if not exists apto_fisico boolean default false,
  add column if not exists vencimiento_apto_fisico date,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.access_requests
  alter column full_name set not null,
  alter column email set not null,
  alter column club_name set not null,
  alter column status set default 'pending',
  alter column created_at set default now();

alter table public.profiles
  alter column email set not null,
  alter column role set default 'staff',
  alter column approved set default false,
  alter column created_at set default now();

alter table public.clubs
  alter column name set not null,
  alter column created_at set default now();

alter table public.categorias
  alter column name set not null,
  alter column monthly_fee set default 0,
  alter column created_at set default now();

alter table public.socios
  alter column full_name set not null,
  alter column enrollment_date set default current_date,
  alter column active set default true,
  alter column created_at set default now();

alter table public.pagos
  alter column payment_date set default current_date,
  alter column created_at set default now();

alter table public.medical_records
  alter column apto_fisico set default false,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.access_requests
  drop constraint if exists access_requests_status_check;

alter table public.access_requests
  add constraint access_requests_status_check
  check (status in ('pending', 'approved', 'rejected'));

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('superadmin', 'admin', 'staff'));

create index if not exists idx_access_requests_status on public.access_requests(status);
create index if not exists idx_access_requests_email on public.access_requests(email);
create index if not exists idx_profiles_club_id on public.profiles(club_id);
create index if not exists idx_socios_category_id on public.socios(category_id);
create index if not exists idx_socios_club_id on public.socios(club_id);
create index if not exists idx_pagos_member_id on public.pagos(member_id);
create index if not exists idx_pagos_club_id on public.pagos(club_id);
create index if not exists idx_pagos_year_month on public.pagos(year, month);
create index if not exists idx_categorias_club_id on public.categorias(club_id);
create unique index if not exists idx_categorias_club_name on public.categorias(club_id, name);
create index if not exists idx_medical_records_member_id on public.medical_records(member_id);
create index if not exists idx_medical_records_club_id on public.medical_records(club_id);
create index if not exists idx_saldo_a_favor_member_id on public.saldo_a_favor(member_id);
create index if not exists idx_saldo_a_favor_club_id   on public.saldo_a_favor(club_id);

create or replace function public.set_medical_record_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_medical_record_updated_at on public.medical_records;
create trigger set_medical_record_updated_at
  before update on public.medical_records
  for each row execute procedure public.set_medical_record_updated_at();

create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '');
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and approved = true
      and role = 'superadmin'
      and email = 'digitalnexoweb@gmail.com'
  );
$$;

create or replace function public.current_club_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select club_id
  from public.profiles
  where id = auth.uid()
    and approved = true;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_request public.access_requests;
begin
  if new.email = 'digitalnexoweb@gmail.com' then
    insert into public.profiles (id, email, full_name, club_id, role, approved)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name', 'DigitalNexo'),
      null,
      'superadmin',
      true
    )
    on conflict (id) do update
      set email = excluded.email,
          full_name = excluded.full_name,
          role = 'superadmin',
          approved = true;

    return new;
  end if;

  select *
  into matched_request
  from public.access_requests
  where email = new.email
    and status = 'approved'
  order by created_at desc
  limit 1;

  if found then
    insert into public.profiles (id, email, full_name, club_id, role, approved)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name', matched_request.full_name),
      matched_request.club_id,
      'admin',
      true
    )
    on conflict (id) do update
      set email = excluded.email,
          full_name = excluded.full_name,
          club_id = excluded.club_id,
          role = 'admin',
          approved = true;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

alter table public.access_requests enable row level security;
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.categorias enable row level security;
alter table public.socios enable row level security;
alter table public.pagos enable row level security;
alter table public.medical_records enable row level security;
alter table public.saldo_a_favor enable row level security;

drop policy if exists "Public can create access requests" on public.access_requests;
create policy "Public can create access requests"
on public.access_requests
for insert
to anon, authenticated
with check (status = 'pending');

drop policy if exists "Superadmin can view access requests" on public.access_requests;
create policy "Superadmin can view access requests"
on public.access_requests
for select
to authenticated
using (public.is_superadmin());

drop policy if exists "Superadmin can update access requests" on public.access_requests;
create policy "Superadmin can update access requests"
on public.access_requests
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Superadmin can view profiles" on public.profiles;
create policy "Superadmin can view profiles"
on public.profiles
for select
to authenticated
using (public.is_superadmin());

drop policy if exists "Superadmin can manage profiles" on public.profiles;
create policy "Superadmin can manage profiles"
on public.profiles
for all
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Approved users can view own club" on public.clubs;
create policy "Approved users can view own club"
on public.clubs
for select
to authenticated
using (id = public.current_club_id() or public.is_superadmin());

drop policy if exists "Approved admins can update own club" on public.clubs;
create policy "Approved admins can update own club"
on public.clubs
for update
to authenticated
using (id = public.current_club_id())
with check (id = public.current_club_id());

drop policy if exists "Superadmin can manage clubs" on public.clubs;
create policy "Superadmin can manage clubs"
on public.clubs
for all
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Club scoped categorias" on public.categorias;
create policy "Club scoped categorias"
on public.categorias
for all
to authenticated
using (club_id = public.current_club_id() or public.is_superadmin())
with check (club_id = public.current_club_id() or public.is_superadmin());

drop policy if exists "Club scoped socios" on public.socios;
create policy "Club scoped socios"
on public.socios
for all
to authenticated
using (club_id = public.current_club_id() or public.is_superadmin())
with check (club_id = public.current_club_id() or public.is_superadmin());

drop policy if exists "Club scoped pagos" on public.pagos;
create policy "Club scoped pagos"
on public.pagos
for all
to authenticated
using (club_id = public.current_club_id() or public.is_superadmin())
with check (club_id = public.current_club_id() or public.is_superadmin());

drop policy if exists "Club scoped medical records" on public.medical_records;
create policy "Club scoped medical records"
on public.medical_records
for all
to authenticated
using (club_id = public.current_club_id() or public.is_superadmin())
with check (club_id = public.current_club_id() or public.is_superadmin());

drop policy if exists "Club staff can manage their credits" on public.saldo_a_favor;
drop policy if exists "Club scoped saldo_a_favor" on public.saldo_a_favor;
create policy "Club scoped saldo_a_favor"
on public.saldo_a_favor
for all
to authenticated
using (club_id = public.current_club_id() or public.is_superadmin())
with check (club_id = public.current_club_id() or public.is_superadmin());

-- ============================================================
-- Migration: columna socios.saldo_a_favor + RPC atomico
-- Idempotente: seguro de re-ejecutar en bases existentes.
-- La tabla saldo_a_favor, sus indices, RLS y politicas ya
-- estan definidos arriba en el schema principal.
-- ============================================================

-- 1. Columna de saldo en socios (fuente de verdad para el RPC)
alter table public.socios
  add column if not exists saldo_a_favor numeric(10,2) not null default 0
  check (saldo_a_favor >= 0);

-- 2. Migrar datos existentes de la tabla saldo_a_favor al nuevo campo
update public.socios s
set saldo_a_favor = coalesce((
  select sum(sf.amount)
  from public.saldo_a_favor sf
  where sf.member_id = s.id
), 0)
where exists (
  select 1 from public.saldo_a_favor sf where sf.member_id = s.id
);

-- 3. Funcion RPC de registro atomico de pagos
create or replace function public.registrar_pago_con_credito(
  p_member_id      bigint,
  p_amount         numeric,
  p_payment_method text,
  p_payment_date   date,
  p_club_id        bigint,
  p_notes          text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_monthly_fee    numeric;
  v_saldo          numeric;
  v_remaining      numeric;
  v_earliest       date;
  v_period_row     record;
  v_new_saldo      numeric := 0;
  v_periods_covered int := 0;
  v_is_partial     boolean := false;
  v_partial_m      int;
  v_partial_y      int;
  v_fut            date;
  v_fut_m          int;
  v_fut_y          int;
  v_needed         numeric;
begin
  -- Verificacion de autorización
  if not (public.current_club_id() = p_club_id or public.is_superadmin()) then
    raise exception 'No autorizado para el club %', p_club_id;
  end if;

  -- Datos del socio: cuota mensual, saldo actual, fecha mas antigua cobrable
  select
    coalesce(cat.monthly_fee, 0),
    coalesce(s.saldo_a_favor, 0),
    greatest(s.enrollment_date, (current_date - interval '3 years')::date)
  into v_monthly_fee, v_saldo, v_earliest
  from public.socios s
  left join public.categorias cat on cat.id = s.category_id
  where s.id = p_member_id;

  if not found then
    raise exception 'Socio % no encontrado', p_member_id;
  end if;

  v_remaining := p_amount + v_saldo;

  -- Socio sin cuota: registrar en el mes actual y salir
  if v_monthly_fee <= 0 then
    insert into public.pagos(member_id, club_id, month, year, amount, payment_method, payment_date, notes)
    values (
      p_member_id, p_club_id,
      extract(month from p_payment_date)::int,
      extract(year from p_payment_date)::int,
      p_amount, p_payment_method, p_payment_date, p_notes
    )
    on conflict (member_id, month, year) do nothing;
    return jsonb_build_object('months_covered', 1, 'credit_remainder', 0, 'is_partial', false);
  end if;

  -- Iterar sobre periodos pendientes (mas antiguo primero), incluyendo los parcialmente pagados
  for v_period_row in
    select
      extract(month from d)::int as m,
      extract(year  from d)::int as y,
      coalesce((
        select p2.amount
        from public.pagos p2
        where p2.member_id = p_member_id
          and p2.month = extract(month from d)::int
          and p2.year  = extract(year  from d)::int
      ), 0) as already_paid
    from generate_series(
      date_trunc('month', v_earliest::timestamptz),
      date_trunc('month', current_date::timestamptz),
      interval '1 month'
    ) d
    where not exists (
      select 1 from public.pagos p2
      where p2.member_id = p_member_id
        and p2.month  = extract(month from d)::int
        and p2.year   = extract(year  from d)::int
        and p2.amount >= v_monthly_fee
    )
    order by d
  loop
    v_needed := v_monthly_fee - v_period_row.already_paid;

    if v_remaining >= v_needed then
      -- Cubrir periodo completo
      v_remaining       := v_remaining - v_needed;
      v_periods_covered := v_periods_covered + 1;

      insert into public.pagos(member_id, club_id, month, year, amount, payment_method, payment_date, notes)
      values (p_member_id, p_club_id, v_period_row.m, v_period_row.y,
              v_monthly_fee, p_payment_method, p_payment_date, p_notes)
      on conflict (member_id, month, year)
        do update set
          amount       = v_monthly_fee,
          payment_date = excluded.payment_date,
          notes        = excluded.notes;
    else
      -- Pago parcial: acumular lo que queda sobre este periodo
      if v_remaining > 0 then
        v_is_partial := true;
        v_partial_m  := v_period_row.m;
        v_partial_y  := v_period_row.y;

        insert into public.pagos(member_id, club_id, month, year, amount, payment_method, payment_date, notes)
        values (p_member_id, p_club_id, v_period_row.m, v_period_row.y,
                v_period_row.already_paid + v_remaining, p_payment_method, p_payment_date, p_notes)
        on conflict (member_id, month, year)
          do update set
            amount       = excluded.amount,
            payment_date = excluded.payment_date,
            notes        = excluded.notes;

        v_remaining := 0;
      end if;
      exit;
    end if;
  end loop;

  -- Cubrir meses futuros con el sobrante (solo si se cubrieron periodos completos)
  if v_remaining >= v_monthly_fee then
    v_fut := date_trunc('month', current_date::timestamptz + interval '1 month');
    while v_remaining >= v_monthly_fee
      and v_fut < (current_date::timestamptz + interval '37 months')
    loop
      v_fut_m := extract(month from v_fut)::int;
      v_fut_y := extract(year  from v_fut)::int;

      if not exists (
        select 1 from public.pagos p2
        where p2.member_id = p_member_id and p2.month = v_fut_m and p2.year = v_fut_y
      ) then
        insert into public.pagos(member_id, club_id, month, year, amount, payment_method, payment_date, notes)
        values (p_member_id, p_club_id, v_fut_m, v_fut_y,
                v_monthly_fee, p_payment_method, p_payment_date, p_notes)
        on conflict (member_id, month, year) do nothing;

        v_remaining       := v_remaining - v_monthly_fee;
        v_periods_covered := v_periods_covered + 1;
      end if;

      v_fut := v_fut + interval '1 month';
    end loop;
  end if;

  -- Nuevo saldo: en pago parcial v_remaining ya es 0 (consumido) y v_saldo fue sumado al inicio,
  -- por lo que el saldo previo queda consumido. En pago completo el sobrante es el nuevo saldo.
  v_new_saldo := case when v_is_partial then 0 else round(v_remaining * 100) / 100 end;

  -- Actualizar columna en socios
  update public.socios set saldo_a_favor = v_new_saldo where id = p_member_id;

  -- Sincronizar tabla saldo_a_favor (para historial y lectura del frontend)
  delete from public.saldo_a_favor where member_id = p_member_id and club_id = p_club_id;
  if v_new_saldo > 0 then
    insert into public.saldo_a_favor(member_id, club_id, amount, payment_date, notes)
    values (p_member_id, p_club_id, v_new_saldo, p_payment_date,
            case when v_is_partial then 'Abono parcial' else 'Saldo a favor automatico' end);
  end if;

  return jsonb_build_object(
    'months_covered',  v_periods_covered,
    'credit_remainder', v_new_saldo,
    'is_partial',      v_is_partial,
    'partial_month',   v_partial_m,
    'partial_year',    v_partial_y
  );
end;
$$;

grant execute on function public.registrar_pago_con_credito to authenticated;

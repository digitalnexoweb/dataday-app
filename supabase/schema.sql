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

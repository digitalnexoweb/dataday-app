---
name: supabase-migracion-club
description: >-
  Genera una migración SQL idempotente para una tabla nueva multi-tenant en DataDay:
  columna club_id con FK a clubs, índices, RLS habilitado y política de aislamiento por
  club usando current_club_id() e is_superadmin(). Usar cuando haya que crear o modificar
  una tabla de negocio en supabase/schema.sql (socios, pagos, categorías y similares).
---

# Skill: Migración Supabase club-scoped

Empaqueta la tarea repetida de crear tablas de negocio en DataDay respetando el patrón
multi-tenant. Toda tabla de negocio DEBE quedar aislada por club vía RLS, no solo por el
frontend.

## Cuándo se dispara

- "Crear la tabla X en Supabase", "nueva tabla de negocio", "agregar entidad al schema".
- Cualquier cambio que agregue una tabla que contenga datos de un club.

## Contexto fijo del proyecto (no desviarse)

- El schema (`supabase/schema.sql`) es **idempotente**: `create table if not exists`,
  `add column if not exists`, `drop policy if exists` antes de `create policy`.
- Ya existen las funciones `security definer`:
  - `public.current_club_id()` → club del usuario aprobado.
  - `public.is_superadmin()` → true solo para el superadmin.
- Patrón obligatorio por tabla de negocio:
  - PK `bigint generated always as identity`.
  - `club_id bigint references public.clubs(id) on delete cascade`.
  - `created_at timestamptz not null default now()`.
  - Índice por `club_id` y por columnas que se filtran/ordenan.
  - `enable row level security` + política `for all` con
    `club_id = public.current_club_id() or public.is_superadmin()`.

## Procedimiento

1. Confirmar el nombre de la tabla (snake_case, plural) y sus columnas de negocio
   (tipo, nullabilidad, defaults, checks, FKs).
2. Tomar `references/plantilla.sql` como base y completar los marcadores.
3. Verificar el checklist de salida.
4. Entregar un único bloque SQL listo para pegar al final de `supabase/schema.sql`.

## Checklist antes de entregar

- [ ] `if not exists` en tabla, columnas e índices (re-ejecutable sin perder datos).
- [ ] Columna `club_id` con FK `on delete cascade`.
- [ ] `enable row level security` presente.
- [ ] Política de aislamiento con `current_club_id() or is_superadmin()` en `using` y `with check`.
- [ ] Nombre de política descriptivo y consistente con el schema (`"Club scoped <tabla>"`).
- [ ] Sin `service_role`, sin `using (true)`, sin desactivar RLS.

## Salida

Solo el SQL, comentado por secciones (tabla · índices · RLS · política). Nada de prosa
fuera del bloque, para que se pueda pegar directo en el schema.

Ver `references/plantilla.sql` para el esqueleto.

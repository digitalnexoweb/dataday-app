# 02 · Migración Supabase club-scoped (tabla + RLS)

**Cuándo usarla:** cada vez que agrego una tabla nueva de negocio. En DataDay toda tabla
lleva `club_id` y RLS por club; es una tarea que se repite y siempre igual.

**Variables:**
- `{{nombre_tabla}}` — nombre en snake_case y plural (ej. `asistencias`)
- `{{columnas}}` — columnas de negocio con tipo y reglas (ej. `fecha date not null, presente boolean not null default false`)
- `{{descripcion}}` — para qué es la tabla

---

## Prompt

```
Actuás como especialista en PostgreSQL y Supabase, con foco en seguridad multi-tenant.

CONTEXTO (patrón fijo de DataDay, seguilo sin desviarte):
- Multi-tenant por club_id. Ya existen las funciones security-definer:
  public.current_club_id() y public.is_superadmin().
- El schema (supabase/schema.sql) es IDEMPOTENTE: usa "create table if not exists",
  "add column if not exists", "drop policy if exists" antes de "create policy".
- Toda tabla de negocio: PK bigint generated always as identity, columna club_id con
  FK a public.clubs(id) on delete cascade, created_at timestamptz default now().
- RLS habilitado y una política "for all" que permite acceso cuando
  club_id = public.current_club_id() OR public.is_superadmin().
- Índices por club_id y por las columnas que se filtran/ordenan.

TAREA:
Generar el SQL de migración para la tabla "{{nombre_tabla}}". {{descripcion}}
Columnas de negocio: {{columnas}}.

RESTRICCIONES:
- SQL idempotente y re-ejecutable sobre una base existente sin borrar datos.
- No desactivar RLS. No usar service_role. No políticas permisivas de más.
- Nombrar las políticas de forma descriptiva y consistente con el schema actual.

FORMATO DE SALIDA:
Un único bloque SQL, comentado por secciones (tabla, índices, enable RLS, políticas),
listo para pegar al final de supabase/schema.sql. Sin explicación fuera del SQL.
```

---

## Ejemplo real (completado)

> `{{nombre_tabla}}=asistencias`, `{{columnas}}=member_id bigint not null references public.socios(id) on delete cascade, fecha date not null, presente boolean not null default false`,
> `{{descripcion}}=Registra la asistencia diaria de cada socio a los entrenamientos`.

Devuelve el `create table if not exists public.asistencias (...)` con `club_id`, los
`create index if not exists`, el `alter table ... enable row level security` y la política
`"Club scoped asistencias"` usando `current_club_id() or is_superadmin()` — idéntico al
patrón de `socios`, `pagos` y `categorias`.

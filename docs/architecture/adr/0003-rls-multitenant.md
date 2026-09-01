# ADR 0003 — Multi-tenant con RLS + funciones security-definer

**Estado:** Aceptada · **Fecha:** desarrollo del proyecto

## Contexto
Una sola instancia atiende a varios clubes. El requisito duro es que **ningún club acceda a
datos de otro**. Confiar solo en filtros del frontend es frágil: cualquier bug o petición
manipulada podría cruzar datos.

## Decisión
Aislar por `club_id` en la **base**: todas las tablas de negocio tienen Row Level Security con
una política que exige `club_id = public.current_club_id() OR public.is_superadmin()`. Esas dos
funciones son `security definer` con `search_path = public` fijado. El scope por club en las
queries del front es UX/optimización; la garantía real es RLS.

## Consecuencias
**Positivas:** defensa en profundidad; aunque el front falle, la base no filtra datos; el
superadmin puede supervisar sin excepciones ad-hoc.
**Negativas / costo:** hay que recordar el patrón (RLS + política) en cada tabla nueva — por eso
existe la skill `supabase-migracion-club` y el subagente `auditor-seguridad`.

## Alternativas descartadas
- **Filtrar solo en el frontend/queries:** inseguro ante bugs o clientes maliciosos.
- **Una base/es­quema por club:** aísla fuerte pero multiplica el costo operativo y las
  migraciones; excesivo para el tamaño actual.

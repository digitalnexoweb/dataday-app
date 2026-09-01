# ADR 0002 — Lógica de pagos en un RPC atómico de Postgres

**Estado:** Aceptada · **Fecha:** desarrollo del proyecto

## Contexto
Registrar un pago no es un insert simple: hay que cubrir períodos vencidos del más antiguo al
más nuevo, soportar pagos parciales, adelantar meses futuros con el sobrante y recalcular el
saldo a favor. Hacerlo con varios inserts desde el cliente arriesga estados inconsistentes y
condiciones de carrera, y expone la regla de negocio del dinero.

## Decisión
Concentrar toda esa lógica en la función `public.registrar_pago_con_credito(...)`
(`supabase/schema.sql`), `security definer`, que el front invoca con `supabase.rpc(...)`.
La función verifica autorización (`current_club_id()` / `is_superadmin()`), itera períodos,
maneja parciales y futuros, y actualiza `socios.saldo_a_favor` y la tabla `saldo_a_favor`, todo
en **una transacción**.

## Consecuencias
**Positivas:** atomicidad y consistencia garantizadas; sin estados a medias; regla de dinero en
el servidor (no manipulable desde el cliente); el front solo pasa monto y método.
**Negativas / costo:** la lógica en PL/pgSQL es menos familiar y más difícil de testear que JS;
el camino mock replica el comportamiento por separado.

## Alternativas descartadas
- **Múltiples inserts/updates desde el cliente:** sin atomicidad, propenso a inconsistencias.
- **Lógica en una Edge Function:** viable, pero suma una llamada de red y latencia; el RPC en la
  misma base es más directo y transaccional.

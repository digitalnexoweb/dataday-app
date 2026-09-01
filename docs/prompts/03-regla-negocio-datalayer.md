# 03 · Regla de negocio en la capa de datos

**Cuándo usarla:** cuando agrego o modifico lógica de negocio que toca datos
(pagos, deuda, saldo a favor, socios) y tengo que respetar el modo dual Supabase/mock.

**Variables:**
- `{{regla}}` — la regla de negocio a implementar
- `{{metodo}}` — método afectado o nuevo en `dataApi.js` (ej. `registerPaymentAndRefresh`)
- `{{involucra_dinero}}` — sí/no (define si debe ir en un RPC de Postgres)

---

## Prompt

```
Actuás como desarrollador senior full-stack de DataDay (React + Supabase/Postgres).

CONTEXTO CRÍTICO:
- src/lib/dataApi.js es la ÚNICA capa de datos. Cada método tiene DOS caminos:
  (a) Supabase, cuando supabaseEnabled && clubId; (b) mock local, en cualquier otro caso.
  Ambos caminos deben devolver la MISMA forma de datos (el front no distingue la fuente).
- La base es snake_case; el front camelCase (normalización dentro de dataApi.js).
- La lógica de DINERO va en el servidor: existe el RPC atómico
  public.registrar_pago_con_credito(...) que cubre períodos vencidos (más antiguo primero),
  pagos parciales, meses futuros y recalcula saldo_a_favor en una sola transacción.
  El front lo invoca con supabase.rpc(...). NO reimplementar lógica de dinero en el cliente
  para el camino Supabase.

TAREA:
Implementar esta regla: {{regla}}
Método afectado: {{metodo}}. ¿Involucra dinero?: {{involucra_dinero}}.

RESTRICCIONES:
- Si involucra dinero y toca el camino Supabase, la lógica va en SQL (RPC), no en JS.
- Mantener idénticas las firmas públicas de dataApi.js salvo que sea imprescindible cambiarlas.
- No romper el modo mock: replicar el comportamiento de forma optimista en JS.
- Conservar el filtrado por club_id.

FORMATO DE SALIDA:
1. Qué cambia y por qué (2-3 líneas).
2. Si aplica: el SQL del RPC (idempotente) para supabase/schema.sql.
3. El diff del/los método(s) de dataApi.js (camino Supabase + camino mock).
4. Casos borde a probar (lista corta).
```

---

## Ejemplo real (completado)

> `{{regla}}=Al registrar un pago que excede la deuda, el sobrante debe adelantar meses futuros y, si aún sobra, quedar como saldo a favor`,
> `{{metodo}}=registerPaymentAndRefresh`, `{{involucra_dinero}}=sí`.

La IA propone mantener el insert en el RPC `registrar_pago_con_credito` (que ya itera
períodos y adelanta futuros), ajustar el cálculo de `v_new_saldo`, y en el camino mock
replicar el reparto en `registerPayment`. Lista casos borde: pago exacto, pago con saldo
previo, socio sin cuota, período parcial preexistente.

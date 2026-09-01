# ADR — Architecture Decision Records

Registro de las decisiones técnicas importantes de DataDay. Cada ADR explica el contexto,
la decisión tomada, sus consecuencias y qué alternativas se descartaron.

| # | Decisión | Estado |
|---|----------|--------|
| [0001](0001-capa-de-datos-dual.md) | Capa de datos dual (Supabase ⇄ mocks) tras un flag | Aceptada |
| [0002](0002-pagos-rpc-atomico.md) | Lógica de pagos en un RPC atómico de Postgres | Aceptada |
| [0003](0003-rls-multitenant.md) | Multi-tenant con RLS + funciones security-definer | Aceptada |
| [0004](0004-routing-manual.md) | Routing manual por estado en vez de librería | Aceptada |
| [0005](0005-acceso-por-aprobacion.md) | Acceso por aprobación con enlaces firmados HMAC | Aceptada |

Formato: contexto → decisión → consecuencias → alternativas.

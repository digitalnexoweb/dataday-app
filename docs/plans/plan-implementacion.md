# Plan de implementación (aprobado) — DataDay

Plan derivado de la spec (`docs/plans/spec-sdd.md`) siguiendo spec-driven development:
primero la spec, luego este plan, y sobre él la implementación. Refleja cómo se construyó el
producto y qué sigue.

## Enfoque

Construir por capas verticales (feature completa de punta a punta) sobre una base multi-tenant
segura, manteniendo siempre la capa de datos única para poder trabajar con o sin backend.

## Fases

### Fase 1 — Núcleo de datos y seguridad (hecho)
- Modelo de datos en Postgres: `clubs`, `profiles`, `socios`, `categorias`, `pagos`,
  `medical_records`, `saldo_a_favor`, `access_requests`.
- RLS por `club_id` + funciones `current_club_id()` e `is_superadmin()`.
- Capa `dataApi.js`/`authApi.js` con modo dual (Supabase/mock).
- **Criterio de aceptación:** un club no ve datos de otro (CA-1).

### Fase 2 — Operación diaria (hecho)
- Gestión de socios y categorías; dashboard con KPIs y vencimientos.
- Registro de pagos con el RPC atómico `registrar_pago_con_credito` (parciales, adelantos,
  saldo a favor); recibo PDF; historial exportable.
- **Criterio de aceptación:** los pagos cierran al centavo (CA-2, CA-3).

### Fase 3 — Acceso y multi-club (hecho)
- Acceso por solicitud + aprobación con Edge Functions y enlaces firmados HMAC.
- Selector de club para el superadmin; recovery de contraseña.
- **Criterio de aceptación:** solicitud aprobada genera activación válida (CA-6).

### Fase 4 — Pulido y despliegue (hecho)
- Rediseño visual (dashboard SaaS), navegación mobile, code-splitting.
- Deploy en Cloudflare Pages; modo mock para demo local (CA-4, CA-5).

## Próximos pasos (post-capstone)
- Feature con IA: recordatorios inteligentes de cuota vencida (ver ADR personal).
- Reportería básica por club.
- Dominio propio y endurecimiento del envío de emails (Resend con dominio verificado).

## Trazabilidad
Cada fase se apoya en decisiones documentadas en `docs/architecture/adr/` y en los diagramas
`docs/architecture/diagramas-c4.md`.

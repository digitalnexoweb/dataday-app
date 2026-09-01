# CLAUDE.md — DataDay Cuotas

Guía para trabajar con Claude Code en este repositorio. Resume qué es el proyecto,
cómo está construido, las convenciones que hay que respetar y las decisiones de
arquitectura que explican por qué el código es como es.

> Este archivo es contexto persistente: se lee al iniciar cada sesión de trabajo
> con IA. Si cambia una decisión importante, se actualiza acá.

---

## 1. Qué es DataDay

Aplicación web SaaS para que clubes amateur, academias deportivas e institutos
gestionen **socios/alumnos, categorías, cuotas y pagos**. Es multi-club: una sola
instancia atiende a varios clubes con datos aislados entre sí. El acceso es por
solicitud + aprobación (no hay registro libre). Operada por DigitalNexo (NexoWeb).

Producción: `https://dataday-app.pages.dev` · Superadmin: `digitalnexoweb@gmail.com`

## 2. Stack

- **Frontend:** React 19 + Vite 7. CSS propio y modular (sin frameworks), en `src/styles/global.css`.
- **Backend:** Supabase — PostgreSQL, Auth, Storage y Edge Functions (Deno/TypeScript).
- **Emails transaccionales:** Resend (desde Edge Functions).
- **Recibos PDF:** jsPDF (en cliente).
- **Deploy:** Cloudflare Pages (build `npm run build`, publish `dist/`).

## 3. Cómo correr el proyecto

```bash
npm install
cp .env.example .env      # completar variables
npm run dev               # http://localhost:5173
```

- Con `VITE_USE_SUPABASE=false` la app corre con **datos mock locales** (sin backend).
- Con `VITE_USE_SUPABASE=true` usa Supabase real (requiere URL y anon key).
- Otros scripts: `npm run build`, `npm run preview`, `npm run lint`, `npm test` (Vitest).

## 4. Mapa del código

```
src/
  app/App.jsx            Estado global, sesión, routing por "view", guards de acceso
  components/            UI reutilizable (Header, Sidebar, MobileNav, StatCard, tablas…)
  features/
    auth/                Login, solicitud de acceso, set/reset de contraseña, biometría
    dashboard/           Dashboard con KPIs y calendario de vencimientos
    members/             Listado tipo CRM, alta/edición, detalle de socio
    payments/            Registrar pago, historial, recibo PDF
    admin/               Revisión de solicitudes de acceso
    settings/            Configuración del club (cuota, día de vencimiento, branding)
  lib/
    supabase.js          Cliente Supabase + flag supabaseEnabled
    dataApi.js           CAPA DE DATOS: única puerta a Supabase / mocks
    authApi.js           Sesión, perfiles, solicitudes de acceso, recovery
    memberUtils.js       Cálculo de deuda, períodos cobrables, plan de pago
    format.js            Estado de cuota, formato de fechas/moneda (es-UY)
    receipt.js           Generación de recibo PDF con jsPDF
supabase/
  schema.sql             Tablas, índices, RLS, funciones security-definer y RPC de pagos
  functions/             Edge Functions (Deno): flujo de solicitud/aprobación de acceso
docs/                    Spec SDD, diagramas C4, ADRs, plantillas de prompts
```

## 5. Convenciones

- **Todo acceso a datos pasa por `src/lib/dataApi.js` o `authApi.js`.** Los componentes
  nunca llaman a `supabase` directo; así el modo mock y el real conviven sin tocar la UI.
- La base usa **snake_case** (`full_name`, `club_id`); el front usa **camelCase**
  (`fullName`, `clubId`). La normalización vive en `dataApi.js` (`normalizeMemberRecord`, etc.).
- **Toda tabla de negocio lleva `club_id`** y se filtra por club, tanto en las queries
  como en las políticas RLS. Nunca escribir una query de negocio sin scope de club.
- Moneda y fechas se formatean en `es-UY` con `Intl`.
- Español en UI, mensajes y comentarios de dominio.

## 6. Decisiones de arquitectura (las importantes)

### Decisión 1 — Capa de datos dual (Supabase ⇄ mocks) detrás de un solo flag
`src/lib/dataApi.js` expone una API de dominio (`getAppData`, `saveMember`,
`registerPaymentAndRefresh`…) y decide por dentro si habla con Supabase o con datos
mock, según `supabaseEnabled` (`VITE_USE_SUPABASE`). Además, si una query a Supabase
falla, cae a mocks en vez de romper la UI.
**Por qué:** permite desarrollar y demostrar la app sin backend, escribir tests sin red,
y aísla a los componentes de la fuente de datos. El costo es mantener dos caminos, que
se acota concentrándolos en un solo archivo.

### Decisión 2 — La lógica de dinero vive en un RPC atómico en Postgres
Registrar un pago no es un simple insert: hay que cubrir períodos vencidos del más
antiguo al más nuevo, soportar pagos parciales, adelantar meses futuros y recalcular el
**saldo a favor**. Todo eso se hace en la función `registrar_pago_con_credito`
(`supabase/schema.sql`), que el front invoca con `supabase.rpc(...)`.
**Por qué:** garantiza consistencia (todo ocurre en una transacción, sin estados a medias
por múltiples inserts desde el cliente), evita condiciones de carrera y mantiene la regla
de negocio del dinero del lado del servidor, donde no se puede manipular.

### Decisión 3 — Multi-tenant con RLS + funciones security-definer
El aislamiento entre clubes no depende solo del front: está en la base. Políticas
**Row Level Security** en cada tabla usan `current_club_id()` e `is_superadmin()`
(funciones `security definer`) para que un usuario solo vea/edite datos de su club, y el
superadmin pueda supervisar todo.
**Por qué:** defensa en profundidad. Aunque el front tuviera un bug, la base no deja
cruzar datos entre clubes. El scope por club en las queries es una optimización/UX;
la garantía real es RLS.

Otras decisiones (detalle en `docs/architecture/adr/`): acceso por aprobación con enlaces firmados
HMAC vía Edge Functions; routing manual por estado en vez de librería de router;
code-splitting de jsPDF y vendor en `vite.config.js`.

## 7. Cosas a tener en cuenta

- No exponer nunca la `service_role` key en el front: solo en Edge Functions.
- El envío de mails de activación puede fallar si Resend usa remitente de prueba; hay un
  fallback "Copiar activación" en la pantalla de Solicitudes.
- `schema.sql` es **idempotente** (usa `if not exists` / `add column if not exists`),
  pensado para correr sobre bases existentes, no solo vacías.

## 8. Documentación del curso (recorrido con IA)

- `docs/prompts/` — plantillas de prompt (prompt engineering) usadas en el proyecto.
- `.claude/skills/` — skill cargable para tareas repetidas.
- `.claude/agents/` — 2 subagentes propios (auditoría de seguridad y revisión de código); `.mcp.json` — MCP de Supabase.
- `docs/plans/spec-sdd.md` — especificación dirigida por spec.
- `docs/architecture/diagramas-c4.md` — diagramas C4 (Mermaid).
- `docs/architecture/adr/` — ADRs técnicos · `docs/plans/adr-personal.md` — plan de carrera 90 días.
- `docs/temas-curso.md` — mapa de los temas del curso aplicados al proyecto.
## Cómo colaborar con esta IA (Guía automática)

Cuando le pedís algo a Claude Code, él automáticamente debería considerar estos artefactos:

### Skills
- **`supabase-migracion-club`**: Cuando pidas agregar una tabla nueva, crear una migración de Supabase, o necesites una tabla multi-club con RLS.
  - *Trigger automático:* "Agregá tabla X", "Nueva migración", "Tabla de Y multi-club"

### Agents (Subagentes)
- **`auditor-seguridad`**: Cuando pidas revisar que los datos estén aislados por club, auditar RLS, o verificar que ningún club vea datos de otro.
  - *Trigger automático:* "Revisá que X sea seguro", "Auditá aislamiento", "¿Hay un agujero de seguridad acá?"
  
- **`revisor-codigo`**: Cuando pidas revisar código antes de commitearlo, o verificar que siga convenciones (dataApi.js, club_id, dinero en RPC).
  - *Trigger automático:* "Revisá este código", "¿Respeta convenciones?", "Antes de pushear, ¿está bien?"

### MCP (Model Context Protocol)
- **Supabase MCP** (`.mcp.json`): Cuando pidas ver el schema actual, listar tablas, revisar migraciones, o consultar logs.
  - *Trigger automático:* "¿Qué tablas tengo?", "Mostrá el schema de X", "Revisá los logs"
  - **Requisito:** Variable de entorno `SUPABASE_ACCESS_TOKEN` debe estar en `.env`

### Prompts (Templates)
- **`docs/prompts/`**: Son 5 plantillas reutilizables para tareas que repetiré.
  - Consultalas si necesitás crear una feature, una migración, auditar, o una edge function — no improvises.

### Documentación
- **`docs/architecture/diagramas-c4.md`**: Cuando preguntes cómo se conecta algo o quieras entender la arquitectura.
- **`docs/plans/spec-sdd.md`**: Para verificar que lo que programás cumple con el spec.
- **`docs/plans/adr-personal.md`**: Mi plan a 90 días — para contexto de carrera.
- **`docs/architecture/adr/*.md`**: Decisiones técnicas — consultá antes de cambiar cosas fundamentales.

---

## Convenciones que Claude respeta automáticamente

1. **Datos:** Todo acceso pasa por `src/lib/dataApi.js` — nunca queries directas a Supabase desde componentes.
2. **Club_id:** Toda query, mutation, RPC filtra por `club_id` (desde dataApi o RLS).
3. **Dinero:** La lógica de pagos (parciales, adelantos, saldo a favor) vive en el RPC `registrar_pago_con_credito`, nunca en JavaScript.
4. **Nombres:** camelCase en JS/React, snake_case en SQL/Postgres.
5. **Seguridad:** RLS + `current_club_id()` o `is_superadmin()` — no confíes en el frontend.
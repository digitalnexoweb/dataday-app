# Especificación (SDD) — DataDay Cuotas

Especificación dirigida por spec del estado **final** del producto. Describe qué hace el
sistema y con qué criterios se considera correcto, de forma independiente de la
implementación. Cuando el código y esta spec difieran, se actualiza la que corresponda.

- **Versión:** 1.0 (Demo Day) · **Estado:** en producción
- **Producción:** https://dataday-app.pages.dev

---

## 1. Objetivo

Permitir que clubes amateur, academias e institutos gestionen a sus socios/alumnos y el
cobro de cuotas mensuales de forma simple, con control de acceso administrado por DigitalNexo
y aislamiento total de datos entre clubes.

## 2. Alcance

**Incluye:** gestión de socios y categorías, registro y edición de pagos (con parciales,
adelantos y saldo a favor), estado de cuota y deuda, dashboard con vencimientos, recibos PDF,
solicitud y aprobación de acceso, configuración por club (cuota, día de vencimiento, branding),
y operación multi-club para el superadmin.

**No incluye (fuera de alcance de esta versión):** cobros online/pasarela de pago,
app móvil nativa, reportería avanzada/BI, notificaciones push, RAG o agentes autónomos.

## 3. Actores y roles

| Rol | Quién | Puede |
|-----|-------|-------|
| **Superadmin** | DigitalNexo (`digitalnexoweb@gmail.com`) | Ver todos los clubes, aprobar/rechazar solicitudes, operar dentro de un club seleccionado. En modo "Todos los clubes" supervisa pero no crea socios ni pagos. |
| **Admin de club** | Responsable del club aprobado | Operar únicamente su club: socios, categorías, pagos, configuración. |
| **Solicitante** | Club que pide acceso | Enviar solicitud de acceso; sin cuenta activa hasta ser aprobado. |

## 4. Requisitos funcionales

### RF-1 · Acceso por solicitud y aprobación
- No hay registro libre. El solicitante completa un formulario (nombre, email, club, teléfono,
  mensaje, contraseña deseada) que crea un `access_request` en estado `pending`.
- El superadmin recibe un email y puede **aprobar o rechazar** desde la app o desde enlaces
  firmados en el propio email.
- Al aprobar: se crea o reutiliza el club, se habilita el usuario de Auth, se crea su perfil
  como `admin` aprobado y se genera un enlace para que defina su contraseña.

### RF-2 · Gestión de socios
- Alta, edición y activación/baja de socios, con: nombre, nacimiento, contacto, categoría,
  fecha de ingreso, notas, foto y ficha médica opcional.
- Listado tipo CRM con paginación y estado de cuota visible.

### RF-3 · Categorías y cuotas
- Crear/editar/eliminar categorías con cuota mensual. Se puede crear categoría desde el alta
  de socio. Nombre único por club.

### RF-4 · Registro de pagos
- Registrar un pago por monto; el sistema cubre automáticamente los períodos vencidos del
  **más antiguo al más nuevo**, admite **pago parcial**, **adelanta meses futuros** con el
  sobrante y deja el resto como **saldo a favor**.
- Editar y eliminar pagos. Descargar **recibo en PDF**.
- Historial de pagos con exportación.

### RF-5 · Estado de cuota y deuda
- Cada socio muestra estado (al día / próximo a vencer / vencido), deuda pendiente (con
  recargo por mora configurable) y saldo a favor, calculados a partir de pagos y categoría.

### RF-6 · Dashboard
- KPIs (socios, ingresos del mes, morosidad) y **calendario de vencimientos**.

### RF-7 · Configuración por club
- Día de vencimiento, cuota por defecto, porcentaje de mora, métodos de pago y branding
  (nombre y logo del club).

### RF-8 · Multi-club (superadmin)
- Selector de club en el header. En "Todos los clubes" se supervisa de forma global; al elegir
  un club, se opera como ese club.

## 5. Requisitos no funcionales

- **RNF-1 · Aislamiento de datos:** ningún club puede leer/escribir datos de otro. Garantizado
  por RLS en la base (no solo por el frontend).
- **RNF-2 · Consistencia del dinero:** el registro de pagos es atómico (una transacción); no
  pueden quedar estados intermedios.
- **RNF-3 · Disponibilidad de desarrollo:** la app debe poder correr sin backend (modo mock)
  con un solo flag, para desarrollo y demo.
- **RNF-4 · Seguridad de secretos:** `service_role` y API keys solo en Edge Functions/servidor;
  nunca en el bundle del frontend.
- **RNF-5 · Rendimiento de carga:** bundle con code-splitting (jsPDF y vendor separados);
  índices en la base para las consultas por club, socio y período.
- **RNF-6 · Responsive:** uso pleno en escritorio y celular (navegación inferior en mobile).
- **RNF-7 · Localización:** UI en español; moneda y fechas en formato `es-UY`.

## 6. Modelo de datos (resumen)

Tablas principales (todas las de negocio con `club_id` y RLS):

- `clubs` — clubes (tenants).
- `access_requests` — solicitudes de acceso (`pending`/`approved`/`rejected`).
- `profiles` — perfil de usuario (rol `superadmin`/`admin`/`staff`, `approved`, `club_id`).
- `categorias` — categorías con `monthly_fee` (única por club).
- `socios` — socios/alumnos, con `saldo_a_favor`.
- `pagos` — pagos por período (`unique(member_id, month, year)`).
- `medical_records` — ficha médica (1 por socio).
- `saldo_a_favor` — historial de crédito a favor.

Detalle completo y relaciones en `supabase/schema.sql` y en `docs/architecture/diagramas-c4.md`.

## 7. Flujos principales

**Alta de club (acceso):** solicitud → email al superadmin → aprobación → creación de club +
usuario + perfil → enlace de contraseña → primer login.

**Registro de pago:** seleccionar socio → ingresar monto y método → el RPC
`registrar_pago_con_credito` cubre períodos vencidos, adelanta futuros y actualiza saldo →
refresco de datos → recibo PDF opcional.

## 8. Criterios de aceptación (muestra)

- **CA-1:** Un admin del Club A que abre la lista de socios **no ve** socios del Club B, ni
  siquiera manipulando peticiones (RLS lo impide).
- **CA-2:** Al pagar un monto mayor a la deuda, se saldan los meses vencidos, se adelantan los
  siguientes y el remanente queda como saldo a favor; la suma cierra al centavo.
- **CA-3:** Un pago menor a la cuota registra un parcial sobre el período más antiguo y la deuda
  se reduce en ese monto.
- **CA-4:** Con `VITE_USE_SUPABASE=false`, la app levanta y es navegable de punta a punta con
  datos mock, sin backend.
- **CA-5:** El repo levanta en local con un único comando documentado (`npm run dev`).
- **CA-6:** Una solicitud aprobada genera un enlace de activación válido que permite al cliente
  fijar su contraseña e ingresar.

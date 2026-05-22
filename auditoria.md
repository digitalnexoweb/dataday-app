# Auditoría del proyecto — DataDay Cuotas

> Fecha de auditoría: mayo 2026  
> Auditor: revisión estática completa del código fuente  
> Estado del repositorio: rama `main`, commit `abc2804`

---

## Resumen ejecutivo

DataDay Cuotas es una aplicación funcional en su núcleo: puede crear socios, registrar pagos y gestionar accesos. Tiene decisiones de diseño correctas (Supabase con RLS, modo offline con mocks, separación en features) y una UI que ya tiene identidad visual propia.

Sin embargo, tiene problemas serios que la impiden ser vendible hoy. El más grave es un **bug silencioso en el registro de pagos**: si el insert a Supabase falla, el usuario ve "Pago guardado correctamente" pero el dato se pierde. Hay además **código muerto sin importar**, **lógica de negocio crítica sin tests**, **fotos de socios guardadas como base64 en la base de datos** (lo que hará las queries insoportablemente lentas con uso real), y **dos funciones idénticas duplicadas entre archivos**. El sistema de emails de onboarding usa un sender de prueba (`onboarding@resend.dev`) que no entrega a correos externos, lo cual bloquea el flujo de alta de nuevos clientes. La arquitectura de componentes tiene una deuda de diseño acumulada que, si no se paga pronto, va a hacer cada nueva feature el doble de cara de implementar.

---

## Hallazgos críticos 🔴

*Lo que impide que funcione o sea vendible hoy.*

---

### [C1] Bug silencioso en el registro de pagos

**Archivo:** [src/lib/dataApi.js:278-291](src/lib/dataApi.js#L278-L291)

```js
async registerPayment(payload, currentPayments, clubId = null) {
  const nextPayment = { id: currentPayments.length + 1, ...payload };

  if (supabaseEnabled && clubId) {
    await supabase.from("pagos").insert({ ... }); // ← no hay manejo del error
  }

  return [nextPayment, ...currentPayments]; // ← siempre retorna éxito
}
```

El `insert` a Supabase no hace `throw` si falla. El estado local se actualiza, el usuario ve "Pago guardado correctamente", pero el dato no existe en la base de datos. En la próxima recarga, el pago desaparece. Este bug afecta al flujo principal de la aplicación.

---

### [C2] Fotos y logos guardados como base64 en la base de datos

**Archivos:** [src/features/members/MemberFormPage.jsx:79](src/features/members/MemberFormPage.jsx#L79), [src/features/settings/SettingsPage.jsx:39](src/features/settings/SettingsPage.jsx#L39)

Las fotos de socios y el logo del club se convierten a Data URL (base64) y se guardan directamente en las columnas `photo_url` y `logo_url` de Supabase. Una foto de 300KB se convierte en ~400KB de texto en la base de datos. Cada query de `getAppData` trae **todas** las fotos de todos los socios. Con 100 socios y fotos promedio de 200KB, una sola carga inicial puede traer 20MB+ desde la red. Esto hace la app inutilizable a escala real.

---

### [C3] Email de onboarding con sender de prueba

**Archivos:** [supabase/functions/_shared/access-request-review.ts:77](supabase/functions/_shared/access-request-review.ts#L77), [supabase/functions/notify-access-request/index.ts:105](supabase/functions/notify-access-request/index.ts#L105)

```ts
from: "DataDay Cuotas <onboarding@resend.dev>",
```

Ambas funciones (`notify-access-request` y el email de aprobación) usan el sender de prueba de Resend. Este dominio tiene restricciones estrictas sobre a qué correos puede enviar en el plan gratuito. El flujo de alta de nuevos clientes —el punto más crítico del producto— puede fallar silenciosamente. El propio `SESSION_NOTES.md` lo documenta como problema conocido sin solución definitiva implementada.

---

### [C4] `listUsers()` sin paginación en Edge Functions

**Archivos:** [supabase/functions/submit-access-request/index.ts:9](supabase/functions/submit-access-request/index.ts#L9), [supabase/functions/_shared/access-request-review.ts:116](supabase/functions/_shared/access-request-review.ts#L116)

```ts
const { data, error } = await adminClient.auth.admin.listUsers();
// devuelve máximo 1000 usuarios por defecto
const existingUser = data.users.find(item => item.email === email);
```

Supabase devuelve máximo 1000 usuarios por página. Si hay más de 1000 cuentas registradas, `findUserByEmail` puede devolver `null` aunque el usuario exista, resultando en la creación de cuentas duplicadas de auth. Es un bug latente que explota con el crecimiento.

---

### [C5] Tokens de email sin expiración en `email-access-review`

**Archivo:** [supabase/functions/_shared/access-request-review.ts:217-232](supabase/functions/_shared/access-request-review.ts#L217-L232)

Los tokens HMAC generados para los links de aprobar/rechazar en los emails no tienen timestamp ni fecha de expiración. Un token generado es válido para siempre. Si un email de revisión es interceptado o reenviado meses después, el token sigue funcionando y puede aprobar o rechazar una solicitud que ya fue procesada.

---

### [C6] CORS wildcard en todas las Edge Functions

**Archivo:** [supabase/functions/_shared/access-request-review.ts:5-8](supabase/functions/_shared/access-request-review.ts#L5-L8)

```ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  ...
};
```

Todas las Edge Functions aceptan requests desde cualquier origen. Debería restringirse al dominio de producción (`data-day-app367d.netlify.app` o el dominio final). Actualmente cualquier sitio web puede hacer requests a estos endpoints.

---

### [C7] `submit-access-request` crea usuarios en Supabase Auth sin aprobación previa

**Archivo:** [supabase/functions/submit-access-request/index.ts:76-90](supabase/functions/submit-access-request/index.ts#L76-L90)

Cuando alguien llena el formulario de solicitud de acceso, la Edge Function **inmediatamente crea un usuario en `auth.users`** con `approved: false`. No hay captcha, no hay rate limiting, no hay verificación de email. Cualquier persona puede llenar el formulario indefinidamente y crear cuentas en el sistema. La tabla `auth.users` de Supabase tiene límites en los planes pagos.

---

### [C8] Bundle único sin code splitting

**Archivo:** [vite.config.js](vite.config.js)

```js
export default defineConfig({
  plugins: [react()],
  // sin configuración de chunks
});
```

La config de Vite no tiene `build.rollupOptions.output.manualChunks`. jsPDF (~600KB), Supabase JS (~800KB) y toda la app van en un solo archivo. El build resultante (`dist/assets/index-B_IeTaOs.js`) es el bundle principal que el usuario debe descargar antes de ver cualquier cosa. En conexiones lentas o móviles, esto es una barrera de entrada real.

---

### [C9] Archivo `MemberDetailPage.jsx` importado en ningún lado

**Archivo:** [src/features/members/MemberDetailPage.jsx](src/features/members/MemberDetailPage.jsx)

El componente `MemberDetailPage` existe como archivo pero **no está importado en `App.jsx` ni en ningún otro archivo**. El detalle real se muestra mediante `MemberDetailPanel.jsx`. `MemberDetailPage.jsx` es código muerto con 113 líneas que no sirven para nada y confunden a quien lea el proyecto.

---

### [C10] XSS en HTML de emails vía datos no sanitizados

**Archivos:** [supabase/functions/notify-access-request/index.ts:26-30](supabase/functions/notify-access-request/index.ts#L26-L30), [supabase/functions/_shared/access-request-review.ts:10-42](supabase/functions/_shared/access-request-review.ts#L10-L42)

Los campos `fullName`, `clubName`, `email` y `message` del payload se insertan directamente en el HTML del email sin ningún tipo de escape o sanitización:

```ts
<tr><td>${payload.fullName}</td></tr>
<tr><td>${payload.message}</td></tr>
```

Un usuario malicioso puede inyectar HTML arbitrario en los emails enviados al admin. Si el cliente de email del admin renderiza HTML sin sandbox (Gmail lo hace parcialmente), puede llevar a phishing o ejecución de scripts.

---

## Mejoras importantes 🟡

*Lo que debe resolverse antes del lanzamiento comercial.*

---

### [I1] Función `isMissingLogoColumnError` duplicada

**Archivos:** [src/lib/authApi.js:28-33](src/lib/authApi.js#L28-L33), [src/lib/dataApi.js:8-13](src/lib/dataApi.js#L8-L13)

La misma función está copiada y pegada textualmente en dos archivos. Evidencia de que no existe una capa de utilidades compartidas entre los módulos de lib.

---

### [I2] Función `getMonthlyFee` duplicada

**Archivos:** [src/features/members/MembersPage.jsx:8-10](src/features/members/MembersPage.jsx#L8-L10), [src/features/dashboard/DashboardPage.jsx:35-37](src/features/dashboard/DashboardPage.jsx#L35-L37)

```js
// MembersPage.jsx
function getMonthlyFee(category, appSettings) {
  return Number(category?.monthlyFee ?? category?.monthly_fee ?? appSettings.defaultMonthlyFee ?? 0);
}

// DashboardPage.jsx
function getMonthlyFee(category, fallbackFee) {
  return Number(category?.monthlyFee ?? category?.monthly_fee ?? fallbackFee ?? 0);
}
```

Misma función, diferente firma, en dos archivos distintos. La lógica de negocio de cuota mensual está fragmentada.

---

### [I3] Configuraciones críticas de negocio solo en localStorage

**Archivo:** [src/lib/appSettings.js](src/lib/appSettings.js)

El día de vencimiento mensual (`dueDay`), el porcentaje de recargo por mora (`lateFeePercent`), la cuota por defecto y las formas de pago habilitadas se guardan únicamente en `localStorage`. Si un usuario borra el caché, pierde toda la configuración. Si el cliente accede desde otro navegador o dispositivo, las configuraciones no están. Solo `clubName` y `clubLogo` se sincronizan con Supabase. El resto de la configuración operativa del club es efímera.

---

### [I4] Cálculo de deuda limitado al año actual

**Archivo:** [src/lib/format.js:41-67](src/lib/format.js#L41-L67)

`getChargeablePeriods` solo genera períodos del año corriente. Si un socio tiene deuda de diciembre del año anterior, no aparece en el cálculo. El `pendingDebt` mostrado en la ficha del socio es incorrecto para socios con deuda histórica.

---

### [I5] Sin posibilidad de dar de baja a socios ni eliminar pagos

No existe ningún mecanismo en el UI para:
- Marcar un socio como inactivo (la columna `active` existe en la DB pero no hay toggle)
- Eliminar un socio
- Eliminar o corregir un pago erróneo
- Editar o eliminar categorías

Estas son operaciones de administración básicas que el cliente va a necesitar en el primer mes de uso.

---

### [I6] Sin doble envío bloqueado en el formulario de pagos

**Archivo:** [src/features/payments/RegisterPaymentPage.jsx:51-75](src/features/payments/RegisterPaymentPage.jsx#L51-L75)

El `handleSubmit` no tiene estado de loading. El botón "Guardar pago" no se deshabilita mientras la operación está en curso. Un clic doble genera dos llamadas. La única protección es el unique constraint `(member_id, month, year)` en la DB de Supabase, que rechazaría el duplicado — pero en modo mock (local) no hay esa protección y los pagos se duplicarían.

---

### [I7] El texto de WhatsApp está hardcodeado con "DataDay Cuotas"

**Archivo:** [src/components/MemberDetailPanel.jsx:67-71](src/components/MemberDetailPanel.jsx#L67-L71)

```js
const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
  `Hola ${member.fullName}, te escribimos desde DataDay Cuotas.`
)}`
```

Todos los clientes van a escribir "DataDay Cuotas" en sus mensajes a socios. Deberían usar el nombre de su propio club. Esto hace la feature de WhatsApp inutilizable tal como está para venta.

---

### [I8] El recibo PDF es un stub sin valor comercial

**Archivo:** [src/lib/receipt.js](src/lib/receipt.js)

El recibo generado es texto plano sin:
- Nombre ni logo del club
- Número de recibo correlativo
- Nombre y datos del socio que paga
- Firma o sello
- Formato de moneda correcto (usa `payment.amount` crudo, sin `formatCurrency`)
- Ningún estilo o diseño

Un recibo así no sirve para entregar a un socio ni como comprobante.

---

### [I9] Meses mostrados como números en el formulario de pago

**Archivo:** [src/features/payments/RegisterPaymentPage.jsx:102-109](src/features/payments/RegisterPaymentPage.jsx#L102-L109)

```jsx
{Array.from({ length: 12 }, (_, index) => (
  <option key={index + 1} value={index + 1}>
    {index + 1}   // ← muestra "1", "2", ..., "12"
  </option>
))}
```

El select de "Mes" muestra números en lugar de nombres de mes. `MONTH_NAMES` ya existe en `format.js` y no se usa aquí.

---

### [I10] `App.jsx` es un God Component de 415 líneas

**Archivo:** [src/app/App.jsx](src/app/App.jsx)

Maneja: estado de auth, datos de aplicación, tema, selección de club, lista de clubes disponibles, 5 handlers de datos, lógica de routing, y render condicional. Viola el principio de responsabilidad única y hace que cualquier cambio de auth afecte el renderizado de datos y viceversa. El objeto `screenProps` con 16+ propiedades que se pasa a todas las páginas es props drilling severo.

---

### [I11] Sin router declarativo — back button roto

No hay React Router ni ningún router. La navegación es un `switch` sobre `view.section` en estado. Consecuencias directas:
- El botón "Atrás" del browser no navega dentro de la app
- No se puede compartir un link a un socio específico
- Las URLs no reflejan el estado de la aplicación
- Si el usuario refresca la página en cualquier sección, vuelve al dashboard

---

### [I12] `PAYMENT_METHOD_OPTIONS` duplicada en PaymentsHistoryPage

**Archivos:** [src/features/payments/PaymentsHistoryPage.jsx:57-63](src/features/payments/PaymentsHistoryPage.jsx#L57-L63), [src/lib/appSettings.js:52-57](src/lib/appSettings.js#L52-L57)

`PaymentsHistoryPage` define su propia lista de métodos de pago hardcodeada en lugar de importar `PAYMENT_METHOD_OPTIONS` de `appSettings.js`. Si se agrega un nuevo método de pago, hay que actualizar dos lugares.

---

### [I13] Sin confirmación antes de aprobar/rechazar solicitudes

**Archivo:** [src/features/admin/AdminRequestsPage.jsx:30-56](src/features/admin/AdminRequestsPage.jsx#L30-L56)

Un click en "Aprobar" o "Rechazar" ejecuta inmediatamente la acción sin pedir confirmación. Aprobar es irreversible desde el UI (no hay "desaprobar"). El flujo de aprobación es la acción más crítica y costosa del sistema.

---

### [I14] Los status de solicitudes se muestran en inglés

**Archivo:** [src/features/admin/AdminRequestsPage.jsx:115](src/features/admin/AdminRequestsPage.jsx#L115)

```jsx
<span className={...}>
  {request.status}  // ← muestra "pending", "approved", "rejected"
</span>
```

La UI es completamente en español salvo estos badges. El valor crudo de la DB se muestra sin traducción.

---

### [I15] Sin manejo de error en `loadData` de App.jsx

**Archivo:** [src/app/App.jsx:205-209](src/app/App.jsx#L205-L209)

```js
async function loadData() {
  const data = await dataApi.getAppData(effectiveClubId, { isSuperAdmin: isAllClubsView });
  setAppData({ ...data, loading: false });
}
```

Si `getAppData` lanza una excepción no capturada, `setAppData` nunca se llama, `loading` queda en `true` y la app muestra una pantalla de carga infinita sin ningún mensaje de error al usuario. Aunque `dataApi.getAppData` tiene su propio fallback a mocks, si el fallback también falla, no hay recovery.

---

### [I16] Sin indicadores de carga en la mayoría de las páginas

Cuando se cargan datos (`appData.loading = true`), solo el componente `MemberList` recibe la prop `loading`. El dashboard, el historial de pagos y la página de configuración no tienen ningún estado de carga visual. El usuario ve datos vacíos o desactualizados hasta que Supabase responde.

---

## Mejoras menores 🟢

*Pulido, deuda técnica baja, nice-to-have.*

---

### [M1] `SESSION_NOTES.md` está en el `.gitignore`

**Archivo:** [.gitignore:9](.gitignore#L9)

El historial de decisiones de producto y el estado del proyecto están gitignoreados. Este archivo tiene información valiosa que se perderá si se reinstala el entorno o si otro desarrollador entra al proyecto. Debería estar en el repo o en un sistema de documentación externo.

---

### [M2] `SUPERADMIN_EMAIL` hardcodeado en 5 lugares

El email `digitalnexoweb@gmail.com` aparece en:
- [src/lib/authApi.js:3](src/lib/authApi.js#L3)
- [supabase/functions/_shared/access-request-review.ts:3](supabase/functions/_shared/access-request-review.ts#L3)
- [supabase/functions/admin-access-requests/index.ts:58](supabase/functions/admin-access-requests/index.ts#L58)
- [supabase/schema.sql:258](supabase/schema.sql#L258) (función SQL)
- [supabase/schema.sql:294](supabase/schema.sql#L294) (trigger SQL)

Cambiar el email del superadmin requiere modificar 5 archivos incluyendo una migración de base de datos.

---

### [M3] `CURRENT_YEAR` evaluado en tiempo de módulo

**Archivo:** [src/features/payments/RegisterPaymentPage.jsx:6](src/features/payments/RegisterPaymentPage.jsx#L6)

```js
const CURRENT_YEAR = new Date().getFullYear();
```

Si la app está abierta a medianoche del 31 de diciembre, `CURRENT_YEAR` no se actualiza hasta recargar la página. Es un caso borde raro pero indica que debería evaluarse dentro del componente o usarse `useMemo`.

---

### [M4] Foto por defecto depende de Unsplash

**Archivo:** [src/lib/dataApi.js:5-7](src/lib/dataApi.js#L5-L7)

```js
const DEFAULT_PHOTO_URL = "https://images.unsplash.com/photo-1519345182560...";
```

Si Unsplash cambia la URL o el recurso, todos los socios sin foto mostrarán una imagen rota. Debería ser un asset local en `/public`.

---

### [M5] Año máximo de pago hardcodeado a 2035

**Archivo:** [src/features/payments/RegisterPaymentPage.jsx:119](src/features/payments/RegisterPaymentPage.jsx#L119)

```jsx
<input type="number" min="2024" max="2035" ... />
```

Número arbitrario. Debería ser dinámico (`CURRENT_YEAR + N`).

---

### [M6] Sin accesibilidad básica

Ningún componente interactivo tiene:
- `aria-label` en íconos o botones que solo tienen texto no descriptivo
- Manejo de focus al abrir/cerrar paneles
- Skip links para navegación por teclado
- Roles ARIA en listas de socios o tablas dinámicas

Para vender a instituciones educativas o deportivas en mercados con requerimientos de accesibilidad (Uruguay incluye Ley 17.930), esto es un riesgo.

---

### [M7] Sin linting ni formateo automático configurado

No hay ESLint, Prettier, Biome ni ninguna herramienta de calidad de código en el proyecto. El `package.json` no tiene scripts de `lint` ni `format`. El código tiene estilos de formato levemente inconsistentes entre archivos (algunos usan trailing commas, otros no).

---

### [M8] Sin TypeScript

El proyecto usa JavaScript puro. Los objetos `member`, `payment`, `category` tienen múltiples shapes según vengan de Supabase o de los mocks (`camelCase` vs `snake_case`). La normalización se hace con cadenas de `??` frágiles. Sin tipos, cualquier refactor puede romper silenciosamente la normalización.

---

### [M9] Sin tests de ningún tipo

No hay tests unitarios, de integración ni e2e. La lógica crítica de negocio —`getChargeablePeriods`, `getCurrentFeeStatus`, `buildMemberSummary`— no tiene ninguna cobertura. Un bug en `getChargeablePeriods` afecta el estado de cuenta de todos los socios y nadie lo detectaría hasta que un cliente lo reporte.

---

### [M10] `buildMemberSummary` se recalcula para todos los socios en cada render

**Archivo:** [src/features/members/MembersPage.jsx:108-111](src/features/members/MembersPage.jsx#L108-L111)

```js
const memberSummaries = useMemo(
  () => appData.members.map(member => buildMemberSummary(member, appData, appSettings)),
  [appData, appSettings],
);
```

`buildMemberSummary` hace múltiples `.find()` y `.filter()` sobre arrays de pagos y categorías por cada socio. El `useMemo` se invalida cuando cambia cualquier campo de `appData` (incluyendo cuando se registra un pago). Con 500 socios, este recálculo completo en el thread principal puede bloquear la UI perceptiblemente.

---

### [M11] `schema.sql` mezcla CREATE y ALTER sobre las mismas tablas

**Archivo:** [supabase/schema.sql](supabase/schema.sql)

El archivo primero hace `CREATE TABLE IF NOT EXISTS` con las columnas base y luego hace `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` con las mismas columnas para compatibilidad con bases existentes. En bases de datos nuevas, los `ALTER TABLE` intentan agregar columnas que ya existen. Aunque el `IF NOT EXISTS` lo hace no destructivo, el script es confuso y difícil de mantener como fuente de verdad del schema.

---

### [M12] Sin paginación en historial de pagos

**Archivo:** [src/features/payments/PaymentsHistoryPage.jsx](src/features/payments/PaymentsHistoryPage.jsx)

`PaymentsHistoryPage` renderiza todos los pagos filtrados en una `DataTable` sin paginación. Con un club activo de 2 años y 200 socios, puede haber miles de registros renderizados simultáneamente en el DOM.

---

### [M13] Sin staging environment ni CI/CD

No hay:
- GitHub Actions para verificar que el build pase en cada push
- Pipeline de testing automático
- Environment de staging separado de producción
- Builds automáticos en Netlify (desactivados según SESSION_NOTES.md)

El flujo actual es: desarrollar localmente → push a main → deploy manual en Netlify. Cualquier error de sintaxis llega a producción sin filtro.

---

### [M14] Sin dominio propio

La URL pública es `data-day-app367d.netlify.app`. Para vender como SaaS profesional a clubes y academias, necesita un dominio propio (ej. `app.datadaycuotas.com`). El subdominio de Netlify transmite que es un proyecto de prueba.

---

### [M15] El logo del club guardado como base64 no tiene límite de tamaño

**Archivo:** [src/features/settings/SettingsPage.jsx:25-47](src/features/settings/SettingsPage.jsx#L25-L47)

La validación del logo solo verifica `file.type.startsWith("image/")`. No hay límite de tamaño de archivo. Un usuario puede subir una imagen de 10MB que se convertirá en ~13MB de texto Base64 en la base de datos, en la columna `logo_url` de la tabla `clubs`.

---

### [M16] Variables de entorno de Edge Functions no documentadas

El `README.md` documenta las 3 variables de frontend (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USE_SUPABASE`) pero no menciona las 5 variables que necesitan las Edge Functions de Supabase:
- `SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `ADMIN_NOTIFICATION_EMAIL`
- `ADMIN_APPROVAL_SECRET`
- `APP_BASE_URL`

Un desarrollador nuevo no puede configurar el sistema completo leyendo la documentación actual.

---

## Plan de acción sugerido

Ordenado por impacto / esfuerzo. Los primeros 6 son bloqueantes para producción.

### Prioridad 1 — Bugs bloqueantes (atacar esta semana)

1. **[C1] Corregir el bug de `registerPayment`**: agregar `if (error) throw error` después del insert a Supabase. Sin esto, los pagos pueden perderse silenciosamente.

2. **[C3] Configurar dominio verificado en Resend**: registrar y verificar un dominio propio en Resend (ej. `noreply@datadaycuotas.com`) y actualizar el `from` en las dos Edge Functions. Mientras tanto, el flujo de alta de clientes es poco confiable.

3. **[I6] Bloquear doble submit en formulario de pagos**: agregar `disabled={saving}` al botón y estado de loading en `RegisterPaymentPage.handleSubmit`.

4. **[C2] Migrar fotos a Supabase Storage**: en lugar de guardar base64 en la DB, subir el archivo a un bucket de Supabase Storage y guardar solo la URL pública. Esta es la solución correcta para `photo_url` y `logo_url`. Requiere cambios en `MemberFormPage`, `SettingsPage` y `dataApi.js`.

5. **[M15] Agregar límite de tamaño en subida de imágenes**: como mitigación inmediata antes del punto 4, rechazar archivos mayores a 500KB con un mensaje claro al usuario.

6. **[C9] Eliminar `MemberDetailPage.jsx`**: es código muerto que confunde. Borrar el archivo.

### Prioridad 2 — Funcionalidad comercial faltante (próximas 2 semanas)

7. **[I5] Alta baja de socios**: agregar toggle `activo/inactivo` en la ficha del socio, filtro de socios activos/inactivos en la lista.

8. **[I8] Recibo PDF con branding del club**: incluir nombre del club, datos de contacto, número correlativo y moneda formateada correctamente.

9. **[I7] WhatsApp con nombre del club dinámico**: usar `appSettings.clubName` en el texto del mensaje en lugar de "DataDay Cuotas".

10. **[I3] Persistir configuraciones en Supabase**: mover `dueDay`, `lateFeePercent` y `paymentMethods` a una tabla `club_settings` en Supabase, no solo a localStorage.

11. **[I5] CRUD de categorías**: agregar edición y eliminación de categorías desde el UI.

12. **[I4] Cálculo de deuda multi-año**: extender `getChargeablePeriods` para cubrir años anteriores desde `enrollmentDate`.

### Prioridad 3 — Calidad y mantenibilidad (primer mes)

13. **[C5] Agregar expiración a tokens de email**: incluir timestamp en el payload del HMAC y validar que no hayan pasado más de 72 horas.

14. **[C6] Restringir CORS**: cambiar `"Access-Control-Allow-Origin": "*"` por el dominio de producción.

15. **[C4] Agregar paginación en `listUsers`**: usar el parámetro `page` de la API de Supabase Auth para paginar la búsqueda de usuarios.

16. **[I1, I2, I12] Consolidar funciones duplicadas**: mover `isMissingLogoColumnError`, `getMonthlyFee` y `PAYMENT_METHOD_OPTIONS` a archivos compartidos.

17. **[I14] Traducir badges de status al español**: mapear `pending → Pendiente`, `approved → Aprobado`, `rejected → Rechazado`.

18. **[M9] Agregar tests para lógica de negocio crítica**: cubrir `getChargeablePeriods`, `getCurrentFeeStatus` y `buildMemberSummary` con tests unitarios de Vitest.

19. **[M7] Configurar ESLint + Prettier**: agregar configuración mínima con reglas para React.

### Prioridad 4 — Arquitectura y escala (mediano plazo)

20. **[I11] Introducir React Router**: migrar la navegación por estado a URL-based routing. Permite back button, deep links y separación de concerns.

21. **[C8] Configurar code splitting**: separar jsPDF en un chunk propio cargado solo en la pantalla de pagos. Reducirá el bundle inicial en ~600KB.

22. **[I10] Romper `App.jsx` en contextos**: extraer `AuthContext` y `AppDataContext` con `useContext` para eliminar el props drilling masivo.

23. **[M8] Migrar a TypeScript**: agregar `tsconfig.json` e ir tiypando progresivamente empezando por `lib/`.

24. **[M13] Configurar CI/CD con GitHub Actions**: build check + test en cada PR, deploy automático a Netlify en merge a main.

25. **[M14] Configurar dominio propio**: registrar y configurar dominio para el producto.

---

*Fin de la auditoría original.*

---

## ✅ Cambios implementados

> Implementados en 8 batches sobre la rama `main` a partir del commit `73b564e`. Fecha: mayo 2026.

### 🔴 Críticos resueltos

| ID | Descripción | Commit |
|---|---|---|
| C1 | Bug silencioso en `registerPayment` — throw en error de Supabase | Batch 1 |
| C2 | Fotos y logos migrados a Supabase Storage (buckets `member-photos` y `club-logos`); se guarda solo la URL | Batch 5 |
| C3 | Sender de email configurable via `RESEND_FROM_EMAIL` env var en `_shared` y `notify-access-request` | Batch 4 |
| C4 | `listUsers()` reemplazado por `getUserByEmail()` con paginación en bucle; elimina límite de 1000 usuarios | Batch 4 |
| C5 | Tokens HMAC ahora incluyen timestamp (`ts.hex`); `verifyActionToken` rechaza tokens con más de 72 h | Batch 4 |
| C6 | `corsHeaders` ahora usa `APP_BASE_URL` env var en lugar de wildcard `*` | Batch 4 |
| C8 | `vite.config.js` con `manualChunks` para jsPDF y React vendor | Batch 5 |
| C9 | Archivo `MemberDetailPage.jsx` eliminado (código muerto) | Batch 1 |
| C10 | Helper `escapeHtml()` aplicado a todos los campos interpolados en HTML de emails | Batch 4 |

> **C7** (rate limiting / captcha en `submit-access-request`) queda pendiente — requiere servicio externo.

### 🟡 Importantes resueltos

| ID | Descripción | Commit |
|---|---|---|
| I1 | `isMissingLogoColumnError` centralizada en `src/lib/utils.js`; eliminadas las copias de `authApi.js` y `dataApi.js` | Batch 3 |
| I2 | `getMonthlyFee` centralizada en `src/lib/utils.js`; eliminadas las copias de `MembersPage` y `DashboardPage` | Batch 3 |
| I3 | Tabla `club_settings` en Supabase con RLS; `dueDay`, `lateFeePercent`, `defaultMonthlyFee` y `paymentMethods` se cargan al iniciar y se persisten al guardar | Batch 6 |
| I4 | `getChargeablePeriods` ahora itera desde `enrollmentYear` hasta el año actual — deuda multi-año correcta | Batch 3 |
| I5 | Toggle activo/inactivo en `MemberDetailPanel`; filtro "Archivados" en lista; CRUD de categorías (editar + eliminar con guard) en `SettingsPage` | Batch 6 |
| I6 | Estado `saving` y `disabled` en botón de submit de `RegisterPaymentPage` | Batch 1 |
| I7 | Mensaje de WhatsApp usa `appSettings.clubName` en lugar de "DataDay Cuotas" hardcodeado | Batch 2 |
| I8 | Recibo PDF rediseñado con branding naranja, nombre y logo del club, número correlativo, moneda formateada | Batch 2 |
| I9 | Select de mes en formulario de pago muestra `MONTH_NAMES` en español | Batch 1 |
| I12 | `PAYMENT_METHOD_OPTIONS` importado desde `appSettings.js` en `PaymentsHistoryPage`; eliminada la copia local | Batch 2 |
| I13 | Confirmación antes de aprobar/rechazar solicitudes en `AdminRequestsPage` | Batch 2 |
| I14 | Status de solicitudes traducidos al español (`STATUS_LABELS`) | Batch 2 |
| I15 | `loadData` en `App.jsx` envuelto en try/catch con banner de error visible | Batch 1 |
| I16 | `DashboardPage` muestra estado de carga; `RegisterPaymentPage` muestra error de guardado | Batch 2 |

> **I10** (romper App.jsx en contextos) y **I11** (React Router) quedan pendientes — decisión arquitectural diferida.

### 🟢 Menores resueltos

| ID | Descripción | Commit |
|---|---|---|
| M1 | `SESSION_NOTES.md` eliminado del `.gitignore` | Batch 7 |
| M2 | `SUPERADMIN_EMAIL` exportado como named export de `authApi.js`; centralizado en `_shared` para Edge Functions | Batch 7 |
| M3 | `CURRENT_YEAR` movido dentro del componente `RegisterPaymentPage` | Batch 1 |
| M4 | `DEFAULT_PHOTO_URL` cambiado a `/default-avatar.svg` (asset local); SVG neutral creado en `public/` | Batch 3 |
| M5 | `max` del input de año ahora es dinámico (`currentYear + 10`) | Batch 1 |
| M7 | ESLint configurado (`eslint.config.js` flat config) con plugins `react-hooks` y `react-refresh`; script `lint` en `package.json` | Batch 7 |
| M9 | Tests unitarios con Vitest para `getChargeablePeriods`, `getCurrentFeeStatus`, `getMonthlyFee` e `isMissingLogoColumnError` | Batch 8 |
| M10 | `buildMemberSummary` pre-indexa pagos/categorías con `Map` antes del `.map()` — O(N) en lugar de O(N×M) | Batch 3 |
| M12 | Paginación agregada a `PaymentsHistoryPage` (PAGE_SIZE = 50) | Batch 2 |
| M15 | Validación de 500 KB en cliente antes de subir imágenes; límite de 512 KB configurado en el bucket de Supabase Storage | Batch 5 |
| M16 | `README.md` actualizado con tabla completa de variables de entorno de Edge Functions y nota de seguridad sobre `SERVICE_ROLE_KEY` | Batch 7 |

> **M6** (accesibilidad), **M8** (TypeScript), **M11** (schema.sql), **M13** (CI/CD) y **M14** (dominio propio) quedan pendientes — fuera del alcance de esta ronda de implementación.

---

## ⏳ Pendiente de revisión manual

Los siguientes cambios requieren acción manual o verificación fuera del código:

1. **`RESEND_FROM_EMAIL`** — Configurar en Supabase → Edge Functions → Secrets. Valor: `DataDay Cuotas <noreply@tudominio.com>` con dominio verificado en Resend. Sin esto, los emails de aprobación siguen usando `onboarding@resend.dev`.

2. **`APP_BASE_URL`** — Verificar que esté configurado en Edge Functions con el dominio de producción exacto (`https://data-day-app367d.netlify.app`). Determina el CORS origin de todas las funciones.

3. **Supabase Storage — buckets creados** — `member-photos` y `club-logos` están creados con RLS. Verificar que las políticas funcionen correctamente haciendo una subida de prueba desde la app en producción.

4. **`club_settings` — migración aplicada** — Tabla creada vía MCP. Si hay entornos adicionales (staging, local), aplicar la migración en esos también.

5. **ESLint y Vitest** — Ejecutar `npm install` para activar las nuevas dependencias (`eslint`, `vitest`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`). Luego verificar con `npm run lint` y `npm test`.

6. **C7 — Rate limiting** — `submit-access-request` no tiene protección contra spam. Evaluar agregar Cloudflare Turnstile o hCaptcha, o implementar rate limiting por IP en la Edge Function.

7. **I10 / I11 — Arquitectura** — App.jsx sigue siendo un God Component. La refactorización a `AuthContext` + `AppDataContext` y React Router está diferida; priorizar antes de incorporar más páginas.

8. **M8 — TypeScript** — Migración incremental pendiente. Empezar por `src/lib/*.js` donde los tipos son más críticos.

9. **Recibo PDF** — Verificar diseño en producción con datos reales y en distintos navegadores. Ajustar márgenes si el logo del club desborda el área.

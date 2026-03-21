# Estado del proyecto

Fecha de referencia: 14 de marzo de 2026

## Objetivo

Convertir **DataDay Cuotas** en una app SaaS para gestion de cuotas de clubes, academias e institutos, con acceso controlado por DigitalNexo, soporte multi-club y operacion diaria simple.

## Stack actual

- React + Vite
- CSS custom
- Supabase
- Edge Functions de Supabase
- Resend para emails
- Preparado para despliegue en Netlify

## Estado actual real

- La app ya funciona con autenticacion en Supabase
- Ya no existe registro libre
- El acceso se gestiona por solicitud + aprobacion admin
- Existe soporte multi-club con `club_id`
- El superadmin es `digitalnexoweb@gmail.com`
- El superadmin puede ver:
  - Dashboard
  - Socios / alumnos
  - Registrar pagos
  - Historial
  - Configuracion
  - Solicitudes
- El superadmin ya tiene selector de club en el header
- En modo `Todos los clubes` puede supervisar, pero no crear socios ni registrar pagos
- En modo `club especifico` puede operar como si fuera el cliente
- La lista de socios ya fue redisenada a formato compacto tipo CRM
- Hay paginacion en socios
- Hay recordatorio por WhatsApp
- Se puede crear categoria desde `Nuevo socio`
- Se pueden registrar pagos y descargar recibo
- Hay exportacion de historial
- El dashboard ya tiene metricas mas utiles
- `npm run build` compila correctamente

## Archivos clave

- `src/app/App.jsx`
- `src/components/Header.jsx`
- `src/components/Sidebar.jsx`
- `src/components/MemberCard.jsx`
- `src/lib/authApi.js`
- `src/lib/dataApi.js`
- `src/lib/supabase.js`
- `src/features/auth/AuthPage.jsx`
- `src/features/auth/LoginForm.jsx`
- `src/features/auth/AccessRequestForm.jsx`
- `src/features/auth/SetPasswordForm.jsx`
- `src/features/admin/AdminRequestsPage.jsx`
- `src/features/dashboard/DashboardPage.jsx`
- `src/features/members/MembersPage.jsx`
- `src/features/members/MemberFormPage.jsx`
- `src/features/payments/RegisterPaymentPage.jsx`
- `src/features/payments/PaymentsHistoryPage.jsx`
- `supabase/schema.sql`
- `supabase/functions/admin-access-requests/index.ts`
- `supabase/functions/notify-access-request/index.ts`
- `supabase/functions/email-access-review/index.ts`
- `supabase/functions/_shared/access-request-review.ts`
- `.env`

## Supabase

Proyecto configurado con:

- URL: `https://gyiivrjjecymkpvkqpfy.supabase.co`
- Frontend usando `anon key`
- Edge Functions desplegadas:
  - `admin-access-requests`
  - `notify-access-request`
  - `email-access-review`

Secrets configurados:

- `SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `ADMIN_NOTIFICATION_EMAIL=digitalnexoweb@gmail.com`
- `ADMIN_APPROVAL_SECRET`
- `APP_BASE_URL=http://localhost:5173`

Importante:

- Cuando se despliegue en Netlify, actualizar `APP_BASE_URL` con la URL publica real
- No usar `service role` en frontend

## Base de datos

Tablas ya contempladas:

- `clubs`
- `access_requests`
- `profiles`
- `categorias`
- `socios`
- `pagos`

La `schema.sql` ya fue adaptada para una base existente, no solo para base vacia.

## Flujo de acceso actual

1. Usuario completa `Solicitar acceso`
2. Se guarda en `access_requests` con `pending`
3. Llega mail al admin en `digitalnexoweb@gmail.com`
4. El admin puede aprobar o rechazar:
   - desde la app
   - o desde el mail con enlaces de aprobacion/rechazo
5. Al aprobar:
   - se crea o reutiliza el club
   - se crea o habilita el usuario auth
   - se crea el profile aprobado
   - se genera enlace para crear contrasena

## Problema importante pendiente

El mail al cliente para crear contrasena **no esta siendo confiable todavia**.

Motivo mas probable:

- se esta usando `onboarding@resend.dev`
- ese remitente de prueba suele limitar envios a correos externos

## Solucion temporal que ya funciona

Desde `Solicitudes`, para registros aprobados, existe boton:

- `Copiar activacion`

Ese boton:

- genera un enlace real de activacion
- lo copia al portapapeles si puede
- y tambien lo muestra en pantalla

Con ese link el cliente puede:

- abrir la app
- crear su propia contrasena
- entrar normalmente

## Siguiente paso recomendado

Resolver el envio real del mail de activacion al cliente.

Opciones:

1. Verificar un dominio propio en Resend y dejar de usar `onboarding@resend.dev`
2. Mantener por ahora el flujo manual con `Copiar activacion`

## Otras mejoras recomendadas despues

- Agregar selector de club tambien en sidebar o dashboard para el superadmin
- Mejorar estados de carga y error globales
- Dividir bundle grande con code splitting
- Agregar branding dinamico del club en header/sidebar
- Revisar UX final de activacion de cuenta para produccion

## Como retomar manana

1. Ejecutar `npm run dev`
2. Abrir `http://localhost:5173`
3. Entrar con `digitalnexoweb@gmail.com`
4. Ir a `Solicitudes`
5. Probar:
   - nueva solicitud
   - aprobacion
   - boton `Copiar activacion`

## Nota para continuar manana

Cuando retomemos, pedir:

`Lee SESSION_NOTES.md y sigamos desde el problema del mail de activacion al cliente`

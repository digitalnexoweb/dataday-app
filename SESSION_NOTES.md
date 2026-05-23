# Estado del proyecto

Fecha de referencia: 24 de marzo de 2026

## Objetivo

Convertir **DataDay Cuotas** en una app SaaS para gestion de cuotas de clubes, academias e institutos, con acceso controlado por DigitalNexo, soporte multi-club y operacion diaria simple.

## Stack actual

- React + Vite
- CSS custom
- Supabase
- Supabase Auth
- Edge Functions de Supabase
- Resend para emails
- Netlify en produccion

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
- El dashboard fue redisenado con cards flotantes, acento naranja y calendario de vencimientos
- La app ya fue publicada en Netlify
- La URL publica actual es `https://data-day-app367d.netlify.app`
- La version movil fue mejorada con navegacion inferior y layout mas compacto
- `npm run build` compila correctamente

## Deploy actual

- GitHub repo publico: `https://github.com/digitalnexoweb/dataday-app`
- Netlify site actual: `https://data-day-app367d.netlify.app`
- El deploy toma la rama `main`
- Los builds automaticos de Netlify quedaron pausados temporalmente para seguir desarrollando localmente sin redeploy por cada push

## Archivos clave

- `src/app/App.jsx`
- `src/components/Header.jsx`
- `src/components/Sidebar.jsx`
- `src/components/MobileNav.jsx`
- `src/components/StatCard.jsx`
- `src/lib/authApi.js`
- `src/lib/dataApi.js`
- `src/lib/supabase.js`
- `src/features/auth/AuthPage.jsx`
- `src/features/auth/LoginForm.jsx`
- `src/features/auth/AccessRequestForm.jsx`
- `src/features/auth/SetPasswordForm.jsx`
- `src/features/auth/ResetPasswordPage.jsx`
- `src/features/admin/AdminRequestsPage.jsx`
- `src/features/dashboard/DashboardPage.jsx`
- `src/features/members/MembersPage.jsx`
- `src/features/members/MemberFormPage.jsx`
- `src/features/payments/RegisterPaymentPage.jsx`
- `src/features/payments/PaymentsHistoryPage.jsx`
- `src/styles/global.css`
- `supabase/schema.sql`
- `supabase/functions/admin-access-requests/index.ts`
- `supabase/functions/notify-access-request/index.ts`
- `supabase/functions/email-access-review/index.ts`
- `supabase/functions/_shared/access-request-review.ts`
- `.env`
- `netlify.toml`

## Cambios recientes importantes

### 1. Dashboard y visual

Se hicieron cambios visuales fuertes para que el dashboard se sienta mas SaaS:

- stat cards flotantes
- color naranja como primario
- card destacada para `Ingreso del mes`
- hover mas claro y moderno
- calendario funcional de vencimientos
- boton `Salir` movido al footer del sidebar

Archivos principales:

- `src/features/dashboard/DashboardPage.jsx`
- `src/components/StatCard.jsx`
- `src/components/Sidebar.jsx`
- `src/components/Header.jsx`
- `src/styles/global.css`

### 2. Mobile

Se mejoro la experiencia en celular:

- nueva barra inferior de navegacion movil
- mejor uso del ancho en pantallas chicas
- menos sensacion de UI estirada
- cards, topbar y paneles con mejores paddings y radios en mobile

Archivos principales:

- `src/components/MobileNav.jsx`
- `src/app/App.jsx`
- `src/styles/global.css`

### 3. Recovery de contrasena

Se rehizo el flujo para Netlify + Supabase Auth:

- `Olvide mi contrasena` envia el mail a `/reset-password`
- existe pantalla exclusiva `ResetPasswordPage`
- se detecta recovery por `type=recovery` y tambien por `access_token`
- en `/reset-password` se prioriza el formulario aunque haya sesion
- el cambio de contrasena usa `supabase.auth.updateUser({ password })`
- luego muestra exito, cierra sesion y vuelve al login

Archivos principales:

- `src/lib/authApi.js`
- `src/features/auth/LoginForm.jsx`
- `src/features/auth/AuthPage.jsx`
- `src/features/auth/SetPasswordForm.jsx`
- `src/features/auth/ResetPasswordPage.jsx`
- `src/app/App.jsx`

## Supabase

Proyecto configurado con:

- URL: `https://gyiivrjjecymkpvkqpfy.supabase.co`
- Frontend usando `anon key`
- Edge Functions desplegadas:
  - `admin-access-requests`
  - `notify-access-request`
  - `email-access-review`

Secrets configurados o usados:

- `SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `ADMIN_NOTIFICATION_EMAIL=digitalnexoweb@gmail.com`
- `ADMIN_APPROVAL_SECRET`
- `APP_BASE_URL=https://data-day-app367d.netlify.app`

Importante:

- No usar `service role` en frontend
- Si cambia la URL de Netlify, actualizar `APP_BASE_URL`
- En `Authentication -> URL Configuration`, el `Site URL` y redirects deben apuntar al dominio actual de Netlify

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

## Recovery actual de contrasena

Flujo esperado ahora:

1. Usuario hace click en `Olvide mi contrasena`
2. Supabase envia mail con `redirectTo=/reset-password`
3. El usuario abre el link
4. La app entra a `/reset-password`
5. Se escucha `onAuthStateChange` y se prioriza `PASSWORD_RECOVERY`
6. Se muestra el formulario para elegir nueva contrasena aunque exista sesion temporal
7. Guarda la contrasena
8. Ve mensaje de exito, se cierra sesion y vuelve al login

Detalles tecnicos ya aplicados:

- deteccion por `type=recovery`
- soporte para `access_token` en hash o query string
- ruta exclusiva `/reset-password`
- guard principal de la app no bloquea la ruta de reset ni redirige al dashboard mientras el usuario viene de recovery

## Problema importante que sigue pendiente

El envio del mail de activacion al cliente todavia puede no ser confiable si Resend sigue usando remitente de prueba.

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

## Desarrollo local actual

Mientras se sigue iterando la app:

- Netlify queda conectado al repo pero con `Stopped builds`
- el flujo recomendado es trabajar localmente con `npm run dev`
- la app se prueba en `http://localhost:5173`
- solo cuando convenga se vuelve a activar el deploy automatico o se hace un deploy manual

## Siguiente paso recomendado

Probar de punta a punta estos flujos en produccion cuando se vuelva a deployar manualmente:

1. `Olvide mi contrasena`
2. enlace que llegue por mail y abra `/reset-password`
3. cambio real de contrasena
4. aprobacion de solicitudes con activacion
5. experiencia movil real en telefono

## Otras mejoras recomendadas despues

- Agregar code splitting para bajar el bundle grande
- Mejorar estados de carga y error globales
- Agregar branding dinamico del club en mas lugares
- Revisar UX final del recovery y activacion en produccion
- Verificar dominio propio o subdominio mas profesional

## Como retomar luego

1. Ejecutar `npm run dev`
2. Abrir `http://localhost:5173`
3. Probar login
4. Probar recovery con mail real
5. Probar dashboard en desktop y celular
6. Probar `Solicitudes`

## Nota para continuar luego

Cuando retomemos, pedir:

`Lee SESSION_NOTES.md y sigamos desde las pruebas finales de recovery, activacion y mobile en produccion`

# DataDay Cuotas

Aplicacion moderna para gestionar socios, alumnos y cuotas de clubes amateur, academias deportivas o institutos pequeños.

## Stack

- React 19 + Vite 7
- CSS moderno y modular (sin frameworks externos)
- Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Resend para emails transaccionales
- jsPDF para generacion de recibos
- Netlify para despliegue

## Correr localmente

1. Instala dependencias: `npm install`
2. Copia `.env.example` a `.env` y completa las variables
3. Usa `VITE_USE_SUPABASE=false` para trabajar con datos mock locales
4. Ejecuta `npm run dev`

## Variables de entorno del frontend

| Variable | Descripcion |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anon publica de Supabase |
| `VITE_USE_SUPABASE` | `true` para usar Supabase, `false` para mocks locales |

## Conectar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Aplica las migraciones de `supabase/migrations/`
3. Completa las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
4. Cambia `VITE_USE_SUPABASE=true`

## Edge Functions

Las Edge Functions de Supabase requieren las siguientes variables de entorno configuradas en el panel de Supabase → Edge Functions → Secrets:

| Variable | Descripcion | Requerida |
|---|---|---|
| `SERVICE_ROLE_KEY` | Clave service_role de Supabase (nunca exponerla en el frontend) | Si |
| `RESEND_API_KEY` | API key de Resend para envio de emails | Si |
| `ADMIN_NOTIFICATION_EMAIL` | Email del administrador que recibe notificaciones de nuevas solicitudes | Si |
| `ADMIN_APPROVAL_SECRET` | Secreto HMAC para firmar y verificar tokens de aprobacion/rechazo por email | Si |
| `APP_BASE_URL` | URL publica de la app (ej. `https://data-day-app367d.netlify.app`). Usado como CORS origin y redirect de recuperacion de contrasena | Si |
| `RESEND_FROM_EMAIL` | Direccion de envio de emails (ej. `DataDay Cuotas <notificaciones@tudominio.com>`). Requiere dominio verificado en Resend | Recomendado |

> **Nota de seguridad**: `SERVICE_ROLE_KEY` tiene permisos de superadmin sobre la base de datos. Solo debe usarse en Edge Functions (Deno/servidor), nunca en codigo del frontend.

## Despliegue en Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Variables de entorno: las tres variables `VITE_*` del frontend

## Scripts disponibles

| Comando | Descripcion |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera el build de produccion en `dist/` |
| `npm run preview` | Previsualiza el build de produccion |
| `npm run lint` | Ejecuta ESLint sobre `src/` (requiere `npm install` previo) |

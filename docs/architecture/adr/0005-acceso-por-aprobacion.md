# ADR 0005 — Acceso por aprobación con enlaces firmados HMAC

**Estado:** Aceptada · **Fecha:** desarrollo del proyecto

## Contexto
DataDay es operada por DigitalNexo: los clubes no deben poder auto-registrarse libremente. Hace
falta un alta controlada, pero sin obligar al superadmin a estar siempre dentro de la app.

## Decisión
Eliminar el registro libre. El solicitante crea un `access_request` (estado `pending`) vía Edge
Function. El superadmin recibe un email y puede **aprobar/rechazar desde la app o desde enlaces
del email firmados con HMAC** (`ADMIN_APPROVAL_SECRET`). La aprobación crea club + usuario +
perfil y genera un enlace de activación de contraseña. Las operaciones sensibles usan
`service_role` **solo** dentro de Edge Functions.

## Consecuencias
**Positivas:** control total del alta; el superadmin aprueba incluso desde el mail; los secretos
nunca tocan el frontend.
**Negativas / costo:** el envío de emails depende de Resend y de un dominio verificado; con
remitente de prueba puede fallar, por lo que existe el fallback "Copiar activación".

## Alternativas descartadas
- **Registro libre + verificación de email:** no cumple el control de acceso que necesita el
  negocio.
- **Aprobación solo dentro de la app:** funciona, pero los enlaces firmados en el email agilizan
  la operación del superadmin.

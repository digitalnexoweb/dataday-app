# ADR 0004 — Routing manual por estado en vez de librería de router

**Estado:** Aceptada · **Fecha:** desarrollo del proyecto

## Contexto
La app tiene un conjunto acotado de secciones (dashboard, socios, pagos, historial,
solicitudes, configuración) y se usa mayormente autenticada, como un panel.

## Decisión
Manejar la navegación con un estado `view` (`{ section, memberId }`) en `App.jsx` y render
condicional por sección, sin `react-router`. La única ruta real por URL es `/reset-password`,
que se detecta de forma explícita para el flujo de recuperación de contraseña.

## Consecuencias
**Positivas:** menos dependencias, bundle más chico, control total del flujo y de los guards de
acceso (sesión, perfil, aprobado) en un solo lugar.
**Negativas / costo:** no hay deep-linking por URL a cada sección ni historial del navegador por
vista; si en el futuro se necesitan URLs compartibles, habrá que introducir un router.

## Alternativas descartadas
- **react-router:** estándar y potente, pero agrega peso y complejidad que esta app no requiere
  hoy.

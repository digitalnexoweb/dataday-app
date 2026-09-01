# Plantillas de prompt — DataDay

Prompts reutilizables que uso para trabajar el proyecto con IA. No son prompts
"a mano alzada": aplican **prompt engineering** — cada uno define **rol**,
**contexto**, **tarea**, **restricciones**, **variables** y **formato de salida**, y
trae un **ejemplo real** ya completado.

Convención de las variables: se escriben entre llaves dobles, ej. `{{nombre_feature}}`.
Antes de enviar el prompt, se reemplazan por el valor concreto.

| # | Plantilla | Cuándo usarla |
|---|-----------|---------------|
| 01 | [Nueva feature page](01-nueva-feature-page.md) | Agregar una pantalla/sección nueva siguiendo la estructura del repo |
| 02 | [Migración Supabase club-scoped](02-migracion-supabase-club.md) | Crear una tabla nueva con `club_id`, índices y RLS |
| 03 | [Regla de negocio en la capa de datos](03-regla-negocio-datalayer.md) | Agregar/editar lógica en `dataApi.js` respetando el modo dual |
| 04 | [Auditoría de seguridad RLS/multi-tenant](04-auditoria-rls-seguridad.md) | Revisar que no se filtren datos entre clubes |
| 05 | [Nueva Edge Function (Deno)](05-edge-function-deno.md) | Crear un endpoint serverless siguiendo el patrón de acceso |

> Estas plantillas son la versión "prompt engineering" de las que subí en el Entregable 1.

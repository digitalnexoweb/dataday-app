# 05 · Nueva Edge Function (Deno)

**Cuándo usarla:** cuando necesito un endpoint serverless (envío de emails, operaciones
con service_role, webhooks) siguiendo el patrón de las funciones de acceso ya existentes.

**Variables:**
- `{{nombre_funcion}}` — carpeta/nombre (ej. `enviar-recordatorios`)
- `{{proposito}}` — qué hace
- `{{entradas}}` — body esperado
- `{{usa_service_role}}` — sí/no
- `{{envia_email}}` — sí/no (Resend)

---

## Prompt

```
Actuás como desarrollador backend con Deno y Edge Functions de Supabase.

CONTEXTO (patrón de DataDay en supabase/functions/):
- Ya existen: submit-access-request, notify-access-request, admin-access-requests,
  email-access-review, y _shared/ para lógica compartida.
- Se usa el runtime de Deno. Los secretos vienen de Deno.env.get(...):
  SERVICE_ROLE_KEY, RESEND_API_KEY, ADMIN_NOTIFICATION_EMAIL, ADMIN_APPROVAL_SECRET,
  APP_BASE_URL, RESEND_FROM_EMAIL.
- CORS: se responde a OPTIONS y se usa APP_BASE_URL como origin permitido.
- service_role SOLO acá (nunca en el front). Validar entrada y manejar errores devolviendo
  JSON { error } con el status HTTP correcto.

TAREA:
Crear la Edge Function "{{nombre_funcion}}". Propósito: {{proposito}}.
Body de entrada: {{entradas}}. ¿Usa service_role?: {{usa_service_role}}.
¿Envía email por Resend?: {{envia_email}}.

RESTRICCIONES:
- TypeScript/Deno idiomático. Manejo de CORS y de OPTIONS.
- Validar el body y responder 400 ante datos faltantes.
- No filtrar secretos en las respuestas ni en logs.
- Si envía email, usar Resend con RESEND_FROM_EMAIL y plantilla mínima en HTML.

FORMATO DE SALIDA:
1. supabase/functions/{{nombre_funcion}}/index.ts completo.
2. Si corresponde, helpers en supabase/functions/_shared/.
3. Lista de secrets que hay que configurar en Supabase → Edge Functions.
4. Comando de deploy (supabase functions deploy {{nombre_funcion}}).
```

---

## Ejemplo real (completado)

> `{{nombre_funcion}}=enviar-recordatorios`, `{{proposito}}=Enviar por email un recordatorio a los socios con cuota vencida del club`,
> `{{entradas}}={ clubId }`, `{{usa_service_role}}=sí`, `{{envia_email}}=sí`.

La IA genera `index.ts` que valida `clubId`, consulta con service_role los socios con deuda,
arma el HTML del recordatorio, los envía con Resend desde `RESEND_FROM_EMAIL`, responde
`{ enviados: n }`, y maneja CORS/OPTIONS con `APP_BASE_URL`.

# 04 · Auditoría de seguridad RLS / multi-tenant

**Cuándo usarla:** antes de un deploy o después de tocar el schema, para verificar que
ningún club pueda ver o modificar datos de otro y que no haya fugas de privilegios.

**Variables:**
- `{{alcance}}` — qué revisar (ej. `todo el schema` o `las tablas nuevas asistencias y reportes`)

---

## Prompt

```
Actuás como auditor de seguridad especializado en Supabase/PostgreSQL y modelos multi-tenant.
Sé escéptico: tu objetivo es ENCONTRAR formas de romper el aislamiento entre clubes.

CONTEXTO:
- DataDay es multi-tenant por club_id. El aislamiento debe garantizarlo la base (RLS),
  no el frontend.
- Funciones de apoyo: public.current_club_id() (club del usuario aprobado) y
  public.is_superadmin() (solo el email superadmin, rol superadmin, approved=true).
- Patrón esperado por tabla: RLS habilitado + política que exige
  club_id = current_club_id() OR is_superadmin().

TAREA:
Auditar {{alcance}} en supabase/schema.sql y en las queries de src/lib/*.js.

QUÉ BUSCAR (checklist):
1. Tablas de negocio con RLS deshabilitado o sin política.
2. Políticas "using true" o sin cláusula de club_id.
3. Métodos en dataApi.js que consulten sin filtrar por club_id.
4. Funciones security-definer con search_path no fijado o lógica que permita escalar.
5. Uso de service_role fuera de Edge Functions.
6. RPCs que no verifiquen autorización (current_club_id / is_superadmin) al inicio.

FORMATO DE SALIDA:
Tabla Markdown: | Severidad (alta/media/baja) | Ubicación (archivo:línea) | Problema | Cómo explotarlo | Fix propuesto |
Ordená de mayor a menor severidad. Si algo está bien, no lo listes. Si no hay hallazgos, decilo explícitamente.
```

---

## Ejemplo real (completado)

> `{{alcance}}=todo el schema y la capa de datos`.

La IA recorre `schema.sql`, confirma que las 8 tablas tienen RLS + política por club,
verifica que `registrar_pago_con_credito` corta con `raise exception 'No autorizado'` si el
club no coincide, y marca como recordatorio que `current_club_id()` e `is_superadmin()`
fijan `search_path = public` (correcto). Salida: sin hallazgos de severidad alta.

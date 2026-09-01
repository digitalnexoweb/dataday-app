# 01 · Nueva feature page

**Cuándo usarla:** cuando quiero agregar una pantalla/sección nueva a la app
(por ejemplo "Reportes", "Asistencias") respetando la arquitectura por features.

**Variables:**
- `{{nombre_feature}}` — nombre de la feature (ej. `asistencias`)
- `{{titulo_ui}}` — título visible (ej. `Asistencias`)
- `{{descripcion}}` — qué hace la pantalla y qué datos muestra
- `{{acciones}}` — acciones del usuario (ver / crear / editar / exportar…)

---

## Prompt

```
Actuás como desarrollador senior de React trabajando en DataDay, una SPA de React 19 + Vite.

CONTEXTO DEL PROYECTO (respetalo estrictamente):
- El código se organiza por features en src/features/<feature>/.
- El routing es manual por estado "view" en src/app/App.jsx (no hay react-router);
  cada sección se muestra con {view.section === "..."}.
- NINGÚN componente llama a supabase directo: todo acceso a datos pasa por src/lib/dataApi.js.
- La base usa snake_case y el front camelCase; la normalización vive en dataApi.js.
- Toda entidad de negocio se filtra por club_id (multi-tenant).
- CSS propio en src/styles/global.css; se reutilizan clases existentes (cards, tablas, botones).

TAREA:
Crear la feature "{{nombre_feature}}" ({{titulo_ui}}). {{descripcion}}
Acciones del usuario: {{acciones}}.

RESTRICCIONES:
- No introducir librerías nuevas ni un router.
- Mantener el estilo visual existente (usar componentes y clases ya presentes).
- Si necesito datos, agregá los métodos correspondientes en dataApi.js con soporte
  para el modo mock y el modo Supabase, sin romper la API actual.
- Accesible y responsive (la app tiene navegación mobile).

FORMATO DE SALIDA:
1. Lista de archivos a crear/modificar (ruta + una línea de propósito).
2. El código de cada archivo, completo, en bloques separados.
3. Los cambios exactos a src/app/App.jsx para registrar la sección (import + condición de view + entrada de menú).
4. Nota final: riesgos o supuestos que asumiste.
```

---

## Ejemplo real (completado)

> Variables: `{{nombre_feature}}=asistencias`, `{{titulo_ui}}=Asistencias`,
> `{{descripcion}}=Muestra una grilla mensual por socio para marcar presente/ausente por día de entrenamiento`,
> `{{acciones}}=ver la grilla del mes, marcar asistencia, exportar a CSV`.

Con eso, la IA devuelve: `src/features/asistencias/AsistenciasPage.jsx`, los métodos
`getAsistencias`/`saveAsistencia` en `dataApi.js` (con rama mock y rama Supabase filtrada
por `club_id`), y el diff de `App.jsx` para sumar la sección al Sidebar, al MobileNav y al render.

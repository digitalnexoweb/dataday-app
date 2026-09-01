# ADR 0001 — Capa de datos dual (Supabase ⇄ mocks) tras un único flag

**Estado:** Aceptada · **Fecha:** desarrollo del proyecto

## Contexto
Necesitábamos desarrollar y demostrar la app sin depender siempre de un backend disponible,
poder escribir tests sin red, y evitar que los componentes conocieran la fuente de datos.

## Decisión
Toda lectura/escritura pasa por `src/lib/dataApi.js` (y `authApi.js`), que expone una API de
dominio y decide internamente si habla con **Supabase** o con **datos mock**, según el flag
`supabaseEnabled` (`VITE_USE_SUPABASE`). Si una query a Supabase falla, cae a mocks en vez de
romper la UI. La normalización snake_case ⇄ camelCase vive también en esta capa.

## Consecuencias
**Positivas:** desarrollo/demo sin backend; tests sin red; componentes desacoplados de la
fuente; un único lugar para tocar el acceso a datos.
**Negativas / costo:** hay que mantener dos caminos por método (Supabase y mock). Se acota
concentrándolos en un solo archivo y devolviendo siempre la misma forma de datos.

## Alternativas descartadas
- **Llamar a Supabase desde cada componente:** más simple al inicio, pero acopla la UI al
  backend e imposibilita el modo offline/mock.
- **Un ORM/estado global pesado (Redux, etc.):** sobredimensionado para el tamaño de la app.

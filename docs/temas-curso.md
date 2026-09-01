# Temas del curso mapeados al proyecto

Cómo cada tema visto en el curso (IA para Software · BIOS 2026) se refleja en DataDay. La idea
no es meter todo a la fuerza, sino mostrar criterio: qué aplica, cómo, y **qué no aplica y por
qué** — que es parte de pensar como experto en IA.

| Tema del curso | Dónde aparece en el proyecto |
|---|---|
| Prompt engineering | `docs/prompts/` — 5 plantillas con rol, contexto, restricciones, variables y formato de salida |
| CLAUDE.md (contexto y reglas para la IA) | `CLAUDE.md` en la raíz |
| Skills cargables | `.claude/skills/supabase-migracion-club/` |
| Subagentes | `.claude/agents/` — `auditor-seguridad` y `revisor-codigo` |
| MCP servers | `.mcp.json` — MCP de Supabase (solo lectura) |
| Spec-driven development (SDD) | `docs/plans/spec-sdd.md` + `docs/plans/plan-implementacion.md` |
| Diagramas C4 | `docs/architecture/diagramas-c4.md` (niveles 1, 2 y 3) |
| ADR (registro de decisiones) | `docs/architecture/adr/` (técnicos) y `docs/plans/adr-personal.md` (carrera) |
| RAG, embeddings, vector DBs, chunking, pgvector | **No se usa** — ver más abajo el porqué |
| Retrieval, citas, "cuándo NO usar RAG" | Decisión documentada más abajo |
| Asserts programáticos / evals de LLM | Cómo se aplicarían a features con IA — ver más abajo |

## RAG y embeddings: por qué DataDay NO los usa (decisión consciente)

El curso enseñó RAG (embeddings, vector DBs, chunking, retrieval con pgvector) **y también
cuándo NO usarlo**. DataDay es un caso claro de "cuándo NO":

- Los datos del dominio son **estructurados y relacionales** (socios, pagos, categorías, saldos).
  Se consultan con SQL exacto e índices, no con búsqueda semántica.
- Las preguntas del negocio ("¿quién debe?", "¿cuánto entró este mes?") tienen respuestas
  **determinísticas**; RAG agregaría imprecisión y costo sin beneficio.
- Meter un vector store acá sería sobre-ingeniería.

**Dónde sí tendría sentido a futuro:** si se quisiera buscar dentro de texto libre —por ejemplo,
las **observaciones médicas** de las fichas o notas largas de socios— ahí un embedding + pgvector
sobre esos campos permitiría búsqueda semántica. Sería una feature acotada a datos no
estructurados, no el corazón de la app.

## Asserts programáticos / evals: cómo se aplicarían

Cuando se sume una feature con IA (ej. los **recordatorios inteligentes** del ADR personal),
la salida del modelo se validaría con asserts como los del curso:

- **contiene / noContiene:** que el mensaje incluya el nombre del socio y el monto, y no invente
  datos de otro club.
- **regex:** que el monto matchee el formato de moneda esperado (`$ 38.000`).
- **maxLineas / contrato de formato:** mensaje corto, sin markdown.
- **estructura:** si la IA devuelve JSON (ej. `{ socioId, mensaje }`), que parsee con los campos
  esperados.
- **toolEsperada:** que, antes de afirmar un monto de deuda, haya consultado el dato real
  (la fuente de verdad es la base, no la imaginación del modelo).

Hoy el proyecto ya practica el hábito de verificar con tests: hay pruebas con **Vitest** sobre la
lógica pura (`src/lib/__tests__/format.test.js`, `utils.test.js`). Los evals de LLM serían la
extensión natural de esa disciplina a las salidas generadas.

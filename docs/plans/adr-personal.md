# ADR Personal — Plan de carrera 90 días

**Autor:** Agustín Berardi · **Fecha:** 10 de agosto de 2026
**Formato:** contexto → opciones → decisión → plan de 90 días

> Mismo formato de ADR que uso para decisiones técnicas (ver `docs/adr/`), aplicado a mi
> carrera. Ventana: 10/08/2026 → 10/11/2026.

---

## 1. Contexto (dónde estoy hoy)

- **Situación laboral:** trabajo en una empresa de informática donde estamos empezando a
  integrar IA para automatizar tareas internas: por ejemplo, que la IA facture en lugar de
  hacerlo nosotros a mano, y que ayude en la compra de hardware que ya vendimos.
- **Experiencia y stack:** desarrollo web full-stack. Me muevo mejor con **Supabase**
  (Postgres, Auth, Edge Functions), que aprendí a fondo construyendo **DataDay**, además de
  React + Vite y JavaScript. Tengo un proyecto real en producción (DataDay, multi-club, con
  RLS, RPC atómico de pagos y Edge Functions).
- **Qué me llevo del curso:** trabajar con IA de forma profesional — CLAUDE.md como contexto,
  prompt engineering, skills cargables, subagentes y MCP, más spec-driven development, diagramas
  C4 y ADRs para documentar decisiones. Dejé de "pedirle cosas a la IA" para pasar a **diseñar
  el entorno donde la IA trabaja bien**.

## 2. Opciones (caminos para los próximos 90 días)

### Opción A — Ser el referente de IA en mi empresa actual
Llevar las automatizaciones con IA más allá de lo puntual: documentar procesos, armar prompts
y pequeños agentes para facturación y compras, y volverme la persona que impulsa esto.
- **Pros:** aprovecho el contexto donde ya estoy; impacto inmediato y medible; sin riesgo de
  ingresos.
- **Contras:** limitado al ritmo y las prioridades de la empresa.

### Opción B — Hacer crecer DataDay como producto (NexoWeb)
Convertir DataDay en un producto más sólido y con features de IA (recordatorios inteligentes,
resúmenes, asistente de cobranza), y sumar clubes.
- **Pros:** es mío, lo domino, tiene potencial comercial; combina lo que sé (Supabase) con IA.
- **Contras:** requiere tiempo fuera del trabajo; ingresos inciertos al principio.

### Opción C — Buscar un rol nuevo enfocado en IA aplicada
Cambiar de empleo a uno centrado en IA/desarrollo.
- **Pros:** salto de contexto y posible salto salarial.
- **Contras:** hoy no es necesario: mi empresa actual ya me deja aplicar IA, y tengo DataDay
  como plataforma de aprendizaje. Cambiar ahora me haría perder ese doble campo de práctica.

## 3. Decisión

Elijo una **combinación de A + B**, con A como base: **consolidarme como el referente de IA en
mi empresa actual** mientras, en paralelo, **hago crecer DataDay** aplicándole las mismas
técnicas del curso. Descarto la Opción C por ahora: no necesito cambiar de trabajo para crecer
en IA, y hacerlo me quitaría los dos entornos reales donde hoy puedo practicar y mostrar
resultados. A y B se potencian: lo que aprendo automatizando en la empresa lo llevo a DataDay,
y lo que construyo en DataDay me da autoridad técnica en la empresa.

## 4. Plan de 90 días (hitos y fechas)

### Mes 1 — hasta el 20/09/2026 · Fundaciones
- Documentar 2 procesos internos de la empresa candidatos a IA (facturación y compras de
  hardware) con su flujo actual y dónde entra la IA.
- Llevar el toolkit del curso a un repo de trabajo real: CLAUDE.md + 2 prompts de producción
  para esas automatizaciones.
- En DataDay: definir con una mini-spec (SDD) la primera feature con IA (recordatorios de
  cuota vencida). Dejar el ADR de la decisión.
- **Hito:** una automatización de facturación funcionando en un caso real + spec de la feature
  de DataDay aprobada por mí.

### Mes 2 — hasta el 20/10/2026 · Construcción
- Implementar la Edge Function de recordatorios en DataDay (usando la plantilla de prompt 05) y
  probarla de punta a punta.
- Crear un subagente/skill para la tarea que más repito en la empresa (revisión/armado de
  documentos de compra) y medir tiempo ahorrado.
- Correr el subagente `auditor-seguridad` sobre DataDay antes de cualquier release nuevo.
- **Hito:** recordatorios de cuota en producción en al menos 1 club + 1 automatización nueva
  adoptada por el equipo, con métrica de ahorro de tiempo.

### Mes 3 — hasta el 20/11/2026 · Consolidación y visibilidad
- Sumar 1–2 clubes nuevos a DataDay o dejar el onboarding listo para hacerlo.
- Presentar internamente en la empresa un breve "estado de la IA": qué automatizamos, qué
  ahorramos, qué sigue — proponiéndome formalmente como referente del tema.
- Ordenar el repo de DataDay como portfolio (README, C4, ADRs, demo) para mostrarlo.
- **Hito:** propuesta de referente de IA presentada en la empresa + DataDay presentable como
  producto y como portfolio.

## 5. Cómo mido el éxito
- Al menos **2 automatizaciones con IA** en uso real en la empresa.
- **1 feature con IA** de DataDay en producción.
- Reconocimiento explícito (aunque sea informal) como la persona de referencia en IA del equipo.

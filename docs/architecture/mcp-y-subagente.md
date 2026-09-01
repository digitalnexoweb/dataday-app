# MCP y subagentes — DataDay

El recorrido del curso incluye conectar un **MCP server** y crear **subagentes propios**.
En este repo están el MCP de Supabase y dos subagentes.

## 1. MCP server: Supabase (`.mcp.json`)

MCP oficial de Supabase en modo **solo lectura**, apuntando al proyecto real
(`--project-ref=gyiivrjjecymkpvkqpfy`). Permite que la IA consulte tablas, migraciones, logs y
advisors sin salir del editor.

### Conectarlo (sin exponer secretos)
1. Generar un Access Token en Supabase → Account → Access Tokens.
2. Exportarlo como variable de entorno (no se hardcodea):
   ```bash
   export SUPABASE_ACCESS_TOKEN=sbp_xxx   # .mcp.json lo lee con ${SUPABASE_ACCESS_TOKEN}
   ```
3. Abrir el proyecto con Claude Code → el MCP `supabase` queda disponible.
4. Verificar: "listá las tablas del proyecto" → responde sin errores.

> `--read-only` a propósito: durante desarrollo la IA inspecciona pero no modifica producción.

## 2. Subagentes propios (`.claude/agents/`)

### a) `auditor-seguridad`
Audita el aislamiento multi-tenant (RLS por `club_id`): tablas sin RLS, políticas permisivas,
queries sin scope de club, funciones security-definer inseguras, usos indebidos de
`service_role`. Devuelve hallazgos por severidad. Acceso de solo lectura (`Read`, `Grep`, `Glob`).

### b) `revisor-codigo`
Revisa diffs contra las convenciones del proyecto (acceso a datos por `dataApi.js`, filtrado por
`club_id`, normalización snake/camel, dinero en el RPC, modo dual, estilo). Devuelve tabla de
hallazgos + veredicto.

### Cómo usarlos
En Claude Code, por ejemplo:
- `> usá el subagente auditor-seguridad para revisar el schema`
- `> usá el subagente revisor-codigo sobre los cambios de la feature de pagos`

Son tareas reales y repetidas: auditar seguridad antes de cada release y revisar el código
antes de commitear.

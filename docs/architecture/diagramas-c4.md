# Diagramas C4 — DataDay Cuotas

Modelo C4 en tres niveles (Contexto, Contenedores, Componentes), en Mermaid, reflejando la
arquitectura real. GitHub renderiza estos diagramas automáticamente.

---

## Nivel 1 — Contexto

Quién usa el sistema y con qué sistemas externos habla.

```mermaid
flowchart TB
    superadmin["SSuperadmin<br/>Aprueba accesos y supervisa clubes"]
    admin["Admin de club<br/>Gestiona socios, cuotas y pagos"]
    solicitante["Solicitante<br/>Pide acceso a la plataforma"]

    subgraph sistema[" "]
        dataday["DataDay Cuotas<br/><b>SaaS multi-club de gestion de cuotas</b>"]
    end

    supabase["Supabase<br/>Postgres + Auth + Storage + Edge Functions"]
    resend["Resend<br/>Emails transaccionales"]
    cloudflare["Cloudflare Pages<br/>Hosting del frontend"]

    admin --> dataday
    superadmin --> dataday
    solicitante --> dataday
    dataday --> supabase
    dataday --> cloudflare
    supabase --> resend

    classDef person fill:#8D7DFF,stroke:#5b52b3,color:#fff
    classDef system fill:#FF6B2C,stroke:#b34a1c,color:#fff
    classDef ext fill:#141926,stroke:#5EE0D6,color:#E7ECF3
    class admin,superadmin,solicitante person
    class dataday system
    class supabase,resend,cloudflare ext
```

---

## Nivel 2 — Contenedores

Las piezas desplegables y cómo se comunican.

```mermaid
flowchart TB
    user["Usuario (navegador)"]

    subgraph cf["Cloudflare Pages"]
        spa["SPA React 19 + Vite<br/>UI, estado, routing por view<br/>recibos PDF con jsPDF"]
    end

    subgraph sb["Supabase"]
        auth["Auth<br/>sesiones y recovery"]
        db["PostgreSQL<br/>tablas + RLS + RPC de pagos"]
        storage["Storage<br/>fotos y logos"]
        edge["Edge Functions (Deno)<br/>solicitud/aprobacion de acceso"]
    end

    resend["Resend<br/>envio de emails"]

    user --> spa
    spa -->|"anon key"| auth
    spa -->|"queries + rpc"| db
    spa -->|"upload"| storage
    spa -->|"invoke"| edge
    edge -->|"service_role"| db
    edge --> resend

    classDef c fill:#141926,stroke:#5EE0D6,color:#E7ECF3
    classDef s fill:#FF6B2C,stroke:#b34a1c,color:#fff
    class spa,auth,db,storage,edge c
    class resend s
```

---

## Nivel 3 — Componentes (dentro de la SPA y la base)

Componentes internos clave y la regla de oro: la UI nunca toca Supabase directo.

```mermaid
flowchart TB
    subgraph spa["SPA — React"]
        app["App.jsx<br/>estado global, sesion, guards, routing"]
        features["features/*<br/>auth · dashboard · members · payments · admin · settings"]
        dataApi["lib/dataApi.js<br/><b>capa de datos unica</b> (Supabase o mock)"]
        authApi["lib/authApi.js<br/>sesion, perfiles, solicitudes, recovery"]
        memberUtils["lib/memberUtils.js<br/>deuda, periodos, plan de pago"]
        supaClient["lib/supabase.js<br/>cliente + flag supabaseEnabled"]
    end

    subgraph db["PostgreSQL"]
        tablas["Tablas de negocio<br/>socios · pagos · categorias · clubs ..."]
        rls["Politicas RLS<br/>current_club_id() · is_superadmin()"]
        rpc["RPC registrar_pago_con_credito<br/>pagos atomicos + saldo a favor"]
    end

    features --> app
    app --> dataApi
    app --> authApi
    dataApi --> memberUtils
    dataApi --> supaClient
    authApi --> supaClient
    supaClient --> tablas
    dataApi -->|"rpc"| rpc
    tablas --- rls
    rpc --- rls

    classDef comp fill:#141926,stroke:#5EE0D6,color:#E7ECF3
    classDef core fill:#3EE08F,stroke:#1f7a4d,color:#06231a
    class app,features,authApi,memberUtils,supaClient,tablas,rls comp
    class dataApi,rpc core
```

---

## Notas de arquitectura

- **La UI nunca llama a Supabase directo**: todo pasa por `dataApi.js` / `authApi.js`. Eso
  permite el modo mock y aísla a los componentes de la fuente de datos.
- **El aislamiento entre clubes lo garantiza la base** (RLS), no el frontend.
- **La lógica de dinero está del lado del servidor** en un RPC atómico.
- Ver decisiones detalladas en `docs/architecture/adr/`.

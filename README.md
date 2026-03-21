# DataDay Cuotas

Aplicacion moderna para gestionar socios, alumnos y cuotas de clubes amateur, academias deportivas o institutos pequenos.

## Stack

- React + Vite
- CSS moderno y modular
- Supabase como backend
- Netlify friendly para despliegue futuro

## Correr localmente

1. Instala dependencias con `npm install`
2. Copia `.env.example` a `.env`
3. Usa `VITE_USE_SUPABASE=false` para trabajar con datos mock locales
4. Ejecuta `npm run dev`

## Conectar Supabase

1. Crea un proyecto en Supabase
2. Ejecuta el SQL de `supabase/schema.sql`
3. Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
4. Cambia `VITE_USE_SUPABASE=true`

## Despliegue en Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USE_SUPABASE`

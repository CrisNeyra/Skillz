# Skillz

Red social profesional con layout Fotolog para job hunters y showcase de talento.

## Stack

- **Frontend:** Next.js (App Router), React, Tailwind, shadcn/ui, Framer Motion, Lucide
- **Backend:** FastAPI + Pydantic + SQLAlchemy + Alembic
- **DB:** PostgreSQL (Docker Compose) — SQLite fallback local sin Docker
- **Media:** Cloudinary (signed uploads) o storage local
- **Auth FE:** cookies HttpOnly vía BFF (`/api/auth/*` + proxy `/api/proxy/*`)
- **Rate limit:** Redis (`REDIS_URL`) con fallback in-memory
- **AI:** sugerencia de headline/bio, skills, captions y coach de completitud

## Estructura

```
apps/web   → Next.js (Vercel)
apps/api   → FastAPI (Railway)
docker-compose.yml → Postgres 16
```

## Setup rápido

### 1. Variables de entorno

```bash
cp .env.example .env
# Completar JWT_SECRET, CLOUDINARY_* opcionales, REDIS_URL opcional, OPENAI_API_KEY opcional
```

Demo login FE: `NEXT_PUBLIC_DEMO_LOGIN=true` (o omitir en development). En production Vercel: `NEXT_PUBLIC_DEMO_LOGIN=false`.  
Seed usuario demo (`test@test.com` / `123456Ab`) solo si `ENVIRONMENT != production`.

### 2. Base de datos

Con Docker Desktop:

```bash
docker compose up -d
# DATABASE_URL=postgresql+psycopg2://skillz:skillz@localhost:5432/skillz
```

Sin Docker: SQLite en `apps/api/skillz.db`.

### 3. API

```bash
cd apps/api
uv venv
uv pip install -r requirements.txt
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Migraciones Alembic al arrancar. Tests: `python -m pytest tests evals -q`  
Eval AI (no inventa empresas): `python -m evals.run_profile_copy`

### 4. Web

```bash
cd apps/web
npm install
npm run dev
```

Abrí http://localhost:3000  
E2E: `npm run test:e2e` (Playwright; requiere API + web arriba).

## Deploy

### API en Railway

1. Nuevo servicio desde `apps/api` (Dockerfile incluido + `railway.toml`).
2. Variables: `DATABASE_URL` (Postgres Railway), `JWT_SECRET` (≥32 chars), `ENVIRONMENT=production`, `CORS_ORIGINS=https://TU-APP.vercel.app,http://localhost:3000`, `REDIS_URL` (Upstash o Redis Railway), Cloudinary/OpenAI opcionales.
3. Healthcheck: `/health`. Comando: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Deploy con tu cuenta: `railway up` o GitHub connect.

### Web en Vercel

- Root Directory: `apps/web`
- Env: `NEXT_PUBLIC_API_URL` y `API_URL` = URL pública Railway
- `NEXT_PUBLIC_DEMO_LOGIN=false` en production
- Un push a `master` redeploya si el proyecto está conectado al repo

## Flujo MVP

1. Registrarte en `/register` → onboarding 3 pasos (`/onboarding`)
2. Seguir perfiles, ver `/feed`, buscar en `/search`, alertas en `/notifications`
3. En tu perfil (`/u/{username}` o home): subir flyer/hero/galería **desde los slots vacíos**, likes, copiar link
4. Personalizar en `/settings/customizer` (tema, contactos, career, IA: copy/skills/captions/coach)

## Funciones principales

- Auth con cookies HttpOnly (login email|usuario, refresh rotativo)
- Perfil Fotolog + follow + perfiles similares
- Feed de actividad, búsqueda, notificaciones
- Likes en media/comentarios + reportar comentarios
- Upload inline en perfil (dueño) o desde customizer
- Rate limit en auth, AI, comments y uploads

## Ops

- CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — pytest/evals + tsc/lint/build
- Backups Postgres: [`apps/api/scripts/backup_postgres.sh`](apps/api/scripts/backup_postgres.sh)
- Sentry API: set `SENTRY_DSN`
- Redis: rate limit + cache de perfiles públicos (`REDIS_URL`)

## Notas

- Docker no es obligatorio para desarrollo local (SQLite).
- Sin Cloudinary, los archivos van a `apps/api/uploads` (OK en local; en prod preferí Cloudinary).
- Sin `OPENAI_API_KEY` la IA usa heurística local determinística.
- Matching de perfiles similares = overlap de skills (Jaccard).
- Fuentes de perfil: allowlist validada en backend.

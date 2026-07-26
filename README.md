# Skillz

Red social profesional con layout Fotolog para job hunters y showcase de talento.

## Stack

- **Frontend:** Next.js (App Router), React, Tailwind, shadcn/ui, Framer Motion, Lucide
- **Backend:** FastAPI + Pydantic + SQLAlchemy + Alembic
- **DB:** PostgreSQL (Docker Compose) — SQLite fallback local sin Docker
- **Media:** Cloudinary (signed uploads)

## Estructura

```
apps/web   → Next.js
apps/api   → FastAPI
docker-compose.yml → Postgres 16
```

## Setup rápido

### 1. Variables de entorno

```bash
cp .env.example .env
cp apps/api/.env  # ya incluye SQLite para arrancar sin Docker
# Completar CLOUDINARY_* en apps/api/.env para uploads reales
```

### 2. Base de datos

Con Docker Desktop:

```bash
docker compose up -d
# Luego en apps/api/.env:
# DATABASE_URL=postgresql+psycopg2://skillz:skillz@localhost:5432/skillz
```

Sin Docker (default actual): SQLite en `apps/api/skillz.db`.

### 3. API

```bash
cd apps/api
uv venv
uv pip install -r requirements.txt
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Health: http://localhost:8000/health  
Docs: http://localhost:8000/docs

### 4. Web

```bash
cd apps/web
npm install
npm run dev
```

Abrí http://localhost:3000

## Flujo MVP

1. Registrarte en `/register`
2. Personalizar en `/settings/customizer` (fondo, fuente, flyer, slots)
3. Ver perfil público en `/u/{username}` (estructura Fotolog: flyer + 3|hero|3 + feed)

## Notas

- Docker no es obligatorio para desarrollo local (SQLite).
- Cloudinary es obligatorio para uploads de media; sin keys, el resto del perfil funciona.
- Fuentes de perfil: allowlist validada en backend (Space Grotesk, DM Sans, Instrument Serif, etc.).

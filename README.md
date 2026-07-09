# Helios Office

Helios Office is a modular intranet and HRM platform for a 200-person company. The first implementation is a runnable foundation: a Next.js dashboard/PWA, a NestJS API, Prisma schema, and local infrastructure for PostgreSQL, Redis, Keycloak, and S3-compatible object storage.

## Quick Start

```bash
npm install
copy .env.example .env
docker compose up -d postgres redis keycloak minio
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- API docs: http://localhost:4000/docs
- Keycloak admin: http://localhost:8080
- MinIO console: http://localhost:9001

## What Is Implemented

- 1Office-style dashboard shell following `.agents/skills/design-system/SKILL.md`.
- Intranet feed, company announcements, birthday/group widgets, and workflow panels.
- HRM module cards for employees, org chart, recruitment, onboarding, attendance, leave, payroll, KPI/OKR, training, and assets.
- NestJS modular API with versioned routes and mock domain data.
- Prisma schema for the main HRM/intranet entities.
- Docker Compose services for local development.

## Development Rules

- UI must use semantic CSS tokens from the design system.
- Components must include keyboard/focus states and accessible labels.
- Backend modules must stay domain-oriented and avoid cross-module data access outside services.
- New approval-based workflows should use the shared approval model before creating one-off tables.

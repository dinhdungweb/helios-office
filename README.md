# Helios Office

Helios Office is a modular intranet and HRM platform for a 200-person company. The first implementation is a runnable foundation: a Next.js dashboard/PWA, a NestJS API, Prisma schema, and local infrastructure for PostgreSQL, Redis, Keycloak, and S3-compatible object storage.

## Quick Start

```bash
npm install
copy .env.example .env
docker compose up -d postgres redis keycloak minio
npm run db:seed
npm run keycloak:bootstrap
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- API docs: http://localhost:4000/docs
- Keycloak admin: http://localhost:8080
- MinIO console: http://localhost:9001

### Đồng bộ máy chấm công

App Windows `HELIOS-CHAM-CONG` gửi batch log tới:

```text
POST http://localhost:4000/api/v1/attendance/sync
Authorization: Bearer <ATTENDANCE_SYNC_TOKEN>
```

Đặt một secret dài, ngẫu nhiên cho `ATTENDANCE_SYNC_TOKEN` trong `.env`, rồi nhập cùng URL/token trong tab API của app Windows. API lưu log gốc, chống gửi trùng, ghi lỗi mapping và tự tổng hợp lần chấm đầu/cuối thành bảng công ngày.

Seeded app users use the password from `KEYCLOAK_SEED_PASSWORD` in `.env` (`Welcome@123` by default). The default app admin is `dungdd / Welcome@123`; the Keycloak admin console uses `admin / admin`. The bootstrap script creates the `helios-office` realm, the `helios-office-web` OIDC client, realm roles, seed users, and syncs each local `UserAccount.keycloakUserId` to the real Keycloak user id.

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

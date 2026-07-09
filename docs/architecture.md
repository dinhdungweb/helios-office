# Helios Office Architecture

## System Shape

Helios Office starts as a modular monolith because the team size and expected traffic fit a single deployable unit, while the domain boundaries are kept clean enough to split later.

- `apps/web`: Next.js App Router PWA dashboard.
- `apps/api`: NestJS REST API, Swagger docs, and future WebSocket gateway.
- `apps/api/prisma`: Prisma schema and migrations.
- `docker-compose.yml`: local PostgreSQL, Redis, Keycloak, and MinIO.

## Domain Modules

- Employees: employee profile, department, manager relationship, contract, organization chart.
- Posts: intranet feed, reactions, comments, read tracking.
- Announcements: company notices, targeting, acknowledgements.
- Approvals: shared approval workflow for leave, attendance edits, payroll, recruitment, and assets.
- Attendance: shifts, check-in, imported machine logs, workday summaries.
- Payroll: payroll cycles, salary lines, payslip status.
- Reports: management dashboards and operational metrics.
- Notifications: realtime and async notification delivery.

## Scalability Defaults

- PostgreSQL remains the source of truth.
- Redis is used for queues, caching, rate limits, and future websocket fan-out.
- BullMQ workers should handle imports, reminders, notification fan-out, report snapshots, and payroll calculation.
- Materialized views should be preferred for heavy dashboards after query patterns stabilize.

## Security Defaults

- Keycloak owns authentication and MFA.
- The API owns authorization because decisions depend on roles, department scope, and reporting lines.
- Sensitive payroll and identity fields must be encrypted before production.
- Every mutation touching HR, payroll, attendance, approvals, and files must write an audit log.

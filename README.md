# Makthab — Makthab Management System

A single-tenant management system for a Masjid-o-Madarasa (Makthab): student
admissions, fee collection, attendance, expenses, staff & salaries, and
PDF/Excel reporting — with Arabic/RTL-aware UI.

## Tech stack

| Layer | Stack |
|---|---|
| **Client** | React 18 + TypeScript + Vite + Tailwind + shadcn/ui (SPA) |
| **Server** | Node 20 + Express + TypeScript + Prisma 5 + SQLite |
| **Shared** | Zod schemas + inferred TS DTOs (`@makthab/shared`) |
| **Auth** | JWT (access + refresh), roles: Admin / Accountant / Teacher |
| **Docs (PDF)** | Built-in dependency-free PDF writer; Excel via ExcelJS |

## Monorepo layout

```
packages/shared/   # @makthab/shared — Zod schemas + DTOs (server owns, client consumes)
server/            # @makthab/server*  — Express + Prisma API        (port 3000)
client/            # @makthab/client   — Vite + React SPA            (port 5173)
data/              # madrasa.db (SQLite) + generated files/{receipts,payslips,reports,photos}
docs/              # architecture, migration, reference, development docs
```
(*`server` is unscoped in package.json.) npm workspaces are declared at the repo root.

## Quick start

Prerequisites: **Node 20+**.

```bash
# 1. Install all workspace dependencies
npm install

# 2. Build shared schemas, create + seed the database
npm run build:shared
npm run db:reset -w server        # prisma migrate + seed (idempotent)

# 3. (optional) Import the legacy Excel data — see docs/migration/MIGRATION.md
npm run migrate:xlsx -w server

# 4. Start both dev servers
npm run dev
```

- Client: <http://localhost:5173>
- API: <http://localhost:3000>  ·  health: <http://localhost:3000/health>

### Seed logins

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin (full access) |
| `accountant` | `accountant123` | Fees, finance, reports |
| `teacher` | `teacher123` | Attendance |

## Scripts (root)

```bash
npm run dev            # server + client together (concurrently)
npm run dev:server     # API only
npm run dev:client     # SPA only
npm run build          # build shared, server, client
npm run typecheck      # typecheck all three workspaces
npm run db:migrate     # prisma migrate dev   (-w server)
npm run db:seed        # seed lookup tables + logins
npm run db:reset       # reset + migrate + seed
```

Server-only: `npm run migrate:xlsx -w server` (data import), `npm run test -w server` (Jest integration suite).

## Modules

- **Students** — admissions, profiles, soft-delete, admission-letter PDF
- **Fees** — record payments (receipt PDF + wa.me WhatsApp link), defaulters, fee structures
- **Attendance** — per-class marking (single/bulk), monthly summary, low-attendance alerts
- **Finance** — expenses, staff, salary/payroll runs
- **Reports** — fee-collection, defaulters, attendance, expenses, salary register, financial summary (PDF + Excel)
- **Dashboard** — headline KPIs and recent activity

## API

Base URL `http://localhost:3000/api/v1`. JWT Bearer auth; standard envelopes
`{ data }` / `{ error: { code, message } }`. See
[`docs/architecture/BUILD_CONTRACT.md`](docs/architecture/BUILD_CONTRACT.md)
for the full endpoint and data-model contract.

## Configuration

`server/.env` (see `server/.env.example`):

```
DATABASE_URL="file:../../data/madrasa.db"
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=...
JWT_REFRESH_SECRET=...
WHATSAPP_GATEWAY=walink
```

`client/.env`: `VITE_API_URL=http://localhost:3000/api/v1`.

## Documentation

See [`docs/`](docs/) — architecture, the build contract, the data-migration
guide, and testing notes.

---

**Built for a Masjid-o-Madarasa.**

# HomeAIArch

Automated home layout design backend (NestJS + TypeScript). Phase 0 feasibility
prototype: a user supplies a plot and structured preferences, the app generates
a valid floor layout, then **iterates** on it from change-requests, and records
feedback as structured data (FRs in `docs/SRS.md`).

The product's heart is the feedback loop: **design → change → redesign →
feedback** — not any single endpoint.

## Status

Phase 0: deterministic engine + engine-over-HTTP slice (users, plots, templates,
profiles, projects, designs, iterations). No auth yet (`userId` is a placeholder
— JWT lands in Phase 1, ADR-0003).

## Tech stack

- NestJS 11, TypeScript strict, ESLint + Prettier
- Prisma 6 + SQLite (`dev.db`) for local dev; PostgreSQL via `docker-compose` for DB-backed runs
- Zod for document-shape validation at the service layer
- Jest (unit + property) and supertest-based e2e

## Prerequisites

- Node.js ≥ 20 (tested on Node 24)
- npm

## Setup

```powershell
npm install
npm run prisma:generate
npx prisma db push            # create/re-sync dev.db from prisma/schema.prisma
npm run prisma:seed           # seed regional DesignTemplates (standard-india, south-india-compact)
```

`.env` (a template lives at `.env.example`): `DATABASE_URL=file:./dev.db`,
`PORT=3000`, `API_BASE_PATH=/api/v1`. For Postgres instead of SQLite, point
`DATABASE_URL` at a Postgres instance (e.g. `npm run db:start` for the docker
one) and run `npx prisma db push` against it.

> `prisma db push --force-reset` recreates the DB and wipes data — only use it
> when you want a clean slate after schema changes.

## Run

```powershell
npm run start:dev     # watch mode on http://localhost:3000
```

Health (outside the `/api/v1` prefix): `GET /health` and `GET /health/ready`.

## Verify

```powershell
npm run verify      # lint + format:check + typecheck + unit/property tests
npm run build       # nest build
npm run test:e2e    # full API happy path (needs a seeded DB)
```

## Units & determinism (ADR-0005)

- Engine and persistence work in **integer millimetres (mm, areas mm²)** — no
  floats in geometry. Dual geometry per room: `externalGeometry`
  (wall-to-wall) for constraint reasoning and `internalGeometry` (occupiable)
  for scoring; `x/y/width/depth` in the layout are the inner rectangles.
- The API accepts **metres/feet for plot dimensions and m² for room-area bounds**
  and normalizes to mm at the edge (e.g. `width: 40, unit: 'FT'` → `widthMm: 12192`).
- Templates/stored snapshots keep **m² area bounds but mm lengths**
  (`minSideMm`, `counterMinMm`, `wallThicknessMm`, staircase `widthMm/depthMm`).
- Generation is deterministic: same inputs + same `seed` → same layout. Pass
  `seed` in the designs/iterations bodies to reproduce a layout; without it the
  engine uses a deterministic default.

## API quick tour

All under `/api/v1` (see `docs/LLD.md` §5 for the full table).

1. **Templates** — regional defaults:
   `GET /api/v1/templates`
2. **Users** — placeholder identity:
   `POST /api/v1/users { "email", "name" }`
3. **Plots** — your land:
   `POST /api/v1/plots { "ownerId", "width": 40, "depth": 60, "unit": "FT", "openSides": 3 }`
4. **Profiles** — preferences frozen from a template at creation (FR-4.1):
   `POST /api/v1/profiles { "userId", "name", "templateId", "floors": 2, "rooms": [{ "type": "living", "count": 1 }, ...], "kitchen": { "counterMinM": 3.2 } }`
5. **Projects** — bind a plot + profile:
   `POST /api/v1/projects { "ownerId", "plotId", "homeProfileId", "name" }`
6. **Designs** — v1 layout:
   `POST /api/v1/projects/:projectId/designs { "seed": 123 }`
7. **Iterate** — branch a child version from a change-request (parent immutable):
   `POST /api/v1/projects/:projectId/designs/1/iterations { "changeRequest": { "removeTypes": ["dining"] }, "seed": 123 }`
8. **History** — `GET /api/v1/projects/:projectId/designs` and
   `GET /api/v1/projects/:projectId/designs/:designId`

Change-requests and feedback are **structured, not free-text**: store shapes are
stable and machine-readable so future preference-learning needs no NLP
(`docs/LLD.md` §4, `src/modules/prefs/schemas.ts`).

The design payload returns a layout with `unit: 'mm'`, per-floor rooms with
`externalGeometry`/`internalGeometry`/`areaMm2`, wall `connections`, and
`metrics` (built-up / room / circulation area in mm², plot coverage, score).
Geometrically unsolvable inputs fail with an `UnsolvableLayout` error carrying
reasons + hints — never a half-valid layout (FR-5.4).

## Docs

- `docs/ROADMAP.md` — what we build when (Phases 0–5)
- `docs/SRS.md`, `docs/HLD.md`, `docs/LLD.md` — requirements, architecture, design
- `docs/constraints/` — topological/geometric/objective specs + the floor-plan DSL (canonical model)
- `docs/decisions/` — Architecture Decision Records (mm/dual-geometry = ADR-0005)
- `docs/Plan.md` — the real-world planning negotiation this app models
- `AGENTS.md` — how to contribute (read before coding)

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

## Swagger / OpenAPI

The API is self-documented. With the app running:

| Resource     | URL                               |
| ------------ | --------------------------------- |
| Swagger UI   | `http://localhost:3000/docs`      |
| OpenAPI JSON | `http://localhost:3000/docs-json` |
| OpenAPI YAML | `http://localhost:3000/docs-yaml` |

Schemas are introspected from the controllers and DTOs via the
`@nestjs/swagger` compiler plugin, so every request/response shape, enum,
default, and required field is shown — use **Try it out** in the UI to run the
flow below without writing any client code. Both the UI and the JSON/YAML
documents live outside the `/api/v1` prefix.

## End-to-end flow (recommended call order)

The calls are **chained**: each step returns an id you must pass into the next
one. This is the full **design → change → redesign** feedback loop that the
product is built around. `npm run test:e2e` automates exactly this sequence.

| Step | Call                                                            | Body (key fields)                                                                                                          | Reuse from response (value to forward) |
| ---- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1    | `GET /api/v1/templates`                                         | —                                                                                                                          | `templateId` ← `[0].id`                |
| 2    | `POST /api/v1/users`                                            | `{ "email", "name" }`                                                                                                      | `userId` ← `id`                        |
| 3    | `POST /api/v1/plots`                                            | `{ "ownerId", "width": 40, "depth": 60, "unit": "FT", "openSides": 3 }`                                                    | `plotId` ← `id`                        |
| 4    | `POST /api/v1/profiles`                                         | `{ "userId", "name", "templateId", "floors": 2, "rooms": [{ "type": "living" }, ...], "kitchen": { "counterMinM": 3.2 } }` | `homeProfileId` ← `id`                 |
| 5    | `POST /api/v1/projects`                                         | `{ "ownerId", "plotId", "homeProfileId", "name" }`                                                                         | `projectId` ← `id`                     |
| 6    | `POST /api/v1/projects/:projectId/designs`                      | `{ "seed": 123 }`                                                                                                          | `designId` ← `id` (initial layout)     |
| 7    | `POST /api/v1/projects/:projectId/designs/:designId/iterations` | `{ "changeRequest": { "removeTypes": ["dining"] }, "seed": 123 }`                                                          | child layout (version 2)               |
| 8    | `GET /api/v1/projects/:projectId/designs`                       | —                                                                                                                          | version history                        |

Steps 6→7 are repeatable: every iteration branches a new version off the parent
while the parent stays immutable, so you can keep refining (enlarge/shrink
rooms, add/remove types, move rooms) until the layout is accepted — then record
feedback (Phase 1) so future designs improve.

Detailed request/response bodies for each endpoint are in Swagger (`/docs`) and
`docs/LLD.md` §5.

Change-requests and feedback are **structured, not free-text**: store shapes are
stable and machine-readable so future preference-learning needs no NLP
(`docs/LLD.md` §4, `src/modules/prefs/schemas.ts`).

The design payload returns a layout with `unit: 'mm'`, per-floor rooms with
`externalGeometry`/`internalGeometry`/`areaMm2`, wall `connections`, and
`metrics` (built-up / room / circulation area in mm², plot coverage, score).
Geometrically unsolvable inputs fail with an `UnsolvableLayout` error carrying
reasons + hints — never a half-valid layout (FR-5.4).

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

## Docs

- `docs/ROADMAP.md` — what we build when (Phases 0–5)
- `docs/SRS.md`, `docs/HLD.md`, `docs/LLD.md` — requirements, architecture, design
- `docs/constraints/` — topological/geometric/objective specs + the floor-plan DSL (canonical model)
- `docs/decisions/` — Architecture Decision Records (mm/dual-geometry = ADR-0005)
- `docs/Plan.md` — the real-world planning negotiation this app models
- `AGENTS.md` — how to contribute (read before coding)

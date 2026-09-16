# ROADMAP — HomeAIArch Studio (frontend)

How the UI gets built, in order. Each phase produces something runnable.

## Phase A — Shell & contract (groundwork)
- [x] Scaffold Angular 22 standalone app (`frontend/`)
- [ ] Add TypeScript model layer (`src/app/models/`) mirroring backend DTOs
- [ ] `ApiService` (base URL + error mapping) + `SessionService`
- [ ] App shell (nav, session bar, routes, lazy pages)
- **Done when:** `npm run build` green; a smoke page lists templates from a
  running seeded backend through the proxy.

## Phase B — Manage domain entities
- [ ] Wizard (template → plot → profile → project) with backend calls per step
- [ ] Plots page (CRUD)
- [ ] Profiles page (CRUD)
- [ ] Projects page (list/show)
- **Done when:** end-to-end creation matches backend
  `test/app.e2e-spec.ts` happy path from the UI (manual).

## Phase C — Design studio (the product loop)
- [ ] `render/` pure SVG floor-plan module + geometry
- [ ] `FloorPlanCanvas` component (floors, walls, rooms, doors, stairs)
- [ ] `MetricsPanel` (score/breakdown/areas/coverage)
- [ ] `DesignHistory` (version list, load any version)
- [ ] `ChangeRequestForm` (remove/add/override/coverage) → iterations
- [ ] UNSOLVABLE_LAYOUT error presentation (reasons + hints)
- **Done when:** design → change → redesign loop is fully clickable and a same-seed
  rerun reproduces identical canvas E2E-verified.

## Phase D — Hardening & verification
- [ ] Vitest unit tests: renderer golden cases, geometry, services
  (HttpTestingController), change-request form payloads
- [ ] Lint + prettier setup/verify script; typecheck strict
- [ ] Acceptance criteria pass (SRS §5); docs (SRS/HLD/LLD) in sync
- **Done when:** `npm run verify` green and all SRS §5 boxes ticked.

## Out of scope (later phases, do NOT build now)
- Auth/JWT UI (backend Phase 1), feedback like/dislike controls (backend
  Phase 2), adaptive learning (Phase 3), export/budget (Phase 4), AI-assisted
  edits (Phase 5), Angular SSR/prerender.
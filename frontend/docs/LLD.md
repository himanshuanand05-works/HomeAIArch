# LLD — HomeAIArch Studio (Angular UI) — Low-Level Design

Concrete modules, routes, models, services, components, and the testing
strategy. Everything is standalone (no NgModules). Angular 22, TypeScript
strict, SCSS, `@angular/build` application builder, Vitest via
`@angular/build:unit-test`.

## 0. Canonical API (consumed contract)

Base: `http://localhost:3000/api/v1` (dev proxy), env `API_URL` override.

| Method | Path | Body (key) | Response |
| - | - | - | - |
| GET | `/templates` | — | `TemplateView[]` |
| POST | `/users` | `{email, name}` | `User` |
| GET | `/users` | — | `User[]` |
| POST | `/plots` | `{ownerId,width,depth,unit,openSides}` | `PlotView` |
| GET | `/plots?ownerId=` | — | `PlotView[]` |
| PATCH/DELETE | `/plots/:id` | — | — |
| POST | `/profiles` | `{userId,name,templateId,floors,rooms[],kitchen?,bathConnectivity?,mandatory?,maxCoverage?}` | `ProfileView` |
| GET | `/profiles?userId=` | — | `ProfileView[]` |
| PATCH/DELETE | `/profiles/:id` | — | — |
| POST | `/projects` | `{ownerId,plotId,homeProfileId,name?}` | `ProjectView` |
| GET | `/projects?ownerId=` / `/projects/:id` | — | `ProjectView[]`/`ProjectView` |
| DELETE | `/projects/:id` | — | — |
| POST | `/:projectId/designs` | `{seed?}` | `DesignView` (v1) |
| GET | `/:projectId/designs` | — | version list (light) |
| GET | `/:projectId/designs/:versionNumber` | — | `DesignView` |
| POST | `/:projectId/designs/:versionNumber/iterations` | `{changeRequest, seed?}` | `DesignView` (child) |

Error payload: `{statusCode, code, message, details?, traceId}` with
`code ∈ {VALIDATION, RESOURCE_NOT_FOUND, CONFLICT, UNSOLVABLE_LAYOUT,
INVALID_CHANGE_REQUEST, INTERNAL}`.

## 1. Directory layout

```
src/
  main.ts                     bootstrap
  app/
    app.ts / app.routes.ts / app.config.ts / app.scss
    models/                   typed backend contract (one file per domain)
    errors/                   api-error.ts (+ mapper)
    core/
      api.service.ts          HttpClient wrapper + error mapping
      session.service.ts      active userId (localStorage)
    features/
      home/…
      wizard/…
      templates/…
      plots/…
      profiles/…
      projects/…
      studio/
        studio-page.ts/html
        floor-plan-canvas.ts/html   (SVG wrapper)
        change-request-form.ts/html
        design-history.ts/html
        metrics-panel.ts/html
    render/                   PURE module: floor-plan svg generation
      geometry.ts             mm→px transforms
      floor-plan.ts           layout → svg node tree (plain objects)
    shared/
      api-error-banner.…      error display component
      session-bar.…           “acting as” bar
      spinner.…
```

## 2. Models (`src/app/models/`)

Mirror the backend DTOs exactly (see backend `src/modules/*/…service.ts` + the
serializer in `src/modules/layout/engine/algorithmic/layout-serializer.ts`):

- `UserModel` `{id, email, name, createdAt}`
- `TemplateModel` `{id, slug, name, region, version, isActive, wallThicknessMm,
  wallNote, circulationRatio, doorWidthMm, staircase, roomDefaults,
  kitchenDefaults, bathDefaults, mandatoryDefaults}`
- `PlotModel` `{id, ownerId, widthMm, depthMm, unit: 'M'|'FT', widthRaw,
  depthRaw, openSides, createdAt, updatedAt}`
- `ProfileRoom` (input) `{type, count?, minM2?, idealM2?, maxM2?, minSideM?}`
- `KitchenInput` `{minM2?, idealM2?, maxM2?, counterMinM?}`
- `BathConnectivityInput`, `ParkingInput`, `MandatoryInput`
- `CreateProfilePayload` `{userId, name, templateId, floors, rooms, kitchen?...}`
- `ProfileModel` `{id, userId, name, templateId, floors, rooms, kitchen,
  bathConnectivity, mandatoryRequirements, maxCoverage, templateSnapshot,
  createdAt, updatedAt}`
- `ProjectModel` `{id, ownerId, name, plotId, homeProfileId, plotSnapshot,
  prefsSnapshot, createdAt, updatedAt}`
- `Layout` (`unit:'mm'`, `resolutionMm`, `wallThicknessMm`, `plot{widthMm,
  depthMm, openSides}`, `floors[]`, `connections[]`, `metrics`), `Floor`,
  `Room` (`x,y,width,depth` inner rect + `internalGeometry` + `externalGeometry`
  + `areaMm2` + `props`), `RoomRect`, `Connection` (`kind: door|passage|stair`),
  `LayoutMetrics` (`builtUpAreaMm2`, `roomAreaMm2`, `plotCoverage`,
  `circulationMm2`, `score`, `scoreBreakdown`)
- `DesignView` `{id, projectId, versionNumber, parentId, status,
  changeRequest, layout, metrics, diagnostics, seed, createdAt}`
- `ChangeRequest` `{overrideRooms?, addRooms?, removeTypes?, maxCoverage?}`

No `any`. Unknown JSONB shapes (snapshots) use explicit interfaces with only the
fields the UI actually reads.

## 3. Services

- `ApiService`: `get/post/patch/delete<T>(path, body?, params?)`;
  resolves relative `/api` prefix from `API_URL` or proxy; maps non-2xx to
  `ApiError`.
- `SessionService`: `users` signal list, `activeUserId` signal ↔ localStorage
  key `homeaiarch.session.userId`; `ensureUser(name, email)` → create-or-reuse
  (reuse by first match on `ownerId` scope is per-actor; UI just stores the id).
- `TemplatesService.list()`, `UsersService.list()/create()`, `PlotsService.list/
  create/update/remove`, `ProfilesService.list/create/update/remove`,
  `ProjectsService.list/create/remove`, `DesignsService.generate/list/get/
  iterate`.

Each domain service uses a `signal<T[] | null>` for its list and an `error`
signal for the last mapped error; components bind to them.

## 4. Routes (lazy)

| Route | Loads |
| - | - |
| `/` | `HomePage` — session card, recent projects, CTA to wizard |
| `/wizard` | `WizardPage` — stepper (template → plot → profile → project) |
| `/templates` | `TemplatesPage` |
| `/plots` | `PlotsPage` |
| `/profiles` | `ProfilesPage` |
| `/projects` | `ProjectsPage` |
| `/projects/:id/design` | `StudioPage` — canvas + iterate + history |
| `*` | redirect to `/` |

Route data defines the title; the shell binds nav links + session bar.

## 5. Key components

### 5.1 FloorPlanCanvas
Inputs: `layout: Layout`, `floorNumber: number`, `highlightRoomIds?: string[]`.
Uses `renderFloorPlan(layout, floor, opts)` from `render/` to produce an SVG
tree, then renders it. Emits `(roomClick)` with `roomId`. Overlay scaling:
`scale = min(pageW/plot.widthMm, pageH/plot.depthMm)` with 1:1 fixed aspect; a
`pxPerMm` label reflects the room areas. Walls drawn from `externalGeometry`
(rectangle outline) filled with a wall color; interior fill transparent so room
labels read clearly. Doors/stairs from `connections`.

### 5.2 ChangeRequestForm
Inputs: `layout` (current version) and `roomTypes` (registered types snapshot).
Radio/segmented operation: **remove types** (multi-select of present types),
**add room** (type picker + count + optional bounds), **override room** (present
type + optional `minMm2/idealMm2/maxMm2` in m² shown to user, converted to mm²
client-side), **coverage cap**. Submit builds a `ChangeRequest`, emits
`(submit)` with `{changeRequest, seed}`.

### 5.3 StudioPage
Loads project + designs; left column = canvas + floor tabs; right column =
metrics, change-request form, version history; a version picker switches the
canvas without refetch (list rows carry versions, GET only on demand).

### 5.4 WizardPage
4 steps with validation boundaries: each step collects its payload, calls the
backend immediately on **Next**, and stores the returned id for the next step
(so failures surface where they happen). Final step creates the project and
navigates to `/projects/:id/design`.

## 6. Testing strategy

- **Renderer (pure, highest value)**: `render/floor-plan.spec.ts` — golden SVG
  attributes for a small known layout: plot boundary size in px from mm,
  wall-stroke width vs room fill, room label text, door markers. No DOM needs —
  asserts on the SVG tree shape.
- **Geometry**: mm→px scale tests (aspect preservation, no float drift —
  use integer mm inputs).
- **Services**: `HttpTestingController` (`provideHttpClientTesting`) per domain
  service: happy path mapping, error mapping to `ApiError` codes (esp.
  `UNSOLVABLE_LAYOUT` → reasons present), correct URL/params.
- **Components**: Angular `TestBed` + mocks for services; subscription/
  click-driven flows (e.g., iterate form builds the expected `ChangeRequest`
  payload).
- **E2E parity**: the wizard flow mirrors backend `test/app.e2e-spec.ts`
  step-for-step; verified manually against a running seeded backend
  (`npm run verify` on backend, then `start` frontend).

Commands (root of `frontend/`):

```powershell
npm run verify      # lint + format:check + typecheck + unit tests
npm run build       # ng build (production budgets enforced)
```

## 7. Config

- `.env`/environment override: `API_URL` (else proxy fallback `/api`).
- Dev serve: `ng serve` (proxy `proxy.conf.json`).
- `SESSION_KEY` constant for localStorage (single place, injectable token).
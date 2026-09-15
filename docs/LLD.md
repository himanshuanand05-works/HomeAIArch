# Low-Level Design (LLD)

**Project:** HomeAIArch
**Doc version:** v0.1 (DRAFT)
**Satisfies:** `docs/SRS.md`, implements `docs/HLD.md`
**Recommended stack:** NestJS 11, TypeScript (strict), Prisma + PostgreSQL,
class-validator/class-transformer, @nestjs/swagger, Jest + Supertest + fast-check
(property tests), ESLint + Prettier, Docker Compose for dev.

---

## 0. Conventions Used
- Endpoints: REST under `/api/v1`. Response envelope not used; HTTP status +
  uniform error body (SRS §6.3).
- All DTOs validated by the global `ValidationPipe` (whitelist, forbidNonWhitelisted).
- Determinism: all pseudo-randomness injected via a seedable RNG.
- Money/units: `BigDecimal`-free; numbers are plain JS numbers in v1 (areas ≤
  6 significant digits, fine for m²). Never do percent math on currency (none in v1).
- Errors: thrown as `DomainError` subclasses carrying a stable `code` from
  `ErrorCode` enum; mapped to HTTP in a global exception filter.

---

## 1. Repository Layout

```
src/
├── main.ts                       bootstrap, global pipes/filters, swagger
├── app.module.ts
├── common/
│   ├── dto/                       pagination, id params
│   ├── errors/
│   │   ├── error-codes.ts         enum of stable codes
│   │   ├── domain-error.ts        base class
│   │   └── http-exception.filter.ts
│   ├── decorators/                (e.g., @UserId() when auth lands)
│   └── util/                       seedable-random.ts, units.ts, validation.ts
├── config/
│   └── env.validation.ts          zod/class-validator schema for process.env
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                     seeds DesignTemplates
│   └── migrations/
├── modules/
│   ├── users/
│   ├── plots/
│   ├── templates/
│   ├── profiles/
│   ├── projects/
│   ├── layout/
│   │   ├── engine/
│   │   │   ├── layout-generator.port.ts        (interface)
│   │   │   ├── algorithmic/
│   │   │   │   ├── space-partitioner.ts
│   │   │   │   ├── connectivity-plug.ts
│   │   │   │   ├── constraint-checker.ts
│   │   │   │   ├── scorer.ts
│   │   │   │   └── layout-serializer.ts
│   │   │   ├── generation-request.ts            (pure input model)
│   │   │   └── room-registry.ts                 (type → defaults)
│   │   ├── layout.service.ts                    (orchestrates repo + engine)
│   │   └── layout.repository.ts                 (Prisma: version tree ops)
│   └── feedback/
├── e2e/
└── test/                          engine property tests (fast-check)
```

---

## 2. Data Model (Prisma — initial schema, additive migrations only)

```prisma
enum UserStatus { ACTIVE, DEACTIVATED }

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  status    UserStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  plots     Plot[]
  projects  Project[]
  profiles  HomeProfile[]
  feedback  Feedback[]
}

enum Unit { M, FT }

model Plot {
  id      String @id @default(uuid())
  ownerId String
  owner   User   @relation(...)
  widthM  Float          // normalized meters
  depthM  Float
  unit    Unit   @default(M)   // unit the user entered
  widthRaw  Float           // as entered
  depthRaw  Float
  openSides Int   @default(3) // 1..4 — plot context (FR-3.2)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  projects Project[]
}

model DesignTemplate {
  id        String @id @default(uuid())
  slug      String @unique
  name      String            // "Standard (India norms)"
  region    String?           // "IN", "IN-South", ...
  version   Int    @default(1)
  isActive  Boolean @default(true)
  wallThicknessM Float        // e.g., 0.2286 (9" brick)
  wallNote  String?           // "9\" brick"
  circulationRatio Float @default(0.08)
  doorWidthM   Float @default(0.9)
  staircase Json   // { widthM: 1.2, depthM: 2.4, landingM: 0.9 }
  roomDefaults Json  // { "<roomType>": {minM2, idealM2, maxM2, minSideM, note} }
  kitchenDefaults Json // { minM2, idealM2, maxM2, counterMinM }
  bathDefaults Json // { ensuite: {minM2, idealM2}, common: {...}, wc: {...} }
  mandatoryDefaults Json // { attachedBathrooms: true, indoorParking: false, ... }
  createdAt DateTime @default(now())
  profiles  HomeProfile[]
}

model HomeProfile {
  id        String @id @default(uuid())
  userId    String
  user      User   @relation(...)
  name      String            // "My house"
  templateId String?
  template  DesignTemplate? @relation(...)
  templateSnapshot Json       // expanded template at creation/edit (FR-3.0)
  floors    Int          @default(1)          // 1..4
  rooms     Json         // [{type, minM2, maxM2, idealM2, count, extras}]
  kitchen   Json?        // {minM2, maxM2, idealM2, counterMinM}
  bathConnectivity Json // { ensuite: true, common: 1, wcPerFloor: 1 }
  mandatoryRequirements Json // { openSides?, attachedBathrooms, indoorParking: {required, cars}, outdoorParking: {required, cars} }
  maxCoverage Float?     // 0..1
  focus     Json?        // { type: "BEDROOMS"|"LIVING", ratio }
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  projects  Project[]
}

model Project {
  id        String @id @default(uuid())
  ownerId   String
  owner     User    @relation(...)
  plotId    String
  plot      Plot    @relation(...)
  homeProfileId String?
  homeProfile HomeProfile? @relation(...)
  name      String
  /// snapshot of the CHOSEN home profile (expanded) AT CREATION (immutable per project)
  prefsSnapshot Json
  /// snapshot of plot including openSides AT CREATION
  plotSnapshot  Json
  status    String @default("ACTIVE")   // ACTIVE, ARCHIVED, DELETED
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  versions  DesignVersion[]
}

model DesignVersion {
  id            String    @id @default(uuid())
  projectId     String
  project       Project   @relation(...)
  versionNumber Int
  parentId      String?
  parent        DesignVersion? @relation("VersionTree", fields: [parentId], references: [id])
  children      DesignVersion[] @relation("VersionTree")
  plotSnapshot  Json      // plot dims + openSides, frozen
  prefsSnapshot Json      // expanded profile used (incl. wall thickness, mandatory reqs)
  changeRequest Json?     // the delta vs parent (null for initial)
  layout        Json      // the generated layout (see §6)
  metrics       Json      // { builtUpM2, coverage, score, violations: [] }
  diagnostics   Json?     // warnings/notes on soft constraints
  seed          Int?      // RNG seed used
  status        String    @default("GENERATED") // GENERATED, ACCEPTED, REJECTED
  createdAt     DateTime  @default(now())
  feedback      Feedback[]

  @@unique([projectId, versionNumber])
  @@index([projectId])
}

model Feedback {
  id              String @id @default(uuid())
  userId          String
  user            User   @relation(...)
  designVersionId String
  designVersion   DesignVersion @relation(...)
  rating          Int?    // 1..5
  comment         String?
  tags            Json    // [{ roomId?, scope: "GLOBAL"|"ROOM", tag: FeedbackTag }]
  likes           Json    // [{ roomId?, category, note? }]   structured, FR-7.2
  dislikes        Json
  createdAt       DateTime @default(now())
  @@index([userId])
  @@index([designVersionId])
}
```

`Json` fields are validated by runtime domain validators (Zod) on read/write —
Prisma's `Json` is permissive; we enforce shape in the service layer.

---

## 3. Engine — Detailed Design

### 3.1 Port
```ts
interface ILayoutGenerator {
  generate(req: GenerationRequest): GenerationResult;
}
```
- `GenerationRequest`: `{ plot: {widthM, depthM}, prefs: ValidatedPrefs, seed?: number, parent?: {layout: Layout, changeRequest?: ChangeRequest} }` — frozen input.
- `GenerationResult`: `{ layout: Layout, metrics: Metrics, score: ScoreBreakdown, diagnostics: Diagnostic[] } | unsolvable → throws UnsolvableLayoutError with `ConstraintViolation[]` details`.

### 3.2 Algorithm (v1 — top-down space partition)
1. **Expand inputs**: take the project's expanded profile snapshot: combine
   template defaults (wall thickness, room defaults, staircase, circulation)
   with user overrides; build the *room list* incl. kitchen, bathrooms/W.C.s
   (ensuite and common), parking if `indoorParking.required`, and stairs.
2. **Wall ring**: inset the plot by `wallThicknessM` on each side → *usable
   floor rect*. `builtUpM2` = outer footprint incl. the wall band (FR-5.2).
3. **Stair column**: multi-floor → reserve one aligned stair rect
   (`staircase {widthM, depthM}`, template) per floor at the same (x, y).
4. **Floor assignment**: ground floor keeps entrance-facing rooms (living,
   kitchen, dining, parking, common bath), upper floors keep bedrooms + ensuite/
   wc. Ensuites split their bedroom block: carve the bath sub-rect from a corner
   of the bedroom's bound with a door between (FR-3.2 attached bathrooms).
5. **Guillotine partition**: divide each usable floor rect into room rectangles
   by recursive axis cuts. Rooms considered in `idealM2` desc order; cumulative
   areas drive split positions; leftover area is redistributed proportionally so
   `area ≥ minM2` is preserved. Split axis by aspect ratio; seeded RNG only for
   ties (determinism guaranteed without seed).
6. **Connectivity plug**: build the adjacency graph post-partition:
   - doors/passages along shared edges (≥ `doorWidthM` overlap),
   - every occupied floor connected via the stair column,
   - ensuite bath → host bedroom door; common bath & W.C. reachable,
   - `entrance` node on the plot side that is open (openSides) in v1.
7. **Check + score**: hard checker (SRS §2.4 list) → fail = `UnsolvableLayout`
   with reasons/hints (FR-5.4); scorer rewards square-ish rooms, ideal-area
   adherence, ensuite adjacency, kitchen-near-dining, windows on open sides,
   and (on iteration) stability vs parent.
8. **Retries**: same request re-run with up to `N` alternative seeds within the
   latency budget; best score wins. No seed → deterministic default ordering.
9. **Serialize**: validate again, then emit full-precision metrics. The 0.5 m
   grid snap is deferred to rendering time (see ADR-0004) so geometry stays
   valid-by-construction (`Layout` fields are floats in meters).

> Phase 0 prototype deliberately omits dedicated corridor/passage rooms —
> circulation is implicit via door connectivity — city standards refinement is
> Phase 2 (scorer/passages).

### 3.3 Geometry Invariants (the checker enforces; property-tested)
- All room rects within the usable floor rect (inside the wall ring).
- No two rects overlap by more than tolerance (shared-wall edge contact allowed).
- Every room has ≥ 1 connection; graph from entrance is connected.
- Each room area within [minM2, maxM2] of its preference.
- Coverage ≤ maxCoverage (computed with the wall band).
- Stairs present on each intermediate floor between ground and top.
- Ensuite baths placed when `attachedBathrooms`; indoor parking present with
  area ≥ parking default when `indoorParking.required`.

### 3.4 Iteration semantics
- Parent layout is passed in; change request `delta` may contain:
  - `resizeRoom {roomId, targetM2}` → turns into per-room hard/soft override;
  - `moveRoom {roomId, toFloor}` / `swapRooms {a, b}`;
  - `addRoom / removeRoom {type, ...}`;
  - `connect {from, to, kind}` / `disconnect`;
  - `override {field: "maxCoverage"|"floors"|"focus", value}`.
- Divergence penalty in scorer encourages stability for untouched rooms; the
  part worth of change is resolved fresh by the partitioner for affected floor(s).
- If the delta cannot be satisfied → `UnsolvableLayout` + details (SRS FR-6.4).

---

## 4. Services & Responsibilities

| Service | Responsibility |
|---|---|
| `UsersService` | create/fetch/deactivate users; profile assembly (FR-1). |
| `PlotsService` | validate + normalize dims/units + openSides; CRUD (FR-2). |
| `TemplatesService` | list/read seeded design templates (FR-3.0). |
| `ProfilesService` | get/update home profiles; Zod validation of Json shapes; expands template defaults into the profile; returns `ValidatedPrefs` domain object (FR-3). |
| `ProjectsService` | create (freeze plot+chosen profile snapshots), list, rename, soft-delete (FR-4). |
| `LayoutService` | orchestrates: takes `GenerationRequest` → calls port → persist version; reads version; prepares iteration request from parent + delta (FR-5, FR-6). |
| `FeedbackService` | validate + persist feedback and tags; history queries (FR-7). |

Rule: services talk to persistence only through repositories; the engine module
is dependency-inverted (`LayoutService` depends on `ILayoutGenerator`, not on
the algorithmic impl).

---

## 5. API Contract (v1)

> Common params: all ids are UUID. Error body per SRS §6.3. Pagination params
> `limit`/`cursor` on list endpoints.

### 5.1 Users
| Method/Path | Body/Ok |
|---|---|
| `POST /api/v1/users` | `{email, name}` → `201 {id, email, name}` |
| `GET /api/v1/users/:id/profile` | → `{id, email, name, homeProfiles: []}` |

### 5.2 Plots
| Method/Path | Notes |
|---|---|
| `POST /api/v1/plots` | `{ownerId, width, depth, unit, openSides?}` → `201 Plot` |
| `PATCH /api/v1/plots/:id` | partial `{width?, depth?, unit?, openSides?}` |
| `GET /api/v1/plots/:id` | → normalized + raw dims |

Validation: `3 ≤ side ≤ 200 m` after normalization (config constant);
`openSides` in 1..4.

### 5.3 Templates
| Method/Path | Notes |
|---|---|
| `GET /api/v1/templates` | list active region standards |
| `GET /api/v1/templates/:id` | full defaults (wall, rooms, kitchen, bath, mandatory) |

### 5.4 Home Profiles
| Method/Path | Notes |
|---|---|
| `POST /api/v1/profiles` | `{ownerId, name, templateId?, floors?, rooms?, kitchen?, bathConnectivity?, mandatoryRequirements?, maxCoverage?, focus?}` → expands template defaults + overrides ✓ |
| `GET /api/v1/profiles?ownerId=` | list |
| `GET /api/v1/profiles/:id` | full expanded profile |
| `PATCH /api/v1/profiles/:id` | partial section updates |

### 5.5 Projects
| Method/Path | Notes |
|---|---|
| `POST /api/v1/projects` | `{ownerId, plotId, name, homeProfileId}` — snapshots chosen profile (explicit choice, FR-3.6) |
| `GET /api/v1/projects?ownerId=&status=` | list |
| `GET /api/v1/projects/:id` | detail + latest version |
| `PATCH /api/v1/projects/:id` | rename only (profile/plot immutable once created) |
| `DELETE /api/v1/projects/:id` | soft delete |

### 5.6 Designs
| Method/Path | Notes |
|---|---|
| `POST /api/v1/projects/:id/designs` | body `{seed?}` → generates v1; `201 DesignVersion + layout + metrics` |
| `GET /api/v1/projects/:id/designs?limit=` | version history (v-number asc) |
| `GET /api/v1/projects/:id/designs/:designId` | full version incl. snapshots + layout + metrics |
| `POST /api/v1/projects/:id/designs/:designId/iterations` | body `{changeRequest, seed?}` → child version; `201` incl. `diff` summary (rooms added/removed/resized) |

Errors: `404 DESIGN_VERSION_NOT_FOUND`, `422 UNSOLVABLE_LAYOUT`, `400
INVALID_CHANGE_REQUEST`.

### 5.7 Feedback
| Method/Path | Notes |
|---|---|
| `POST /api/v1/projects/:id/designs/:designId/feedback` | `{rating?, comment?, tags?, likes?, dislikes?}` → `201` |
| `GET /api/v1/users/:id/feedback` | history list |

---

## 6. Layout JSON Schema (v1)

```json
{
  "schemaVersion": 1,
  "unit": "meters",
  "resolution": 0.5,
  "wallThicknessM": 0.2286,
  "plot": { "width": 12.0, "depth": 15.0, "openSides": 3 },
  "floors": [
    {
      "floorNumber": 0,
      "name": "Ground Floor",
      "rooms": [
        {
          "roomId": "r1",
          "type": "living",
          "label": "Living Room",
          "x": 0.0, "y": 0.0,
          "width": 6.0, "depth": 4.5,
          "level": 0,
          "props": { "ensuiteBathId": null }
        }
      ]
    }
  ],
  "connections": [
    { "id": "c1", "from": "entrance", "to": "r1", "kind": "door", "width": 0.9 },
    { "id": "c2", "from": "r1", "to": "r2", "kind": "passage", "width": 1.0 },
    { "id": "c3", "from": "r_up", "to": "r_down", "kind": "stair", "width": 1.0 }
  ],
  "metrics": {
    "builtUpAreaM2": 129.5,
    "roomAreaM2": 120.1,
    "plotCoverage": 0.72,
    "score": 86.4,
    "scoreBreakdown": { "adjacency": 90, "orientation": 80, "balance": 88, "stability": 100 }
  }
}
```
`x/y/width/depth` are **inner room rectangles** (inside the wall band);
`builtUpAreaM2` includes the wall band; `plotCoverage` = builtUp / plot area.
Types registry: `living, dining, kitchen, bed1, bed2, ..., bath, wc, stair, lobby,
study, store, utility, parking` (extensible enum in `common`).

---

## 7. Errors

- `ErrorCode` enum (stable strings): `VALIDATION`, `RESOURCE_NOT_FOUND`,
  `UNSOLVABLE_LAYOUT`, `INVALID_CHANGE_REQUEST`, `CONFLICT`, `UNAUTHORIZED`,
  `INTERNAL`.
- `DomainError` base with `code`, `message`, `details?`, `httpStatus`.
- Global filter maps `DomainError → status`; Zod `ValidationError → VALIDATION`;
  unknown → `INTERNAL` with masked message.
- `UnsolvableLayoutError` carries `constraintViolations: [{constraint, room?, expected, actual, hint?}]` and a `traceId` correlation to logs.

---

## 8. Config & Deployment

- `env.validation.ts` (boot fail-fast): `DATABASE_URL`, `PORT`, `NODE_ENV`,
  `LOG_LEVEL`, `API_BASE_PATH` (default `/api/v1`), `ENGINE_MAX_RETRIES`,
  `ENGINE_TIMEOUT_MS` (e.g., 4000).
- Docker Compose: postgres 16 + api; migrations run on boot (npm script `prisma migrate deploy`) — explicit, not auto in app.
- Health: `GET /health` (liveness) + `GET /health/ready` (DB check).

---

## 9. Testing Strategy

| Level | Scope / examples | Tool |
|---|---|---|
| Unit | partitioner, checker, scorer, serializer, services, validators | Jest |
| Property | `forall` plots/prefs ⇒ invariants of §3.3 hold; determinism: same input+seed ⇒ deep-equal output | fast-check |
| Integration | repo + engine bound together; DB-backed version-tree ops in a test Postgres | Jest + Prisma |
| E2E | API flows (SRS FR scenarios): create user→plot→project→design→iterate→feedback | Supertest |
| Contract | OpenAPI snapshot test keeps spec in sync | jest-openapi / swagger export diff |

CI: lint + format check + typecheck + tests + build. Every PR touching the
engine must include property tests for any new invariant.

---

## 10. Future-Facing Seams (kept open, not built)
- `ILayoutGenerator` allows an AI/optimization-based engine to replace the
  algorithmic one (validation layer unchanged).
- Async generation: if p95 exceeds 5 s, wrap `LayoutService` behind a job queue;
  API gains async endpoints + status polling (contract additive).
- Preference learning: feedback tables already structured for features;
  a recommendation service reads them + history without NLP.
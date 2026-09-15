# High-Level Design (HLD)

**Project:** HomeAIArch
**Doc version:** v0.1 (DRAFT)
**Satisfies:** `docs/SRS.md`

---

## 1. Goals of this document

Explains the system's overall architecture, the shape of the NestJS application,
how the generation engine fits in, and the reasoning behind the top-level
choices. Detail level: component and data-flow. For classes/fields/endpoints see
`docs/LLD.md`.

---

## 2. Context Diagram

```
                        +----------------------+
   Consumer =           |    HomeAIArch API    |        +---------------+
   future Web/Mobile -------------------------->|      / | PostgreSQL    |
   frontend, curl,      |  NestJS (modular)    |       |  (source of    |
   OpenAPI clients      |  monolith, REST v1   |------>|   truth)       |
                        +-----------------------+       +---------------+
                                  |
                                  v
                        +-----------------------+
                        |  Layout Generation    |
                        |  Engine (pure, in-    |
                        |  process, stateless)  |   <-- no external deps in v1
                        +-----------------------+
```

- Single deployable NestJS application. No microservices in v1 (team of one/`few,
  small domain, strong coupling between generation and persistent state).
- Only out-of-process dependency: the database (PostgreSQL).

---

## 3. Architectural Principles / Top-level Choices

| #   | Decision                                                                          | Reasoning (see also AGENTS.md + ADR-0001)                                                                                                                                     |
| --- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Modular monolith** (feature modules, one app)                                   | Small team; fast iteration; avoids premature distribution; NestJS modules give clean seams to split later.                                                                    |
| D2  | **REST v1, JSON, versioned `/api/v1`**                                            | Simple, universally consumable, doc-driven via OpenAPI.                                                                                                                       |
| D3  | **Layout engine is algorithmic + constraint-based (v1)**                          | Deterministic, testable, no external calls; LLM could hallucinate geometry. Seam (port `ILayoutGenerator`) allows an AI-assisted engine later verifying via the same checker. |
| D4  | **Design versions are immutable snapshots**                                       | Iteration requires a stable, reproducible "parent"; version tree makes all history auditable and reversible.                                                                  |
| D4b | **Templates & home profiles are frozen into the project snapshot at creation**    | Template edits or profile changes must not retroactively alter existing projects; reproducibility and determinism are preserved.                                              |
| D5  | **Change requests are structured deltas** (not free text)                         | So iterations are reproducible and constraint-checkable; free text is stored alongside but not parsed in v1.                                                                  |
| D6  | **Feedback modeled as structured tags + text**                                    | Requirements say future designs improve — structured tags give ML/preference-learning data ready to consume without NLP.                                                      |
| D7  | **Deterministic generation with optional seed**                                   | Reproducibility, debugging, testability, and stable UX ("keep what you liked").                                                                                               |
| D8  | **PostgreSQL + Prisma** (with NestJS)                                             | Strong relational integrity (version tree, feedback), JSONB for layout docs, Prisma for type-safe evolving schemas.                                                           |
| D9  | **Pure engine, no DB access**                                                     | Engine only sees immutable inputs and returns layout + diagnostics — CPU-bound and horizontally scalable.                                                                     |
| D10 | **Regional standards ship as `DesignTemplate`s with fully configurable defaults** | Product asked for region norms (9" brick walls, ≥12×12 ft master bedroom, ≥10 ft kitchen counter, etc.); user overrides are first-class so defaults never hard-block choice.  |
| D11 | **Placeholder identity in Phase 0; JWT auth in Phase 1**                          | Build layout feasibility first (Phase 0 goal); keep auth as an additive module.                                                                                               |

---

## 4. Application Structure (module map)

```
app.module
├── ConfigModule            (@nestjs/config, validated env)
├── DatabaseModule          (Prisma service/lifecycle)
├── UsersModule             FR-1 (placeholder identity)
├── PlotsModule             FR-2
├── TemplatesModule         FR-3.0 (seeded regional standards)
├── ProfilesModule          FR-3 (home profiles; was "Preferences")
├── ProjectsModule          FR-4
├── LayoutModule            FR-5, FR-6   ─── the engine (nested)
│   ├── engine/             pure constraint solver + checker
│   ├── layout.repository   persistence + version tree ops
│   └── generator.port      interface; algo impl in v1
├── FeedbackModule          FR-7
└── AuthModule              Phase 1 (additive; not present in Phase 0)
```

Dependencies: `Plots→Users`, `Profiles→Templates+Users`,
`Projects→Plots+Profiles`, `Layout→Projects`, `Feedback→Layout`.

---

## 5. Core Domain Flow — Initial Design

```
Client                       API (NestJS)                        Engine                DB
  │  POST /projects              │                                 │                   │
  │──────────────────────────────► validate plot+prefs snapshot     │                   │
  │                              │ create Project                   │                   │
  │                              │──────────────────────────────────►                  │
  │                              │                                 │  generate layout
  │                              │◄────────────────────────────────│  (deterministic)
  │                              │ persist DesignVersion#1 + layout │
  │                              │──────────────────────────────────►
  │◄───────────────────────────── 201 + layout + metrics + score     │                   │
```

Every `DesignVersion` row stores:
`input_snapshot` (plot + preferences + optional change request, JSONB) and
`layout` (JSONB) and `metrics`. Reproducibility = replay, no hidden state.

---

## 6. Core Domain Flow — Iteration

```
Client                       API                                  Engine                DB
  │ POST .../designs/1/iterations                                  │                   │
  │   body: changeRequest (delta)                                 │                   │
  │──────────────────────────────► load parent vN (immutable)       │                   │
  │                              │ ground parent layout + delta ───► generate vN+1       │
  │                              │◄────────────────────────────────│                   │
  │                              │ persist child version, link parent │                  │
  │                              │──────────────────────────────────►
  │◄───────────────────────────── 201 + layout vN+1 + diff summary   │                   │
```

Key invariant: **parents never change**; the child references `parentId`. The
engine treats the parent layout as a soft anchor (minimal disruption) and the
delta as hard/soft constraints layered on the original preference set.

---

## 7. Core Domain Flow — Feedback

```
Client                       API                                  DB
  │ POST .../designs/1/feedback                                   │
  │  body: {liked[], disliked[], rating, comment, tags}           │
  │──────────────────────────────► validate immutable target exists │
  │                              │ store Feedback + tags           │
  │                              │────────────────────────────────►
  │◄───────────────────────────── 201
```

Feedback is **write-only advisory** in v1; nothing in the generation path reads
it yet. Read endpoints exist for analytics and future learning.

---

## 8. Storage Design

- **PostgreSQL** (relational core) + **JSONB columns** where documents belong
  (layout, snapshots, change sets).
- `DesignTemplate` rows are seeded (region standards); user **HomeProfile** rows
  reference a template but store their own expanded JSON so templates can evolve
  without breaking saved profiles.
- A project snapshots BOTH its plot and its chosen home profile (expanded) at
  creation, so later edits to template/profile never change existing designs.
- Version tree materialized as `parent_id` self-reference + `version_number`;
  unique `(project_id, version_number)`.
- Indexes: `project_id` on versions, `user_id` on plots/projects/profiles,
  `design_version_id` on feedback.
- No caching layer in v1 (reads are cheap; generation is the hot path but
  CPU-bound, stateless). Revisit when traffic demands.

---

## 9. The Layout Generation Engine (component view)

```
ILayoutGenerator (port)
        │  input: GenerationRequest {plot(m), prefs, seed?, parentLayout?, changeRequest?}
        │  output: GenerationResult {layout, metrics, score, diagnostics}
        ▼
┌───────────────────────────────────────────────────────────────┐
│ AlgorithmicGenerator (impl, v1)                               │
│  ┌────────────────────┐   ┌────────────────────┐              │
│  │ SpacePartitioner   │──►│ ConstraintChecker  │  hard rules  │
│  │ (recursive splitting│   │ (geometry: no      │  violation →  │
│  │  of plot into room │   │  overlap, in-bounds,│  fail w/     │
│  │  boxes, floors)    │   │  reachable, sizes,  │  details)    │
│  └───────┬────────────┘   │  connectivity)      │              │
│          │                └─────────┬──────────┘              │
│  ┌───────▼────────────┐   ┌─────────▼──────────┐              │
│  │ ConnectivityPlug   │   │ Scorer (soft rules) │              │
│  │ (doors, passages,  │   │ orientation,        │              │
│  │  stairs, ensuite    │   │ adjacency, balance, │              │
│  │  bathrooms, W.C.)   │   │ client focus)      │              │
│  └───────────┬────────┘   └─────────┬──────────┘              │
│              └───────────┬─────────┘                          │
│                          ▼                                    │
│              LayoutSerializer (JSON, full-precision;                       │
│              0.5 m grid snap deferred to rendering — ADR-0004)             │
└───────────────────────────────────────────────────────────────┘
```

- **Inputs are cloned & frozen**; the engine never mutates caller data.
- Failure mode: if the checker cannot satisfy hard constraints after a bounded
  search, it returns `UnsolvableLayout` with the specific violated rules and
  best-effort hints. It never returns an invalid layout.
- Seeding: random decisions (split direction, tie-breaking) consume a seeded RNG.

---

## 10. Cross-cutting Concerns

| Concern       | Approach                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Validation    | Global transform + validation pipe (class-validator DTOs); Zod optional for domain-internal rule expressions. |
| Errors        | Stable error codes (from a shared enum/registry) + HTTP status mapping; trace id from request id middleware.  |
| Logging       | JSON structured logs via Nest Logger wrap; request id; no PII beyond email in logs; never secrets.            |
| Config        | env validated at boot (fail fast); local `.env` ignored by git; secrets via env/secret store.                 |
| Observability | Prometheus health/`/health`, latency + generation success counters (Phase 3 polish).                          |
| Testing       | Unit (engine, services), e2e (Supertest), property tests for geometry sanity.                                 |
| Documentation | OpenAPI exported; ADR log for all architectural decisions; SRS/HLD/LLD kept in sync.                          |
| Migration     | Prisma migrations, versioned; backward-compatible additive changes preferred.                                 |

---

## 11. Deployment (v1, low-complexity)

Single Node container + managed Postgres. Simple rolling deploy; health checks
for readiness. Generation is synchronous in the request path for v1 (target p95
< 5 s); an async queue is a deferred decision (see AGENTS.md open questions).

---

## 12. Capacity & Scalability Notes

- Engine is pure and stateless → easy to scale by replicas; DB remains the
  guarded resource.
- If generation latency becomes a concern (complex plots), the port
  `ILayoutGenerator` allows moving the engine to a worker pool / job queue
  without changing the API contract (the request becomes async + job status).

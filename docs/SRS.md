# Software Requirements Specification (SRS)

**Project:** HomeAIArch — Automated Home Layout Design API
**Tech target:** NestJS (Node.js/TypeScript) backend
**Doc version:** v0.1 (draft — will iterate with discussions)
**Status:** DRAFT

---

## 1. Introduction

### 1.1 Purpose
HomeAIArch is a backend API that automatically generates home layout designs for
a plot of land based on user-provided dimensions and preferences. It generates an
initial layout, then iteratively adapts the layout in response to user feedback
and change requests, and persistently records user preferences, likes, and
dislikes so future designs improve.

### 1.2 Scope
In scope for v1 (see ROADMAP Phase 0–1):
- User, plot, and project management.
- Structured preference capture (floor count, room sizes, kitchen size, bathroom
  connectivity, etc.).
- Programmatic initial layout generation from plot + preferences.
- Iterative revision: a change/no-change request against the latest design
  produces a new layout version (never mutates prior versions).
- Feedback capture (likes/dislikes) attached to a design version.
- REST API + OpenAPI docs, persistence, validation, error taxonomy, tests.

Out of scope for v1 (future):
- Auth/OAuth beyond a minimal placeholder identity model.
- Budget, cost, partial/phase-wise construction planning.
- 3D rendering, preview images, SVG/PDF/DWG export.
- Generative AI (LLM) powered design; adaptive preference learning beyond data capture.
- Multi-user real-time collaboration.

### 1.3 Audience
This SRS is read by developers, AI coding agents joining the project, and the
product owner. It is the requirements source of truth; HLD/LLD satisfy it.

### 1.4 Glossary
| Term | Meaning |
|---|---|
| **Plot** | The empty land parcel: width, depth, unit, optional shape restrictions. v1 assumes orthogonal rectangles. |
| **DesignTemplate** | A named bundle of regional/typical build standards (e.g., brick wall 9" thick, master bedroom ≥ 12×12 ft, kitchen counter ≥ 10 ft). Provides defaults; users may override every value. |
| **HomeProfile** | A named, per-user collection of preferences built from a template and user choices (floors, rooms, bathrooms, mandatory requirements). Users may hold many and pick one when creating a project. |
| **Mandatory requirements** | Plot/product context the user must give: open sides (1/2/3/4 side plot), need for attached bathrooms, indoor parking, etc. |
| **Project** | A user's working context around one plot + one chosen HomeProfile, producing a series of design versions. |
| **Preference** | Structured config describing desired rooms, sizes, floors, connectivity. |
| **DesignVersion** | An immutable snapshot of plot + preferences + constraints producing one layout. The unit of review and iteration. |
| **Layout (JSON)** | Machine-readable floor plan: floors, rooms with position/size, connections (doors/passages/stairs), derived metrics. |
| **Iteration** | The act of generating a child DesignVersion from a parent plus a change request. |
| **Change request** | Structured "delta" describing what to change vs the parent layout. |
| **Feedback** | User opinions on a design: liked items, disliked items, rating, free text. |
| **Hard constraint** | Must hold or the layout is invalid (e.g., plot fits, min room size). |
| **Soft constraint** | Desirable; violations reduce a quality score but don't fail (e.g., prefer morning sun in bedrooms). |

### 1.5 References
- `docs/HLD.md` — High-Level Design
- `docs/LLD.md` — Low-Level Design
- `docs/ROADMAP.md` — Phased release plan
- `AGENTS.md` — Onboarding + reasoning for AI agents
- `docs/decisions/` — Architecture Decision Records (ADRs)

---

## 2. Overall Description

### 2.1 Product Perspective
HomeAIArch is a greenfield, API-first backend. It will expose a REST API consumed
by future web/mobile frontends or by users directly via OpenAPI. It owns all
domain logic, persistence, and the layout generation engine. The generation
engine is algorithmic/constraint-based in v1, with a clean seam so an
AI-assisted engine can be added later.

### 2.2 Product Functions (Summary)
- Create and manage users (minimal identity; full auth in Phase 1).
- Register plots with dimensions, units, and open-side info.
- Browse built-in **design templates** (regional standards) and create named
  **home profiles** by customizing a template's defaults.
- Capture mandatory requirements (open sides, attached bathrooms, indoor
  parking) per home profile.
- Start a project (plot + a selected home profile, frozen as snapshot).
- Generate the initial layout design.
- Request changes and generate the next design version (non-destructive).
- Record feedback (likes/dislikes) against a version.
- List design history of a project.
- Expose layout metrics (built-up area, plot coverage, score).

### 2.3 User Characteristics
- **Homeowner/end user:** non-technical; provides plot size, picks/edits a home
  profile from regional templates, reviews layouts, requests changes.
- **Developer/API consumer:** builds frontends; needs a stable, documented API.
- Future: **Architect/professional** may provide advanced constraints (budget,
  materials) in later phases.

### 2.4 Assumptions and Constraints
1. Logical design works in `meters`; API accepts both metric and imperial and
   normalizes internally to meters (grid resolution 0.5 m in v1).
2. v1 plots are orthogonal rectangles only.
3. Preferences are provided as *structured DTOs* on top of template-provided
   defaults, not free text, in v1.
4. Every generated layout MUST be geometrically valid: rooms do not overlap,
   all rooms are within the plot, circulation is reachable.
5. Design versions are immutable once created; change requests always branch a
   new version.
6. Layout JSON is the single source of truth for geometry; no derived floor
   plan image in v1.
7. System must behave deterministically: same (plot, template+profile, change-set)
   yields the same layout unless a random seed is explicitly given.
8. No external services (LLM, maps) are required at runtime for v1.
9. Wall thickness and other dimensional defaults come from the chosen template
   (e.g., 9" = 0.2286 m for brick) and are applied by the engine as inside/outside
   room geometry.
10. Phase 0 is a **feasibility prototype**: prove we can generate valid layouts
    that a human reviewer finds plausible (accuracy), ahead of product polish.

### 2.5 In/Out of scope summary table
| Capability | Phase 0/1 | Later |
|---|---|---|
| User, plot, project CRUD | Yes | — |
| Design templates (regional standards) | Yes (seeded, user-configurable) | Template marketplace |
| Home profiles (many per user, choose per project) | Yes | Households/shared profiles |
| Structured preferences + mandatory requirements | Yes | Free-text/natural language |
| Constraint-based layout gen | Basic → quality in Phase 2 | Advanced constraint solver, budget, phasing |
| Iterative revision | Yes (change-request based) | Partial regeneration/diff-driven |
| Feedback (likes/dislikes) | Yes (capture) | Adaptive recommendation/learning |
| Auth | Placeholder identity; JWT in Phase 1 | Full auth + RBAC |
| Export/rendering | No | SVG/PDF/DWG, 3D |

---

## 3. Functional Requirements

> ID format `FR-x.y`. Priority: **M**=Must (v1), **S**=Should (soon), **C**=Could (later).

### FR-1 User Management (M)
- FR-1.1 System SHALL create a user with a unique email and display name.
- FR-1.2 System SHALL allow retrieving a user profile (including home profiles list).
- FR-1.3 System SHALL allow deactivating a user (soft delete); data is retained for audit.
- FR-1.4 Identity is a **placeholder** in Phase 0/1a: the API accepts a `userId`
  supplied by the caller. Full authentication (JWT login) ships in **Phase 1**
  and must be additive without breaking FR-1.1–1.3.

### FR-2 Plot Management (M)
- FR-2.1 System SHALL register a plot with `width`, `depth`, measurement `unit`
  (`m`/`ft`), belonging to a user.
- FR-2.2 System SHALL validate plot dimensions: positive, within configured
  min/max (e.g., min 3 m, max 200 m per side).
- FR-2.3 System SHALL compute and store normalized dimensions in meters.

### FR-3 Home Profiles & Templates (M)
- FR-3.0 System SHALL ship a set of seeded `DesignTemplate`s, each bundling
  regional/typical standards that users generally follow, e.g.:
  - wall thickness (brick 9" = 0.2286 m, or 4.5"),
  - master bedroom min size (≥ 12×12 ft ≈ 13.4 m²),
  - kitchen counter length (≥ 10 ft ≈ 3.05 m),
  - default min areas per room type, stair/corridor/door dimensions.
- FR-3.1 System SHALL let a user create any number of named **HomeProfile**s by
  picking a template and overriding its defaults:
  - number of floors (1..N),
  - list of required rooms with room type and min/max/ideal area (m²),
  - kitchen size + counter length preference,
  - bathroom connectivity: ensuite bathrooms (per bedroom), common/family bath,
    W.C. counts per floor,
  - max plot coverage ratio (built-up area / plot area),
  - optional "focus areas" (e.g., bigger living vs bigger bedrooms) — soft.
- FR-3.2 **Mandatory requirements** are collected per profile: open sides of the
  plot (1/2/3/4), need for attached (ensuite) bathrooms, indoor parking space
  (yes/no + car count), outdoor parking. The generator must respect these as
  hard constraints where feasible.
- FR-3.3 Every default a template provides SYSTEM SHALL be overridable by the
  user (defaults are configurable, per open decision resolution).
- FR-3.4 System SHALL allow partial updates to a home profile (PATCH per section).
- FR-3.5 System SHALL validate profile constraints (e.g., sum of min areas
  exceeding the likely plot area → surfaced as warnings, not only errors).
- FR-3.6 When starting a project, the user SHALL choose which home profile to
  load (explicit selection, no silent default).

### FR-4 Project Management (M)
- FR-4.1 System SHALL create a Project bound to one Plot and one chosen
  **HomeProfile**; both shall be frozen into the project as immuturable
  snapshots (plot snapshot + expanded preference snapshot) at creation.
- FR-4.2 System SHALL list projects per user with status and latest design info.
- FR-4.3 System SHALL allow naming/renaming a project and deleting it (soft).

### FR-5 Initial Layout Generation (M)
- FR-5.1 System SHALL, given a project, generate the first `DesignVersion`
  satisfying all **hard** constraints and optimizing **soft** ones.
- FR-5.2 Output layout SHALL contain, as JSON:
  - floor plan geometry (x/y/width/depth for each room, inner room rectangles),
  - wall thickness used (from template/profile),
  - floors (number + name), each with rooms,
  - each room: stable `roomId`, type, label, `x`,`y`,`width`,`depth` (meters, top-left origin), level,
  - connections: list of `{from, to, kind: door|passage|stair, width}`,
  - derived metrics: total built-up area (incl. wall band), plot coverage %, quality score.
- FR-5.3 Generation SHALL be deterministic unless a `seed` is supplied.
- FR-5.4 If no valid layout exists, system SHALL return a structured
  `UnsolvableLayout` error listing violated constraints (e.g., "plot too small
  for 3 bedrooms + 2 baths + parking") with hints (reduce floors, reduce room
  size, drop indoor parking).
- FR-5.5 Each version SHALL store the exact input snapshot (plot + expanded
  template/profile + mandatory requirements + change request) that produced it,
  for reproducibility.
- FR-5.6 The mandatory requirements (open sides, ensuite baths, indoor parking)
  SHALL be applied by the generator: opens sides influence room placement /
  daylight, parking consumes dedicated area on the ground floor.

### FR-6 Iterative Design Revision (M)
- FR-6.1 System SHALL accept a change request against the latest (or any) version.
  A change request is a structured delta: room add/remove/resize/move,
  connection add/remove, preference override per room, coverage/floor adjustments.
- FR-6.2 System SHALL generate a child `DesignVersion` using the parent layout as
  grounding (prefer minimal disruption), while still satisfying hard constraints.
- FR-6.3 Parent versions SHALL remain immutable; history is a version tree (v1 →
  v2 → v3, with a possibility of branching later).
- FR-6.4 Each iteration SHALL return the same correctness guarantees as initial
  generation (valid geometry, deterministic).

### FR-7 Feedback Capture (M)
- FR-7.1 System SHALL record feedback against a version: liking/dislike tags per
  room or global, overall rating (1–5), free-text comment.
- FR-7.2 Feedback SHALL be stored with structured tags (e.g.,
  `room.too_small`, `kitchen.orientation`, `staircase.location`) so future
  learning can consume it without NLP.
- FR-7.3 Feedback SHALL NOT mutate the design; it is advisory data.
- FR-7.4 System SHALL expose feedback history per user/project (for later
  personalization features and audits).

### FR-8 Preference Learning (v1 = capture only; future = adapt)
- FR-8.1 System SHALL persist every preference snapshot and every change request
  so a user's evolution over time is queryable.
- FR-8.2 (future) System MAY derive and suggest preference adjustments from
  repetitive feedback patterns.

---

## 4. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Performance | Read endpoints p95 < 200 ms; generation requests p95 < 5 s for typical plots (≤ 200 m², ≤ 3 floors). |
| NFR-2 | Availability | 99.5% monthly availability during v1 (single region, modest scale). |
| NFR-3 | Security | Secrets in env/config vault only, never in code; TLS at the edge; input validation on all inputs; no secrets in logs. |
| NFR-4 | Data integrity | All writes transactional; versions immutable; audit trail of version creation. |
| NFR-5 | Scalability | Generation engine must be stateless and horizontally scalable; layout computation is CPU-bound and must not hold DB locks. |
| NFR-6 | Extensibility | New room types, constraint types, and preferences must be addable without schema rework where feasible (registry pattern). |
| NFR-7 | Testing | Unit + integration coverage ≥ 70% on domain/engine; every engine change requires property-based geometry sanity tests (no overlaps, in-bounds). |
| NFR-8 | Observability | Structured logs (JSON), request IDs, correlation of generation jobs, basic metrics (latency, error rate, generation success rate). |
| NFR-9 | Determinism | Same inputs + seed ⇒ same output; engine must be pure w.r.t. inputs. |
| NFR-10 | SEO/locale | All user-facing strings and labels localized; numeric units localized (v1: support m² standalone, layout in meters). |

---

## 5. Data Requirements

### 5.1 Core Entities
`User`, `Plot`, `DesignTemplate`, `HomeProfile`, `Project`, `DesignVersion`,
`Layout` (JSON doc), `ChangeRequest` (JSON doc), `Feedback`, `FeedbackTag`.

### 5.2 Units
- Linear: meters (API accepts `m`/`ft`, normalizes to meters).
- Area: square meters (accepted input `m²`/`ft²`).
- Grid resolution: **0.5 m** in v1 (positions/sizes round to multiples of
  0.5 m). Phase 0 exception (ADR-0004): engine emits full-precision floats so
  geometry stays valid by construction; snapping to the 0.5 m grid happens at
  rendering/serialization time without affecting the stored layout.

### 5.3 Immutability
`DesignVersion` rows and their `Layout` JSON are write-once. Any correction
creates a new version.

---

## 6. Interface Requirements

### 6.1 API Style
REST over JSON, versioned at URL path (`/api/v1/...`). OpenAPI spec exposed at
`/docs` (Swagger UI) and `/docs-json`. No WebSockets in v1.

### 6.2 High-level endpoint map (see LLD §0 for DTO details)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/users` | Create user (placeholder identity) |
| GET | `/api/v1/users/:id/profile` | User profile + home profiles |
| POST | `/api/v1/plots` | Register plot |
| PATCH | `/api/v1/plots/:id` | Edit plot |
| GET | `/api/v1/templates` | List design templates (regional standards) |
| POST | `/api/v1/profiles` | Create home profile from a template |
| GET | `/api/v1/profiles?userId=` | List a user's home profiles |
| PATCH | `/api/v1/profiles/:id` | Update profile section(s) |
| POST | `/api/v1/projects` | Create project (plot + chosen home profile, snapshotted) |
| GET | `/api/v1/projects?userId=&status=` | List projects |
| POST | `/api/v1/projects/:id/designs` | Generate initial design |
| GET | `/api/v1/projects/:id/designs` | List version history |
| GET | `/api/v1/projects/:id/designs/:designId` | Get layout JSON + metrics |
| POST | `/api/v1/projects/:id/designs/:designId/iterations` | Apply a change request → next version |
| POST | `/api/v1/projects/:id/designs/:designId/feedback` | Record feedback |
| GET | `/api/v1/users/:id/feedback` | Feedback history |

### 6.3 Error shape
All errors return:
```
{
  "statusCode": 400,
  "code": "UNSOLVABLE_LAYOUT",
  "message": "Plot area insufficient for required rooms",
  "details": [ { "constraint": "MIN_AREA", "room": "kitchen", "context": {...} } ],
  "traceId": "..."
}
```
Codes are stable strings, not HTTP statuses — clients branch on `code`.

---

## 7. Future Scope (deliberately postponed)
1. Budget & cost estimation per room/material.
2. Construction phasing / partial development (build ground floor first).
3. Constraint engine v2: advanced soft constraints and optimization.
4. Export: SVG, PDF, DWG; image rendering service.
5. AI-assisted generation (an LLM or net proposing variations the constraint
   engine validates).
6. Adaptive preference learning from feedback corpus.
7. Collaboration, sharing, version branching/merge.
8. Full auth (email/password, SSO) and RBAC.
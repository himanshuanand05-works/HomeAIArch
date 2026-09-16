# SRS — HomeAIArch Studio (Angular UI)

Phase 0 feasibility prototype UI for the HomeAIArch backend (`../docs/SRS.md` is
the backend spec this UI consumes). This SRS defines what "correct" means for
the UI: which screens exist, how the user walks the design loop, and what the
acceptance criteria are.

## 1. Scope

A browser single-page application that drives the backend API through the full
product loop — choose a template, define a plot, define home preferences, create
a project, generate an initial design, **iterate** on it, and browse the version
history — with a visual floor-plan rendering of every generated layout.

### In scope (Phase 0)

- Session identity (placeholder API `userId`, no auth — backend ADR-0003).
- Template browsing.
- Plot creation/editing/deletion.
- Home profile (preferences) creation/editing/deletion.
- Project creation and listing.
- Initial design generation.
- Design visualization (SVG floor plan with walls, rooms, doors/stairs).
- Design iteration via structured change-requests (add/remove/override rooms).
- Design version history.

### Out of scope (clearly)

- Authentication/authorization (backend Phase 1).
- Real-time collaboration, offline mode, multi-user workspaces.
- Export (PDF/SVG download, budget, materials) — backend Phase 4.
- Adaptive preference learning — backend Phase 3.

## 2. Users

Single actor: **the home owner** interacting with the app in a demo/feasibility
context. Because the backend has no auth in Phase 0, the UI keeps **one active
`userId`** in the browser (localStorage). The user can create a new identity or
reuse a previous one.

## 3. Functional requirements

### FR-U1 Targeting & tone
- The whole product is one app. Do not add screens you can't drive through the
  backend endpoints in `../docs/LLD.md` §5.

### FR-S1 Session identity
- The app SHALL show a persistent "acting as" bar with the current user.
- The user SHALL be able to switch to an existing user or create a new one.
- The selected `userId` SHALL persist across reloads (localStorage).

### FR-S2 Templates
- `GET /api/v1/templates` — list fit for display; show name, region, wall
  thickness note, room defaults, staircase, kitchen default, mandatory defaults.

### FR-S3 Plot management
- Create a plot with dimensions in `M` or `FT` + open sides.
- List plots for the active user; edit; delete.
- Any form validation failure from the API SHALL be shown as a field-level list,
  not a raw dump.

### FR-S4 Home profile management
- Create a profile from a chosen template: name, floors, rooms (type + count,
  optional `minM2/idealM2/maxM2/minSideM` per room), kitchen (`counterMinM`),
  bath connectivity, mandatory requirements, coverage cap.
- List, edit, delete profiles for the active user.

### FR-S5 Project creation
- Create a project by binding a plot + a profile (frozen snapshot).
- List projects for the active user.

### FR-S6 Initial design
- `POST /api/v1/projects/:projectId/designs` — generate version 1, optionally
  with a `seed`.
- The generated layout SHALL be rendered as a floor plan (see FR-S8).
- A `409 CONFLICT` (version 1 exists) SHALL be presented as "use iterations".

### FR-S7 Iteration
- From any design version, the user SHALL be able to build a structured change
  request and branch a child version:
  - remove room types,
  - add rooms (type, count, optional bounds),
  - override area bounds of existing rooms,
  - cap coverage.
- `seed` reuse SHALL be encouraged (determinism), not required.
- The child version SHALL render in the same canvas as the parent for visual
  comparison.
- An `UNSOLVABLE_LAYOUT` error SHALL show its reasons and hints, not a generic
  message.

### FR-S8 Floor-plan rendering
- Every design version SHALL be renderable: plot boundary, walls (using
  `externalGeometry`, `wallThicknessMm`), rooms (interior `x/y/width/depth`
  from `internalGeometry`), room labels + type + area (m²), wall connections
  (doors/passages/stairs), floors selectable as tabs.
- Rendering SHALL be scaling: plot mm → screen px with a stable aspect ratio.
- The canvas SHALL be unit-consistent (mm-set) — no float drift (backend
  ADR-0005).

### FR-S9 Metrics display
- For the active version show: score, score breakdown, built-up area (m²),
  room area (m²), circulation (m²), plot coverage %, generation time ms
  (from diagnostics) if available.

### FR-S10 Design history
- `GET /api/v1/projects/:projectId/designs` — list versions; click to load and
  render any version; show parent/child relationship.

## 4. Non-functional requirements

| # | Requirement |
| - | ----------- |
| NFR-1 | **Determinism-friendly**: the UI must make the seed an explicit, visible input so same-seed reproduces the same layout. |
| NFR-2 | **API contract sync**: all model types live in `src/app/models/` and mirror the backend DTOs; no ad-hoc `any` payloads in components. |
| NFR-3 | **Error handling**: one `ApiError` mapper with stable `code`; UNSOLVABLE_LAYOUT renders reasons/hints. |
| NFR-4 | **Types**: strict TypeScript throughout; no `any` in new code. |
| NFR-5 | **Performance**: lazy-loaded feature routes; initial bundle under the CLI budget; no third-party state library. |
| NFR-6 | **Testing**: unit tests for services (HTTP mocks) and the canvas renderer geometry; lint/format/typecheck/build all green. |
| NFR-7 | **Config**: API base URL overridable via environment (`API_URL`) and dev proxy, same-origin by default. |

## 5. Acceptance criteria (per screen)

- **Templates page**: renders the two seeded templates with their wall
  thickness and defaults.
- **Wizard**: template → plot → profile → project completes and creates a real
  project returned by the backend (e2e parity with backend `test/app.e2e-spec.ts`).
- **Studio**: entering a project with designs renders a floor plan with ≥1 room,
  walls thicker than interiors, scrollable floors, and a working iterate form.
- **Iteration**: removing a room type yields a child version whose canvas no
  longer shows that type (backend property already covered; UI assertion on the
  rendered room list).
- **Error path**: an intentionally unsolvable request shows the
  `UNSOLVABLE_LAYOUT` reasons/hints block.

---

_Language of record: English. Terms follow the backend glossary (SRS §1.4)._
# HLD — HomeAIArch Studio (Angular UI) — High-Level Design

## 1. Purpose

A browser SPA that turns the HomeAIArch backend's HTTP API (Phase 0, docs in
`../docs/LLD.md`) into an interactive experience: pick template → define plot →
define home profile → create project → generate → iterate → review. The product
loop is **design → change → redesign → feedback**; the UI must make that loop
visible and pleasant to drive by hand.

## 2. Top-level decisions

### D1 — Angular 22 + standalone-only, no framework UI library
Angular 22 (latest stable, CLI 22.x) with standalone components, lazy routes,
signal state, and the `@angular/build` application builder. We deliberately use
**no** UI framework (no Angular Material): a small hand-rolled design system in
SCSS keeps the demo dependency-light and consistent with the backend's
"simplest thing that satisfies the requirement" rule. Component contracts stay
framework-clean so a Material migration later is cosmetic, not structural.

### D2 — Backend is the only source of truth
No client-side validation library, no client-side domain model beyond what the
backend verifies. DTO shapes are mirrored in `src/app/models/` and typed rigidly;
services translate backend errors (stable `code` + `details`) into typed
`ApiError` instances the UI can branch on (`UNSOLVABLE_LAYOUT` renders reasons).

### D3 — Server-renderable, same-origin API
Dev uses `proxy.conf.json` (`/api` → `http://localhost:3000/api/v1`), avoiding
CORS entirely and letting the app use relative URLs. Production assumes the same
proxy/reverse-proxy pattern; `API_URL` env override exists for standalone
deploys. This matches the backend's `API_BASE_PATH` convention.

### D4 — SVG floor-plan renderer as a pure module
The renderer (mm geometry → SVG primitives) is a **pure, DI-free module**
(`src/app/render/`). Angular components wrap it only for lifecycle/template.
This keeps geometry math unit-consistent and unit-testable (ADR-0005 backend:
no float drift; same seed → same picture).

### D5 — Session as localStorage state
`SessionService` stores the active `userId` in `localStorage`. No auth calls
(backend Phase 0 ADR-0003). The session bar is a first-class UI element because
every create-list flow scopes by `userId`.

## 3. Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│ Browser SPA — standalone Angular      routes (lazy)           │
│ ┌────────────┐ ┌───────────────────────────────────────────┐ │
│ │ App shell  │ │  /             home-page                  │ │
│ │ nav+session│ │  /wizard       wizard (4-step stepper)    │ │
│ │            │ │  /templates    templates-page             │ │
│ │            │ │  /plots        plots-page                 │ │
│ │            │ │  /profiles     profiles-page              │ │
│ │            │ │  /projects     projects-page              │ │
│ │            │ │  /projects/:id/design   studio-page       │ │
│ │            │ └───────────────────────────────────────────┘ │
│ └────────────┘                                                │
│   services (per domain) ──── ApiService ──── backend HTTP     │
│   models/ (typed contract)                                    │
│   render/ (pure SVG floor-plan module)                        │
└──────────────────────────────────────────────────────────────┘
                          HTTP (proxy: /api → :3000/api/v1)
┌──────────────────────────────────────────────────────────────┐
│ NestJS backend (Phase 0) — /api/v1/*                          │
└──────────────────────────────────────────────────────────────┘
```

## 4. Data flow

1. **Form submit** → typed DTO object → domain service → `ApiService` HTTP call.
2. **Response** → DTO view (typed model) → signal in service → component renders.
3. **Error** → HTTP error → `ApiService.mapError` → typed `ApiError[code]` →
   component shows banner/inline + reasons for `UNSOLVABLE_LAYOUT`.
4. **Layout render**: `Layout` model → `renderFloorPlan(layout, floorNumber)`
   returns SVG descriptor; component binds via `[innerHTML]` (sanitized by
   Angular's DomSanitizer) or an `svg` template with bound attributes.

## 5. Cross-cutting concerns

- **Loading/disabled states**: every mutation call disables its submit until it
  settles; the canvas shows a spinner while a version loads.
- **Consistency after mutation**: create/delete flows re-query the list for the
  active user (single source: current server data).
- **Session gating**: routes that need an identity show the session picker
  first; they never hard-fail without a user.
- **Formatting**: Prettier + ESLint (Angular defaults) enforced in `verify`.
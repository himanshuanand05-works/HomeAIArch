# AGENTS.md — HomeAIArch Studio (frontend)

Rules for collaborating on `frontend/`. Parent project conventions that still
hold: documents are authoritative, small reviewable changes, no
over-engineering, decisions documented.

## 1. What this is

`frontend/` is a **separate Angular 22 project** (own `package.json`, own
`docs/`) that consumes the HomeAIArch backend through its HTTP API. It is
Phase 0 UI: no auth, deterministic-friendly, one acting identity in the
browser. The product loop is **design → change → redesign → feedback**; the
studio page is where that loop lives.

## 2. Docs of record (read first)

| Doc | Purpose |
| - | - |
| `frontend/docs/SRS.md` | What screens/behaviors are correct. |
| `frontend/docs/HLD.md` | Architecture decisions (no UI lib, backend = truth, proxy, pure renderer). |
| `frontend/docs/LLD.md` | Routes, models, services, renderer, testing strategy. |
| `frontend/docs/ROADMAP.md` | Build order (phases A–D). Pick the phase before coding. |
| `../docs/LLD.md` (§5) + `../docs/decisions/ADR-0005.md` | The exact HTTP contract + geometry units consumed. |

If the code disagrees with a doc, the doc wins until we change both.

## 3. Hard rules

1. **No `any`.** Strict TS. Models in `src/app/models/` are the only place DTO
   shapes are declared; components consume models, never raw payloads.
2. **Determinism-friendly UI.** Seed is a first-class input for both generate
   and iterate; never hide it, never auto-mutate it.
3. **Backend validates; UI presents.** Client-side checks are UX-only. All
   backend `code` values map to a UI presentation (UNSOLVABLE_LAYOUT must show
   reasons/hints). Never swallow `details`.
4. **Renderer purity.** `src/app/render/` is a pure module: no Angular imports,
   no HTTP, no DOM reads. Components wrap it. New geometry invariants ship with
   unit tests (golden SVG + integer-mm math, no float drift).
5. **No third-party runtime deps** beyond the framework unless justified in a
   decision doc (backend rule: "simplest thing that satisfies the requirement").
6. **Additive API usage.** UI may only call endpoints that exist in backend
   LLD; new endpoints need a backend PR first, and this repo's docs updated in
   the same change.
7. **Formatting/lint:** Prettier + ESLint (Angular defaults). Keep them green;
   `npm run verify` is part of done.

## 4. Done means (all apply)

- [ ] Satisfies the SRS FR it implements (cite it, e.g., `FR-S7`).
- [ ] Lint + format + typecheck + unit tests green (`npm run verify`),
      build green (`npm run build`).
- [ ] Tests cover the change; geometry/renderer changes have golden/edge tests.
- [ ] Docs in sync (SRS/HLD/LLD/ROADMAP as applicable).
- [ ] No secrets; errors surface via the code taxonomy; API calls are
      backend-doc-conformant.

## 5. Behaviors

- Ask before inventing product meaning; use the backend glossary
  (`../docs/SRS.md` §1.4) for terms.
- Read `frontend/docs/ROADMAP.md` before starting; propose out-of-phase work
  rather than building it silently.
- Rejections cite a doc line or explicit trade-off.
- Keep live docs honest; record structural decisions as ADRs under
  `frontend/docs/decisions/` and link them here.

## 6. Decisions

_Log lives in `frontend/docs/decisions/`. Link new ADRs here when added._

## 7. Bookkeeping

- Frontend commands (workdir `frontend/`): `npm run verify`, `npm run build`,
  `npm start` (dev proxy → backend `http://localhost:3000`).
- Backend must be running + seeded (`npm run verify` on `../`; seeded DB with
  `standard-india`, `south-india-compact`) for manual e2e flows.
- Live docs: `frontend/docs/` — keep honest.
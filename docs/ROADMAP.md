# Phased Release Plan

**Project:** HomeAIArch
**Doc version:** v0.1 (DRAFT)

Goal: deliver value incrementally, derisk the hardest unknown (layout engine
quality) early, and never block phase N+1 on speculative features.

---

## Phase 0 — Feasibility Prototype (accuracy first)
**Goal: prove we CAN generate valid, plausible home layouts from preferences —
the hard unknown — before building product polish.**
- NestJS scaffold, strict TS, ESLint+Prettier, `lint/format/typecheck` scripts.
- Prisma + PostgreSQL (docker compose), migrations, health checks; global
  validation + error filter (ErrorCode taxonomy), OpenAPI/Swagger.
- Fluid horizontal slice of the core loop:
  users → plots (openSides) → seeded **design templates** (regional standards:
  9" brick wall, ≥ 12×12 ft master, ≥ 10 ft kitchen counter) → **home profiles**
  (template + user overrides + mandatory requirements: open sides, attached
  bathrooms, indoor parking).
- **Algorithmic engine v1**: wall-ring inset, stair column, guillotine
  partition, ensuite-block splitting, connectivity plug, hard checker, soft
  scorer, serialization (FR-5); deterministic + seedable.
- Generate initial design + `UnsolvableLayout` diagnostics with hints.
- Property tests for geometry invariants (no overlap, in-bounds, areas, stairs,
  connectivity); unit tests for partitioner/checker/scorer.
- **Exit criteria (accuracy checklist):** for a reference set of
  (plot × template) combos, a human reviewer rates layouts as (a) structurally
  valid, (b) rooms sensibly placed (living/kitchen ground, bedrooms upper,
  ensuite attached, parking reachable), (c) dimensions honor template standards
  (≥ 12×12 ft master, ≥ 10 ft kitchen counter). Feasibility verdict → go/no-go
  for Phase 1. p95 generation < 5 s.

## Phase 1 — MVP (Vertical slice)
**Fulfills ALL "M"-priority FRs (SRS §3); adds auth.**
- Complete CRUD polish on users/plots/templates/profiles/projects (FR-1..4).
- **Auth:** JWT login (password + email), tokens, guards — additive, replaces
  the placeholder `userId`; deactivation semantics enforced (FR-1.4).
- Iteration: structured change request → child version (FR-6), version tree
  persistence, diff summary in API response.
- Feedback capture + tags + history (FR-7), **write-only**.
- e2e covering the full loop: user→plot→template→profile→project→design→
  iterate→feedback.
- **Exit criteria:** a consumer can, headlessly, go from zero to a valid 2-story
  layout, request 2 changes, review diffs, and leave feedback; generation p95
  < 5 s on reference plots; ≥ 70% coverage on domain/engine; auth enabled
  without breaking existing endpoints.

## Phase 2 — Design Quality & Usability
**Make layouts actually good, and iteration smarter (soft constraints).**
- Scorer v2: orientation, daylight, kitchen-to-dining adjacency, ensuite rules,
  storage, garage, circulation width; weighted focus (FR soft prefs).
- Smarter iteration: per-room delta solving, stability anchored to parent,
  better diffing; support room add/remove/move floors in API.
- Layout diagnostics: explain WHY (score breakdown + top improvements).
- Feedback surfacing APIs for future frontends (aggregate by tag).
- Async option behind `ILayoutGenerator` if p95 degrades.
- **Exit criteria:** > 80% of smoke-test preference sets produce layouts that a
  human reviewer rates acceptable; iteration preserves untouched rooms; doc'd
  score breakdown on every layout.

## Phase 3 — Personalization (preference learning v1)
**Make the product learn (SRS FR-8 captures; here it becomes adaptive).**
- Feedback analysis: recurring dislike tags → suggested preference
  adjustments ("You ask to enlarge kitchens often → raise default kitchen").
- Preference suggestion endpoint + explicit apply (user-in-the-loop, never
  silent).
- Household profiles (multiple residents), saved preference presets/styles.
- Observability polish: metrics dashboard (NFR-8), generation success ratio.
- **Exit criteria:** measurable suggestion take-rate and reduced average
  iterations-per-accepted-layout; privacy-safe data design reviewed.

## Phase 4 — Advanced Domain Constraints
**Budget & partial/phase-wise development (scope creep guard).**
- Budget: per-room/material cost model (rates table), cost estimate on layout,
  cost-aware constraint solver (prioritize phasing under budget).
- Partial development: staged build plans (ground floor now, first floor later)
  with structural notes; layout variants for current vs final state.
- Export: SVG/PDF floor plan rendering; DWG later (JSON → DXF converter).
- **Exit criteria:** a layout + staged plan + estimate for a reference
  low/mid/high budget case; exports visually accurate; API still v1-compatible
  (additive only).

## Phase 5 — Scale & AI-assist
**Unlock generative / smarter designs, scale the service.**
- Evaluation harness to grade engine quality at volume (seed corpus).
- AI-assisted variation: an LLM proposes concept arrays; the constraint engine
  validates & scores them via the SAME checker (trust boundary: AI never emits
  unvalidated geometry).
- Async generation queue for large/complex jobs; caching/read replicas if
  traffic demands; multi-region optional.
- **Exit criteria:** user-facing "generate N variations" feature; grader shows
  AI-assisted proposals beat baseline on quality metrics; system meets
  NFR-1/2/5 targets under projected load, documented.

---

## Cross-cutting gates (every phase)
- Contract stability: OpenAPI additive-only changes between releases; deprecation
  policy documented.
- ADRs updated for new decisions; SRS/HLD/LLD stay in sync (AGENTS.md rule).
- Security+secrets hygiene, observability, and test coverage maintained.

## Risk register (top items)
| Risk | Mitigation |
|---|---|
| Engine quality never "good enough" | **Phase 0 is explicitly a feasibility gate**; accuracy checklist + human review before Phase 1; improve quality in Phase 2. |
| Unrealistic user expectations (prefs impossible for plot) | Structured `UnsolvableLayout` diagnostics + hints from day 1 (FR-5.4). |
| Scope creep (budget/rendering/auth too early) | Phasing above; budget & export wait for Phase 4; auth is Phase 1 only. |
| Lock-in to a single engine strategy | `ILayoutGenerator` port; checker reused by any impl. |
| Data/model churn as domain matures | Additive migrations + JSONB for fast-evolving shapes; version the `layout` schema json. |

## Suggested first milestone (what to build next)
Phase 0 prototype now (scaffold + engine + API slice), because the engine
feasibility question gates everything else. The feedback loop (design → iterate
→ feedback) is the product's heart and Phase 1/2 builds on the Phase 0 verdict.
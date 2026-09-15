# AGENTS.md — Instructions for AI Agents / Collaborators

This file tells every agent (human or AI) joining HomeAIArch **what the project
is, how we think, and why we made the choices we made**, so contributions match
the project's intent instead of fighting it.

## 1. What this project is
HomeAIArch is a **NestJS (TypeScript) backend API** that generates home layout
designs from a user's plot dimensions and structured preferences, then
**iteratively revises** those designs based on user change-requests, and
**records feedback** (likes/dislikes) so future designs improve. It is
API-first, deterministic, and intentionally restrained in scope so the core
feedback loop (design → change → redesign → feedback) can be proven end-to-end
before adding glamour features (rendering, budget, AI).

The product's heart is the **feedback loop**, not any single endpoint. Optimize
for it.

## 2. Read these first (authoritative, in order)
| Doc | What it's for |
|---|---|
| `docs/SRS.md` | Requirements — defines what "correct" means. Check here first before coding a feature. |
| `docs/HLD.md` | System architecture and the reasoning behind top-level choices. |
| `docs/LLD.md` | Concrete modules, schema, engine algorithm, API contract, testing strategy. |
| `docs/Plan.md` | Domain reference — how floor-layout planning actually works in the real world (the negotiation process this app models). |
| `docs/ROADMAP.md` | What we build when (Phases 0–5). Pick the phase before starting work. |
| `docs/decisions/*.md` | Architecture Decision Records — every structural decision's context & consequences. |
| `AGENTS.md` | (this file) How to behave while working here. |

**Rule:** if a doc says "see LLD/HLD/SRS" and the code disagrees with a doc, the
doc has priority until we decide otherwise and update both. When you change
behavior, update the affected docs in the same change.

## 3. Core beliefs / reasoning that you must not silently violate
1. **Deterministic generation is sacred (SRS §2.4.7).** Same inputs + same seed
   must produce the same layout. Randomness only through a seeded RNG. This is
   what makes iteration (designs that keep "what you liked") debuggable.
2. **Layouts must be valid by construction (SRS §2.4.5, LLD §3.3).** A layout the
   checker can't satisfy is returned as `UnsolvableLayout` **with reasons and
   hints** — never a half-valid layout.
3. **Design versions are immutable snapshots (SRS FR-5.5, FR-6.3).** Iteration
   branches a child from a parent; the parent never changes. Everything needed
   to reproduce a version is stored on the version row (no hidden state).
4. **Change requests and feedback must be structured, not free-text-first
   (SRS FR-6.1, FR-7.2).** Free text is kept as annotations, but machine-readable
   shapes are the source of truth, because future learning/ML needs them without
   NLP and determinism/storage needs them without ambiguity.
5. **Templates and home profiles freeze into project snapshots at creation
   (SRS FR-4.1, HLD D4b).** Regional standards (`DesignTemplate`s 9" brick, ≥
   12×12 ft master, ≥ 10 ft kitchen counter) seed the defaults; users override
   per profile; projects stop caring about later edits.
6. **The engine is pure and DB-free (HLD D9).** It reads frozen inputs, returns
   layout + diagnostics; persistence is a separate concern. This is what lets us
   scale it and swap algorithms later.
7. **The engine is behind a port (`ILayoutGenerator`, LLD §3.1).** The
   algorithmic implementation is v1 strategy, not the definition of the system.
   Never hard-wire callers to the algorithmic impl; never let an AI assistant
   emit unvalidated geometry (ROADMAP Phase 5) — everything passes the same
   `ConstraintChecker`.
8. **REST v1 + additive-only contract (SRS §6, ROADMAP gates).** Once endpoints
   ship, changes are additive; breaking changes need a major/version discussion.
9. **Progress via phases (ROADMAP).** Don't start Phase 3 ideas in Phase 1. If you
   need something not in the current phase, flag it as an open question instead
   of building it silently.

## 4. Engineering conventions (hard rules)
- **TypeScript strict mode.** No `any` in new code. No unused vars/imports.
- **DTOs validate at the edge.** Global `ValidationPipe` (whitelist +
  forbidNonWhitelisted). All JSONB document shapes validated by Zod in the
  service layer — Prisma's `Json` is permissive.
- **Errors:** throw `DomainError` subclasses with a stable `code` from the
  `ErrorCode` enum (LLD §7). Do not raw-cast HTTP statuses in services.
  Clients branch on `code`, not on status.
- **Naming:** rooms type snake_case (`living`, `bed1`); endpoints kebab-case;
  DTO classes `CreateUserDto`, `UpdatePlotDto`; models PascalCase. Follow the
  existing module shape (controller-service-repository).
- **Do not add comments to explain what code does; name things so it's obvious.**
  Doc comments only for contracts (ports, DTOs, invariants) and WHY-not-just-what.
- **Determinism/units:** all layouts in meters, grid resolution 0.5 m. Normalize
  imperial at the edge (LLD §0, SRS §2.4.1).
- **Secrets:** never log or commit them. Config via validated env only.
- **Formatting:** run ESLint + Prettier before finishing. There is CI; green CI is
  part of done.

## 5. Quality bar / definition of done
A task is done only when ALL apply:
- [ ] Satisfies the FR/NFR it implements (cite the ID, e.g., `FR-5.2`).
- [ ] Lints + typechecks + tests pass (run them).
- [ ] Tests cover the change: unit for logic; **property-based geometry tests for
      any new engine invariant** (LLD §3.3); e2e for API flow changes.
- [ ] Docs kept in sync: update SRS/HLD/LLD/AGENTS/ADR as applicable in the same PR.
- [ ] No secrets introduced; errors use the stable code taxonomy; API is
      additive-only if touching public endpoints.
- [ ] ADR added or updated IF a structural decision was made (see §7).

## 6. How to work here (collaboration behavior)
- **Ask before guessing product meaning.** The domain (plot, preference,
  iteration semantics) is precise; if requirements are ambiguous, ask rather
  than invent. Extend this repo's own language: prefer the glossary terms from
  SRS §1.4.
- **Read the phase first.** Check ROADMAP to confirm the task belongs here.
  If it doesn't, propose it for a later phase instead of building it.
- **Small, reviewable changes.** Each PR: one concern. Engine changes ship with
  invariants + tests.
- **When you reject an approach, state the reason** (tie to an SRS/HLD/ADR line
  or an explicit trade-off); reasons are the project's memory.
- Prefer the **simplest thing that satisfies the requirement** — over-engineering
  is discouraged (e.g., no microservices, no async queue until HLD §12 triggers).

## 7. Decisions & the ADR log
When you make a structural decision (new storage, new engine strategy, API
revision, dependency with broad impact):
1. Add `docs/decisions/NNNN-<slug>.md` from the template below.
2. Record: **Status** (Proposed/Accepted/Deprecated/Superseded), **Context**
   (what we're deciding), **Decision**, **Consequences** (good & bad/trade-offs),
   **References** (SRS/HLD/LLD sections).
3. Link it from `AGENTS.md` (this file is the index).
4. If a decision is reversed, add a new ADR that supersedes the old — never edit
   history; record the evolution.

Keep the **open decisions** list at the bottom of this file current.

## 8. Resolved decisions (owner sign-off)
| # | Question | Resolution | Phase |
|---|---|---|---|
| 1 | Auth model | **Placeholder identity (`userId`) in Phase 0; JWT auth in Phase 1** (additive) | 0 / 1 |
| 2 | Async vs sync generation | **Synchronous now**; queue + async only if p95 budget (5 s) is lost — HLD §12 trigger | 0 |
| 3 | Room-type taxonomy | Registry is extensible; **v1 seed set in `room-registry.ts`** (living, dining, kitchen, bed1.., bath, wc, stair, lobby/study/store/utility, parking) | 0 |
| 4 | Valid defaults for preferences | Provided by **seeded `DesignTemplate`** (region standards) and fully **user-configurable**; defaults are never a hard block | 0 |
| 5 | Geometry model details | Wall thickness from template (e.g., 9" = 0.2286 m); circulation ratio/stair dims in template; 0.5 m grid | 0 |
| 6 | Multi-household | **HomeProfiles** are per-user and many-per-user; user **chooses which profile to load** at project creation (explicit, no silent default) | 0 |
| 7 | Goal of Phase 0 | **Feasibility prototype**: prove layouts can be generated at the desired accuracy before product polish | 0 |
| 8 | 0.5 m grid enforcement | **Deferred to rendering time** (ADR-0004): engine emits full-precision geometry so layouts stay valid by construction; snapping is a presentation-only pass in a later phase | 0 |

Decisions above are recorded as ADRs (newest wins); open version of this list is
kept in the ADR log's status column.

## 9. Bookkeeping
- Live docs: `docs/` — keep them honest.
- Phase 0 (feasibility prototype) is being built: NestJS + Prisma + engine + API
  slice. Docker not available on the dev machine → Postgres via
  `docker-compose up -d db` OR a local Postgres when running DB-backed tests;
  engine unit/property tests are DB-free.
- Language of record: English. Keep technical terms in English even in
  localizable strings.

---

*Last updated by: Phase 0 scaffold + decisions (SRS/HLD/LLD/ROADMAP/ADR-0001..0003) plus engine
hardening and ADR-0004 (ensuite pairing, partition fix, grid snap deferred). When you add
an ADR, update §7 index and §8 above.*
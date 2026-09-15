# ADR-0001: Modular NestJS monolith with a port-gated, pure layout engine

- **Status:** Accepted
- **Date:** v0.1 doc seed
- **Supercedes:** n/a

## Context

We are designing a greenfield backend to (a) manage users/plots/projects,
(b) generate home layouts from structured preferences, (c) iterate on layouts via
change requests, and (d) capture feedback for future learning. Two big unknowns:
what the generation algorithm should be, and whether the service will need to
scale (synchronous in-request generation vs async jobs). We must avoid
premature distribution and premature AI, while leaving every escape hatch open.

## Decision

1. **Single deployable** will be a **modular NestJS monolith** (feature modules:
   users, plots, preferences, projects, layout, feedback), not microservices.
2. **Persistence:** PostgreSQL + Prisma (relational core, JSONB for layout
   documents and snapshots).
3. **Layout generation** lives **behind a port `ILayoutGenerator`**. The v1
   implementation is an **algorithmic, constraint-based engine** (recursive space
   partitioning + hard/soft constraint checking + scoring + serialization).
4. The engine is **pure (no DB access)**: inputs are frozen and cloned; output is
   `{layout, metrics, score, diagnostics}` or `UnsolvableLayout` with reasons.
5. **Determinism:** all randomness flows through a seedable RNG; seeds are stored
   per version.
6. **No async job infrastructure** in v1. Generation is synchronous in the request
   path with a latency budget (p95 < 5 s). The port + a `parent/child` version
   tree keep the contract stable if async is needed later.
7. **No AI/LLM generation in v1.** Any future AI-generated geometry must be
   validated by the same `ConstraintChecker` before being accepted (ROADMAP
   Phase 5).

## Consequences

**Good**

- Fast iteration + simple operations: one service, one schema, one deploy.
- Deterministic, testable engine; property tests possible on invariants.
- Version tree + frozen inputs give full reproducibility and audit history.
- The port means algorithm swaps (and async offloading) are localized.
- REST v1 contract is additive-friendly; documented via OpenAPI from day 1.

**Bad / trade-offs**

- Monolith bound to a single runtime and single DB owner — fine at v1 scale.
- Algorithmic engine quality will be limited early; we accepted that to prove the
  feedback loop first (Phase 1) and improve quality in Phase 2.
- Synchronous generation ties up request threads on CPU-bound work; acceptable
  within the latency budget, revisit if NFR-1 is violated repeatedly.

## References

- SRS §2 (assumptions/constraints), FR-5, FR-6, NFR-5, NFR-9.
- HLD D1–D9, §9, §12.
- LLD §0, §3, §10 (future seams).

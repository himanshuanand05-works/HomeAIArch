# ADR-0003: Placeholder identity now; JWT auth in Phase 1; synchronous generation in Phase 0

- **Status:** Accepted
- **Date:** Phase 0 scaffold
- **Supercedes:** n/a (complements ADR-0001 §6)
- **In response to:** owner answers to open decisions 1-2 (AGENTS.md §8)

## Context
Phase 0's goal is a feasibility prototype: prove layouts can be built with the
desired accuracy. Two orthogonal concerns — identity and async processing —
must not derail that goal.

## Decision
1. **Auth:** Phase 0 uses placeholder identity — API calls carry a `userId`
   (body/param) that must reference an existing user. Full JWT auth
   (email+password login, guards, sessions) is **Phase 1** and is a purely
   additive module; endpoint contracts that accept `userId` grow headers/tokens
   without breaking. Deactivation (soft delete) semantics coexist.
2. **Generation:** keep **synchronous, in-request** generation in Phase 0/1;
   target p95 < 5 s (NFR-1). Introduce a job queue + async endpoints ONLY if the
   latency budget is consistently lost (HLD §12 trigger), reusing the
   `ILayoutGenerator` port and version-tree contract unchanged.

## Consequences
**Good**
- Phase 0/1 stays focused on layout quality (the core product risk).
- Auth lands as a well-tested additive layer instead of scaffolding everything
  around a half-baked auth model.
- Sync path is simplest to debug and run during the feasibility gate.

**Bad / trade-offs**
- No identity enforcement in Phase 0 (data is effectively demo-grade); a
  front-end must not rely on Phase 0 auth.
- Sync generation holds a request thread during CPU-bound work; acceptable at
  prototype scale, bounded by NFR-1 and the HLD §12 trigger.

## References
- SRS FR-1.4, NFR-1.
- HLD D11, §11, §12.
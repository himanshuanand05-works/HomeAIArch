# ADR-0004: Grid snapping is deferred to rendering time

- **Status:** Accepted
- **Date:** Phase 0 — engine test hardening
- **Supersedes:** n/a
- **In response to:** SRS §5.2 / NFR "grid resolution 0.5 m" vs the engineering
  rule that **layouts must be valid by construction** (SRS §2.4.5, LLD §3.3).

## Context

The SRS asks v1 layouts to be expressed on a 0.5 m grid (positions/sizes in
multiples of 0.5 m). A first attempt snapped each room's rect to the grid at
serialization time (independent `Math.round(x / 0.5) * 0.5` per field). That
produced invalid geometry: two adjacent rooms could round _toward each other_
and overlap, or a room near the usable perimeter could round _outward_ and leave
the plot, and rounded sizes silently shrank rooms below their `minM2`. Any
naive independent snap breaks the invariant that the layout the API returns is
the same layout the checker certified.

Making the _engine_ grid-native (snapping the container and every split to
multiples of 0.5 m) is feasible but aggressive: it disqualifies many otherwise
valid packings (tight plots, odd fractional plots) and turns feasible requests
into `UnsolvableLayout`, which contradicts the Phase 0 goal (prove layouts can
be generated at the desired accuracy before product polish).

## Decision

Phase 0 engine emits **full-precision float geometry** (meters) and the stored
`Layout` is exactly the geometry the checker validated. No grid snap is applied
to stored coordinates/sizes. The 0.5 m grid becomes a _rendering/serialization_
concern implemented in a later phase, where snapping can be applied in a
validity-preserving way (grid-aware partitioning or a snapping pass that
re-checks the result and picks a fallback).

## Consequences

- Good: determinism and valid-by-construction are never at odds with the grid;
  tight plots stay feasible; property-based tests stay simple.
- Good: coordinates are the source of truth; any future grid change is a
  presentation-only change.
- Trade-off: stored layouts can look "non-round" (e.g. `4.0579 m`); consumers
  that need clean 0.5 m multiples must apply their own snapping for display only.
- Doc edits: SRS §5.2, HLD serializer box, LLD §3.2 step 9 updated to match.

## References

- SRS §2.4.5 (valid by construction), SRS §2.4.7 (determinism), SRS §5.2 (units/grid)
- HLD D9 (pure engine), LLD §3.3 (geometry invariants), ROADMAP Phase 0

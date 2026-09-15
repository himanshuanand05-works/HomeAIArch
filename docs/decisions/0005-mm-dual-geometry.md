# ADR-0005: Integer mm storage + dual external/internal geometry

- **Status:** Accepted
- **Date:** Phase 0 — docs alignment
- **Supersedes:** n/a
- **In response to:** Plan.md §5 §9 / DSL §2.2 §2.3 — the unit open question
  (mm vs metres) and the geometry-basis open question (which polygon to store).

## Context

Three problems were open:

1. **Unit drift.** The DSL spec mandates millimetres but the Phase 0 engine
   emits geometry in metres on a 0.5 m grid. Floating-point coordinates and
   mixed units across agents create silent rounding drift over iterations.

2. **Single stored polygon creates dual-use confusion.** A space has one
   `geometry: Polygon` field; the system asks "is this wall-to-wall or internal
   face?" and the answer is different for constraint validation (non-overlap,
   adjacency, containment) vs scoring (usable area, furniture clearance,
   area-efficiency).

3. **Derived area/width/height stored independently.** Four separate numbers
   (`area`, `width`, `height`, `geometry`) can diverge when one is updated
   without the others.

## Decision

**All internal storage uses integer millimetres.** No metres, feet, or
floating-point coordinates are stored; unit conversion happens once at the edge
(input normalisation / UI display). Area is expressed in mm² as an integer
derived from the stored geometry.

**Every physical element stores two polygons:**

- `externalGeometry` — the **wall-to-wall** footprint (outer faces). Used for
  **reasoning**: adjacency, connectivity, non-overlap (walls occupy physical
  space), containment inside the construction envelope, plot coverage.
- `internalGeometry` — the **occupiable** footprint (inner painted faces,
  plaster excluded). Used for **scoring**: usable area, furniture fit and
  clearance, circulation width, area-efficiency.

Everything else — centerline, wall thickness, usable area, perimeter, centroid,
bounding box, aspect ratio, adjacency, orientation — is **derived on demand**
from these two and never stored independently.

The Phase 0 engine emits integer mm with both geometries stored per element;
the 0.5 m grid snap is deferred to rendering time (ADR-0004).

## Consequences

- **Good:** floating-point coordinate error disappears entirely; agents and
  engines share a single unambiguous integer coordinate space.
- **Good:** the checker and scorer are forced to be explicit about which polygon
  they consume; no ambient "the geometry" that means different things in
  different places.
- **Good:** area, perimeter, centroid, etc. always come from a single
  authoritative derivation; no stale stored values.
- **Trade-off:** double polygon storage per element (small memory increase;
  negligible for floor-plan scale).
- **Trade-off:** Phase 0 engine must eventually migrate from metres to mm (the
  codebase currently assumes float metres in several places). This is tracked;
  no code change in this ADR.
- **Doc edits:** DSL §2.2 §2.3 §2.5 §3 §9, Plan.md §5 §9, AGENTS.md §4 §8,
  ADR-0005 created.

## References

- Plan.md §5 (geometric constraints — dual stored bases), §9 (resolved units
  and geometry-basis questions)
- DSL §2.2 (mm-only, integer), §2.3 (two stored geometries), §2.5 (derived
  properties), §9 Space (externalGeometry / internalGeometry)
- ADR-0004 (grid snapping deferred — rendering concern, compatible)
- SRS §2.4 (valid by construction), SRS §2.4.1 (units), LLD §0 (units)

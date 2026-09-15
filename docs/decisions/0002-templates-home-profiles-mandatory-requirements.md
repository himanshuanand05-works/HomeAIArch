# ADR-0002: Design templates, home profiles, and mandatory requirements

- **Status:** Accepted
- **Date:** Phase 0 scaffold
- **Supercedes:** n/a
- **In response to:** owner answers to open decisions 3-6 (AGENTS.md §8)

## Context

We need region-familiar defaults (the product asked for standards people actually
follow: 9" brick walls, master bedroom ≥ 12×12 ft, kitchen counter ≥ 10 ft) and a
way to structure "mandatory requirements" (plot open sides, attached bathrooms,
indoor parking). We also need multiple personas/house types per user and an
explicit choice when starting a project. Without this, defaults would be
amorphous and the generator could not honor hard product constraints.

## Decision

1. Ship **`DesignTemplate`** rows (seeded, versioned, region-tagged) that bundle
   dimensional standards: wall thickness (e.g., 0.2286 m for 9" brick), room
   defaults per type, kitchen counter length, staircase, circulation ratio, door
   width, and default mandatory requirements.
2. Users create **`HomeProfile`**s: pick a template, override any default
   (defaults are always user-configurable, never a hard block), and supply
   mandatory requirements: open sides (1–4), attached bathrooms yes/no, indoor
   parking (required + car count), outdoor parking.
3. **`HomeProfile` is per-user and many-per-user.** Creating a project requires
   the user to explicitly select which profile to load; the chosen profile (and
   plot incl. openSides) is **expanded and frozen** into the project's snapshot
   at creation. Later template/profile edits never alter existing projects.
4. `openSides` lives on `Plot` (plot context) AND is mirrored into the profile's
   mandatory requirements for generator consumption at project scope.

## Consequences

**Good**

- Dimensional reality (wall bands), realistic constraints, and reproducible
  defaults out of the box.
- Feasibility prototype (Phase 0) gets its accuracy checklist targets directly
  from template standards (≥ 12×12 ft master, ≥ 10 ft kitchen counter).
- Profiles support households/personas without schema churn (registry for room
  types; JSONB for doc-shaped extras).
- Explicit profile selection preserves determinism and avoids "silent default".

**Bad / trade-offs**

- Template curation is content work; v1 seeds only one or two region presets.
- Snapshotting duplicates data (project carries expanded profile JSON) — accepted
  for immutability guarantees.
- Open-sides semantics need precision (which side is the street/entrance in v1)
  — deferred details to LLD §3.2.

## References

- SRS FR-3, FR-4, FR-5, §1.4 glossary.
- HLD D4b, D10, §8 storage design.
- LLD §2 schema, §3.2 algorithm.

# ADR-0001 — Standalone Angular, no UI framework (frontend)

**Status:** Accepted
**Phase:** A

## Context
The UI needs to be built fast, stay small, and remain maintainable for Phase 0
demonstration. Angular Material is the obvious default, but adds a large
dependency and a design-system opinion this demo doesn't need.

## Decision
Use Angular 22 **standalone-only** components with signal state and a
hand-rolled SCSS design system (variables + shared classes). No Angular
Material or other component library. `@angular/build` application builder.

## Consequences
- Good: minimal dependencies; bundle-budget-friendly; components stay
  framework-clean so a later Material swap is cosmetic; consistent with the
  backend "no over-engineering" rule.
- Trade-off: we hand-write form styling, steppers, and modals — acceptable at
  this scope; revisit if Phase 1 UX demands richer widgets.

## References
- `frontend/docs/HLD.md` §2 D1; ROADMAP Phase A.
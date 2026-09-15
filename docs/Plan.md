# Plan.md — Real-World Floor Layout Design: Domain Reference

> This document captures how floor layouts are actually produced in the real world —
> the process an architect follows with a client until the design is accepted. It
> is the **source of truth for the domain** that this app's
> architecture models. When designing modules, endpoints, or the engine, check
> here first; the app should reflect this process, not fight it.

---

## 1. Purpose

HomeAIArch is an **agentic floor planner**: the user gives a prompt like

> "I have a 30x50 ft plot, road on north, need 4 bedrooms, 3 bathrooms, parking
> for 2 cars, good ventilation, kitchen near dining, staircase"

and the system autonomously produces, validates, critiques, modifies, and finally
outputs a dimensionally valid, internally consistent floor plan.

> **Scope note — what "valid" means here, and what it doesn't.** Local building
> rules are **out of scope for now**: this build targets a **dimensionally valid
> and internally consistent** design, not a legally "buildable" one. Eligibility
> for the word _buildable_ would additionally require structural validation,
> compliance with local building codes, fire/egress rules, MEP validation,
> soil/foundation considerations, and professional review — those are layered on
> in later phases. Until then the product claims _geometric/regulatory-free
> correctness_, never _buildability_.

**The critical insight: the biggest problem is not the LLM.** The hard part is
the _process_ around generation — eliciting requirements, negotiating conflicts,
validating geometry, and converging without endless churn. Everything below
describes that process.

---

## 2. The core principle: planning is a negotiation, not a single step

Layout planning is **never a one-step process**. Users almost always arrive with
vague, half-formed requirements. What actually happens is a **negotiation
between user and architect** that concludes only when both sides converge on the
floor layout design.

The whole process is a conversion of **non-technical, vague requirements** into a
**structured, technical, validated design**, with a structured and detailed
response at each step and complete reasoning for every decision made along the
way.

---

## 3. The real-world process

### 3.1 Phase 0 — Requirements gathering

The architect first wants to learn:

| #   | Topic                                                                                                                            | Why the architect needs it                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Plot size** — front (width) and depth                                                                                          | To plan natural light, front elevation, air circulation and ventilation.                                                                                                                             |
| 2   | **Location & context** — what is to the right, left, front and back of the plot                                                  | To orient the design for sunlight, heat and ventilation; to decide how many sides are open (1-side, 2-side, 3-side, or 4-side plot); to account for neighbourhood preferences and security concerns. |
| 3   | **Occupancy** — how many members will live there, their ages, and any health conditions                                          | Drives slope steepness, room design, staircase height, and other associated constraints.                                                                                                             |
| 4   | **Preferences** — number of rooms, attached bathrooms, open kitchen, open drawing room, open living room, mandir placement, etc. | The preference list is _exhaustive_ and the architect never learns it all at once. It is discovered gradually as designs get rejected with reasons; over many iterations these preferences finalise. |

Two things happen alongside gathering:

- **Requirement → Interpretation → Constraint (traceability).** A user statement
  ("I want a private master bedroom") is **not** converted directly into a
  constraint. It becomes a _requirement_ with an interpretation, which then
  _derives_ one or more constraints:
  ```
  User statement
      ↓
  Requirement            { source: USER, text, priority, confidence, status }
      ↓
  Interpretation         { type: PRIVACY, interpreted range, uncertainty }
      ↓
  Constraint(s)          NOT_ADJACENT_TO Entrance, SEPARATED_FROM Public,
                         preferred location → Private zone
      ↓
  FloorPlan
  ```
  Every constraint cites the requirement that produced it. This is what lets the
  system answer "why did you put the bedroom here?" — and it matches the domain
  truth that requirements _harden over time_ (their status moves
  UNRESOLVED → ACCEPTED / NEGOTIATED / REJECTED as negotiation proceeds).
- **Uncertainty is kept explicit.** "Reasonably large bedroom" must **not** freeze
  into `MIN_AREA = 150`. It stays an _interpreted range_ — `{ minimum, preferred,
maximum }` — with a confidence and a `needsClarification` flag until negotiation
  or evidence narrows it. Prematurely collapsing vagueness into a number is what
  produces designs the user rejects.
- **Conflict detection.** User preferences often conflict with design
  requirements, or the user does not understand the complications and risks of a
  choice they are making. In those cases the architect negotiates the
  preference.
- **Constraint mapping.** Based on inputs, standards, and available information,
  every requirement is mapped into one of three tiers (formalised in
  `docs/constraints/`):
  - **Hard constraints** — non-negotiable; the design is invalid if violated.
    Satisfied or not: binary.
  - **Soft constraints** — negotiable; their acceptable range is derived from a
    risk-vs-benefit discussion with the user. A soft constraint is a _graded_
    predicate — `acceptable → preferred → undesirable` — best modelled as a
    preference curve (bounds + falloff), **not** a bare importance weight.
  - **Optimization objectives** — preferences that should be _maximised or
    minimised_ (e.g., area efficiency, privacy, daylight, cost). They never
    override hard/soft constraints; they only decide which valid candidate is
    better.
  - Do **not** equate soft constraint with objective: "master bedroom should be
    ≥ 150 sq ft (130 acceptable)" is a _soft constraint_ (a range); "maximize
    master bedroom area" is an _objective_ (a global optimum).

### 3.2 Phase 0b — Risk profiling

The architect analyses what the _user_ considers risky. When this risk analysis
is complete, a **preference–risk graph** can be plotted: which preferences are
acceptable up to what level of risk.

This is **iterable within the same session** — the user may change a preference
or their risk definition mid-way — so the system keeps track of these behavioural
instincts to strengthen later negotiations.

### 3.3 Phase 0c — Floor allocation

At the very first step of gathering requirements, the architect checks whether
the user has a floor count planned, and which requirements they envision on which
floor.

If floor data is absent, the architect — given the rooms, open areas, bathrooms,
parking, setbacks, garden, etc. — **foresees how many floors are needed**, splits
the plan floor-wise, and shares the proposal with the user (what exists at which
floor). The user can then adjust these ideas as new constraints for the
architect.

Multi-floor work needs **explicit vertical topology**, not just a third axis:

- **Vertical circulation**: a staircase is a _chain_ — at least one continuous
  stair path connecting consecutive floors (CONNECTS Floor1 TO Floor2, Floor2 TO
  Floor3), aligned so travel stays continuous.
- **Vertical service stacking**: wet areas are preferred _stacked_ — bathroom
  G ABOVE bathroom F1 ABOVE bathroom F2 — because that is where a shared
  plumbing shaft is cheapest. Surface this as a first-class stacking
  relationship (ALIGNED_WITH / ABOVE) and an optimization objective, not an
  afterthought.

### 3.4 Phase 1 — Rough design first, deep analysis later

Users almost never accept the first design, so the architect deliberately works
through a **design maturity ladder** — different validators are active at each
rung, and the user only sees what is useful at that rung:

```text
CONCEPT     → rooms, zones, rough relationships
TOPOLOGY    → room graph: adjacency, access, privacy, circulation
SCHEMATIC   → approximate areas, circulation widths
GEOMETRIC   → exact dimensions, walls, doors, windows
DETAILED    → furniture, stairs, plumbing, ventilation
VALIDATED   → all active validators pass
APPROVED    → user acceptance
```

1. First the architect produces a **very rough layout** (`CONCEPT`/`TOPOLOGY`)
   containing only the basic details.
2. **Only after the user selects a layout** does the work advance down the
   ladder into deeper analysis: light, air, plumbing, ventilation, and
   living-design issues, room sizes, wall thickness, window placement, door
   placement etc.

The architect communicates each issue **as it is identified**, along with a
proposed solution.

### 3.5 Phase 2 — Iterative negotiation

- Rough layouts are used as **discussion artefacts** to extract as much
  information as possible from the user.
- The architect **never overwhelms the user** with too much information at once.
- Each round is a **mutual learning loop**: the user learns the risks; the
  architect learns the true preferences and how flexible the soft/hard
  constraints really are.

### 3.6 Phase 3 — Alternatives, then principled rejection

- When requirements are too superficial or conflict with constraints, the
  architect presents **alternative ideas** — at most one or two times.
- If the user still does not engage with the challenges, the architect
  **rejects the request with proper reasoning**.

Rejecting well requires **constraint-dependency and feasibility reasoning**:

- **Constraints are not isolated.** "Master bedroom needs a window" derives
  "needs an exterior wall", which derives "must be inside the building
  envelope", which derives "must respect setbacks". Model a **constraint
  dependency graph** (`REQUIRES` / `CONFLICTS_WITH` / `AFFECTS` /
  `DERIVED_FROM`) so the system knows which constraints a candidate change can
  disturb, and so failure can be localized instead of being a single
  black-box "NO SOLUTION".
- **Failure must explain itself.** When no valid layout exists, the architect
  reports _why_: the conflicting requirements (e.g., 4 bedrooms + 2-car parking
  - 300 sq ft living + 10 ft corridors do not fit a 30×40 plot), the likely
    source (available usable area < required area), and **relaxation options**
    (reduce living, park outside, drop a bedroom, add a floor). This is
    essentially unsat-core reasoning over the constraint graph.

```text
NO SOLUTION
  ↓
Conflicting requirements      R12 4 bedroom · R15 2-car parking · R21 kitchen ≥ 120 · R34 circulation
Likely conflict               available usable area < required area
Possible resolutions          reduce living · outdoor parking · fewer bedrooms · extra floor
```

### 3.7 Phase 4 — Closure

Iterations must **not be indefinite**. The architect converges as quickly as
possible — but only with the user's satisfaction and acceptance.

---

## 4. Information control

The architect keeps all gathered data **at their end** and shares it with the
user only when:

- the user explicitly asks for it, or
- it is needed to assert/justify a design choice.

---

## 5. Geometric constraints — the "other half"

Beyond the negotiation, the square dimensions must hold mathematically:

- Wall sizes and **wall thickness**
- Window sizes
- Door sizes
- Floor height
- Staircase dimensions, and everything else implied by the above

After incorporating **all** of these geometries, the final design must:

- not exceed the **plot size** in total, and
- respect the **room/area sizes** each are planned at.

These are the _hard_ geometric invariants. The full machine-checkable taxonomy —
area with min/target/max, minimum width/length, aspect ratio, non-overlap,
door/window placement on walls, circulation clearance, staircase geometry,
orientation, alignment, and orthogonality — is specified in
`docs/constraints/02-geometric-constraints.md` and must be validated by
deterministic geometry code, never by the LLM.

**Geometry semantics — two stored bases (ADR-0005).** Every physical element
stores **two** polygons in integer millimetres: `externalGeometry` (wall-to-wall,
used for reasoning: non-overlap, adjacency, containment) and `internalGeometry`
(occupiable interior, used for scoring: usable area, furniture, clearance).
Everything else (centerline, wall thickness, usable area, perimeter, centroid) is
derived on demand. The guarantee becomes unambiguous because the system never
asks "which basis?" — it already has both.

**Geometry is derived from an authoritative kernel, never duplicated.** The two
stored polygons are the single source of truth; compute area, perimeter,
centroid, bounding box, width, length, aspect ratio, adjacency, and orientation
from them. Four separately stored truths (`area`, `width`, `height`, `geometry`)
will quietly diverge.

---

## 6. What this means for the app's architecture

| Domain truth                                                                                                       | Architectural implication                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning is a _negotiation_, not a one-shot generation                                                             | The product's heart is the **design → change → redesign → feedback loop**, not any single endpoint.                                                                                                                                   |
| Requirements are vague at first and harden over time                                                               | Change requests and preferences must be **structured and machine-readable**; free text is annotation only.                                                                                                                            |
| Constraints split into hard vs soft, with **ranges** for soft ones                                                 | Soft constraints should be modelled as ranges/flexibility, not magnitudes; hard constraints as invariants the checker enforces.                                                                                                       |
| Rough design first; deep analysis only after acceptance                                                            | Consider staging layout detail (basic → full: light, plumbing, ventilation) instead of emitting everything immediately.                                                                                                               |
| Preference–risk graph, iterable in-session                                                                         | Track the user's evolving preferences and risk tolerance as first-class durable data across iterations.                                                                                                                               |
| Principled rejection when requirements can't be satisfied                                                          | Return `UnsolvableLayout` with **reasons and hints**, never a half-valid layout.                                                                                                                                                      |
| Never overwhelm the user; share reasoning only when useful                                                         | Shape responses by detail level; store rationale/diagnostics server-side, expose on demand.                                                                                                                                           |
| Final geometry must fit the plot and room bounds                                                                   | Layouts are **valid by construction** — every output passes the same `ConstraintChecker` invariants.                                                                                                                                  |
| Architect closes the loop promptly and only on acceptance                                                          | The iteration loop should bias toward convergence and handle non-convergence explicitly, not loop forever.                                                                                                                            |
| Topological relationships matter as much as dimensions (adjacency, access, privacy, circulation, service stacking) | Solve the **room graph before geometry**: connectivity/adjacency/privacy are validated on the graph, then geometric layout is generated against it (`01-topological-constraints.md`).                                                 |
| Only the architect produces technical truth; the LLM only proposes intent                                          | **LLM proposes operations; deterministic engines validate and realize geometry.** Nothing unvalidated ever enters a layout — every candidate passes the same `ConstraintChecker` (AGENTS §3, `04-floor-plan-dsl.md`).                 |
| The architect keeps a structured technical model, not pictures                                                     | The canonical representation is the **geometry model / DSL**; rendering (SVG/PNG/DXF/BIM) is derived from it, never the source of truth or the validation target.                                                                     |
| Optimisation selects among candidates but never hand-edits walls                                                   | Optimizers score/choose over engine-generated candidates; they do not mutate geometry directly (`03-optimization-objectives.md`).                                                                                                     |
| The architect reasons from user intent, not raw numbers                                                            | A **requirement model sits above the constraints**: `USER rec → interpretation → derived constraints → plan`, with status (UNRESOLVED/ACCEPTED/NEGOTIATED/REJECTED), priority, confidence. This is what makes "why here?" answerable. |
| Constraints depend on each other; one change ripples                                                               | Maintain a **constraint dependency graph** (REQUIRES/CONFLICTS_WITH/AFFECTS/DERIVED_FROM) so proposed operations can be validated against the constraints they may disturb — not a flat bag of checks.                                |
| The architect can say _why_ something won't fit                                                                    | **Feasibility/unsat reasoning** instead of a bare "NO SOLUTION": conflicting requirements, the likely conflict, and relaxation options, produced from the constraint graph.                                                           |
| Changes are proposed, then checked, then committed                                                                 | Every **operation carries preconditions, expected effects, and a `parentVersion`**; the engine applies it to a candidate, validates, then COMMIT/REJECT. No blind mutation.                                                           |
| The work proceeds through levels of detail, never all at once                                                      | **Design-maturity ladder** (CONCEPT → TOPOLOGY → SCHEMATIC → GEOMETRIC → DETAILED → VALIDATED → APPROVED) activates different validators per stage — not a single all-or-nothing solve.                                               |
| Agents (and users) make mistakes and the architect can roll back                                                   | **Immutable versions + branching** are first-class: agents work from a pinned parent, produce candidates, and only COMMIT becomes a child version. Undo/rollback/audit/agent-attribution fall out of that.                            |
| Many candidates must be compared at scale                                                                          | Use a **spatial index** (R-tree) for overlap/proximity/adjacency/collision queries instead of comparing every room pair.                                                                                                              |

---

## 7. Constraint specifications (`docs/constraints/`)

The architectural "how" behind this domain reference lives in four specs.
Use them together: Plan.md says _what the architect does_; the specs say
_how the app must model, validate, and optimise it_ (all deterministic).

| Spec                            | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Maps to Plan.md                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `01-topological-constraints.md` | Adjacency, connectivity/access, separation, privacy ordering, circulation, containment, ordering, service + vertical relationships; `TopologicalConstraint` schema.                                                                                                                                                                                                                                                                                    | §3.1–3.2 (preferences, conflict detection)                                                |
| `02-geometric-constraints.md`   | Plot boundary, area (min/target/max), min width/length, aspect ratio, non-overlap, wall continuity, doors/windows, circulation clearance, staircase, orientation, orthogonality, setbacks; hard/soft validation strategy.                                                                                                                                                                                                                              | §3.4, §5 (geometry)                                                                       |
| `03-optimization-objectives.md` | Feasibility-first hierarchy, area/circulation/privacy/daylight/plumbing/cost metrics, Pareto, candidate pipeline, **user preference → dynamic weighting**.                                                                                                                                                                                                                                                                                             | §3.2, §3.5–3.7 (negotiation, closure, alternatives)                                       |
| `04-floor-plan-dsl.md`          | Canonical machine-readable floor-plan model: stable IDs, integer mm units, dual stored geometry (`externalGeometry`/`internalGeometry` — reason vs score), derived properties, **requirement model** (§32), **constraint dependency graph** (§33), **feasibility/unsat** (§34), **vertical semantics** (§35), **versioning/branching** (§36), provenance, score vector, plan state machine, agent operation contract ("LLM proposes, engines decide"). | §2, §3, §4 (negotiation, traceability, structured design), §5 (geometry + basis), §6 rows |

## 8. Related documents

- `AGENTS.md` — core beliefs (deterministic generation, valid-by-construction,
  structured change requests, immutable versions) formalise the rules above.
- `docs/SRS.md` — requirements, including the feedback loop (FR-6, FR-7).
- `docs/HLD.md` / `docs/LLD.md` — how the module/engine/API shape implements
  this domain.
- `docs/constraints/` — §7 above: topological, geometric, optimization, and DSL
  specs.
- `docs/ROADMAP.md` — what gets built in which phase.

## 9. Open alignment questions

Flag these for a decision before Phase 2; do not assume the answer.

- ~~**Units:** `04-floor-plan-dsl.md` §2.2 specifies **millimetres** as the
  canonical unit; the current codebase/LLD use **meters** (grid 0.5 m). Either
  reconcile the DSL to meters or migrate the model to mm — then update
  SRS/LLD/AGENTS/ADRs in the same change.~~ **Resolved — ADR-0005:** all
  internal storage and engine output in integer mm (area mm²); the API accepts
  m/ft + m² and normalizes at the edge.
- ~~**Geometry basis to lock:** §5 mandates a single, explicit dimension basis
  (wall-to-wall vs centerline vs internal vs usable). Pick the one the engine
  emits and is checked against; everything else is derived.~~ **Resolved —
  ADR-0005:** two stored geometries per element — `externalGeometry` (wall-to-wall,
  for reasoning) and `internalGeometry` (occupiable, for scoring); everything
  else is derived on demand.
- **Regulatory/setback scope:** `01` §11 and `02` §15 reference setbacks and
  emergency egress, and `04` defines a `REGULATORY` constraint class. Per the
  §1 scope note, building-code compliance is **out of scope now**; the model
  should be able to _carry_ regulatory constraints later without rework.
- **Requirement/feasibility subsystem timing:** §3.1 requirement model and §3.6
  unsat reasoning are needed by the _agentic_ planner (Phase 4/5). For the
  Phase 0 feedback loop, a lighter first cut — structured change requests +
  `UnsolvableLayout` reasons — is enough; do not gold-plate before the agent
  orchestration exists.
- **Scoring model:** `03` proposes a multi-objective score vector + Pareto
  frontier; the Phase 0 engine uses a single weighted scalar. Revisit whether
  to expose the raw vector before adding analysis features.

## 10. Relationship to `docs/temp.md`

`docs/temp.md` is a design review that audited this document. Its concrete asks
are now folded in here: requirement model (§3.1, §6), constraint dependency
graph (§3.6, §6), feasibility/unsat reasoning (§3.6), operation pre/post
conditions + `parentVersion` (§6), immutable versions/branching (§6),
design-maturity ladder (§3.4, §6), uncertainty/confidence (§3.1), geometry
semantics + derived kernel (§5), multi-floor vertical topology (§3.3), and the
"buildable" wording (§1). Keep `docs/temp.md` as the review log; treat Plan.md
as the live reference.

# Plan.md — Real-World Floor Layout Design: Domain Reference

> This document captures how floor layouts are actually produced in the real world —
> the process an architect follows with a client until a buildable design is
> accepted. It is the **source of truth for the domain** that this app's
> architecture models. When designing modules, endpoints, or the engine, check
> here first; the app should reflect this process, not fight it.

---

## 1. Purpose

HomeAIArch is an **agentic floor planner**: the user gives a prompt like

> "I have a 30x50 ft plot, road on north, need 4 bedrooms, 3 bathrooms, parking
> for 2 cars, good ventilation, kitchen near dining, staircase"

and the system autonomously produces, validates, critiques, modifies, and finally
outputs a dimensionally valid, buildable floor plan.

> **Scope note:** local building rules are **out of scope for now**. This build
> targets a dimensionally valid and internally consistent design; compliance
> with regional building codes may be layered on in a later phase.

**The critical insight: the biggest problem is not the LLM.** The hard part is
the *process* around generation — eliciting requirements, negotiating conflicts,
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

| # | Topic | Why the architect needs it |
|---|---|---|
| 1 | **Plot size** — front (width) and depth | To plan natural light, front elevation, air circulation and ventilation. |
| 2 | **Location & context** — what is to the right, left, front and back of the plot | To orient the design for sunlight, heat and ventilation; to decide how many sides are open (1-side, 2-side, 3-side, or 4-side plot); to account for neighbourhood preferences and security concerns. |
| 3 | **Occupancy** — how many members will live there, their ages, and any health conditions | Drives slope steepness, room design, staircase height, and other associated constraints. |
| 4 | **Preferences** — number of rooms, attached bathrooms, open kitchen, open drawing room, open living room, mandir placement, etc. | The preference list is *exhaustive* and the architect never learns it all at once. It is discovered gradually as designs get rejected with reasons; over many iterations these preferences finalise. |

Two things happen alongside gathering:

- **Conflict detection.** User preferences often conflict with design
  requirements, or the user does not understand the complications and risks of a
  choice they are making. In those cases the architect negotiates the
  preference.
- **Constraint mapping.** Based on inputs, standards, and available information,
  every requirement is mapped into one of two buckets:
  - **Hard constraints** — non-negotiable.
  - **Soft constraints** — negotiable; their acceptable range is derived from a
    risk-vs-benefit discussion with the user.

### 3.2 Phase 0b — Risk profiling

The architect analyses what the *user* considers risky. When this risk analysis
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

### 3.4 Phase 1 — Rough design first, deep analysis later

Users almost never accept the first design, so the architect:

1. First produces a **very rough layout** containing only the basic details.
2. **Only after the user selects a layout** does the work go into deeper
   analysis: light, air, plumbing, ventilation, and living-design issues, room sizes, wall thickness, window placement, door placement etc.

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

---

## 6. What this means for the app's architecture

| Domain truth | Architectural implication |
|---|---|
| Planning is a *negotiation*, not a one-shot generation | The product's heart is the **design → change → redesign → feedback loop**, not any single endpoint. |
| Requirements are vague at first and harden over time | Change requests and preferences must be **structured and machine-readable**; free text is annotation only. |
| Constraints split into hard vs soft, with **ranges** for soft ones | Soft constraints should be modelled as ranges/flexibility, not magnitudes; hard constraints as invariants the checker enforces. |
| Rough design first; deep analysis only after acceptance | Consider staging layout detail (basic → full: light, plumbing, ventilation) instead of emitting everything immediately. |
| Preference–risk graph, iterable in-session | Track the user's evolving preferences and risk tolerance as first-class durable data across iterations. |
| Principled rejection when requirements can't be satisfied | Return `UnsolvableLayout` with **reasons and hints**, never a half-valid layout. |
| Never overwhelm the user; share reasoning only when useful | Shape responses by detail level; store rationale/diagnostics server-side, expose on demand. |
| Final geometry must fit the plot and room bounds | Layouts are **valid by construction** — every output passes the same `ConstraintChecker` invariants. |
| Architect closes the loop promptly and only on acceptance | The iteration loop should bias toward convergence and handle non-convergence explicitly, not loop forever. |

---

## 7. Related documents

- `AGENTS.md` — core beliefs (deterministic generation, valid-by-construction,
  structured change requests, immutable versions) formalise the rules above.
- `docs/SRS.md` — requirements, including the feedback loop (FR-6, FR-7).
- `docs/HLD.md` / `docs/LLD.md` — how the module/engine/API shape implements
  this domain.
- `docs/ROADMAP.md` — what gets built in which phase.
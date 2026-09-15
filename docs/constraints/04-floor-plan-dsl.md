# Floor Plan DSL

## Purpose

The Floor Plan DSL is the canonical machine-readable representation of a floor plan for an agentic layout system.

It acts as the contract between:

- Requirement / LLM agents
- Topological reasoning
- Geometric engine
- Constraint validator
- Optimization engine
- Structural / MEP validators
- Renderer (SVG / PNG / DXF / BIM)
- Versioning and user-driven refinement

The key principle is:

> **Agents modify semantic layout state; deterministic engines validate and realize geometry.**

Do not use SVG, PNG, DXF, or an LLM-generated image as the source of truth.

---

# 1. High-Level Model

```text
FloorPlan
├── metadata
├── site
├── building
├── levels[]
├── zones[]
├── spaces[]
├── boundaries[]
├── openings[]
├── circulation[]
├── furniture[]
├── structuralGrid
├── services
├── requirements[]
├── constraints[]
├── objectives[]
└── provenance
```

The minimum useful dependency chain is:

```text
User Intent
    ↓
Requirements
    ↓
FloorPlan DSL
    ↓
Topology
    ↓
Geometry
    ↓
Validation
    ↓
Optimization
    ↓
Rendering
```

---

# 2. Design Principles

## 2.1 Stable IDs

Every entity must have a stable ID.

```text
space.master_bedroom
space.kitchen
opening.main_entry
level.ground
```

Agents should refer to IDs instead of natural-language names wherever possible.

## 2.2 Units — mm only, integer

The **only** internal unit is **millimetres**, stored as **whole numbers**
(integer mm). No metres, feet, or floating-point coordinates exist inside the
canonical store.

```json
{
  "width": 3000,
  "height": 3600
}
```

All unit conversion happens exactly once at the edge — imperial or metric input
is normalised to integer mm on ingestion; the UI converts back only for
display.

```text
Canonical: 3000 mm   (integer, stored)
Display:   9' 10"    (UI only)
```

Using a single integer unit removes both classic failure modes: unit drift
across agents and floating-point coordinate error accumulating over iterations.
The Phase 0 backend emits integer mm (ADR-0005); the 0.5 m grid remains a
rendering-time snap concern only (ADR-0004).

## 2.3 Two stored geometries

Do not store only:

```json
{ "area": 120 }
```

Every physical element stores **two** polygons, both in integer mm:

- `externalGeometry` — the footprint bounded by the **outer wall faces**
  (wall-to-wall). This is what **reasoning** uses: adjacency, connectivity
  (shared faces), non-overlap (walls occupy physical space), containment inside
  the construction envelope, plot coverage.
- `internalGeometry` — the **occupiable** footprint inside the walls (painted
  face to painted face, plaster excluded where it matters). This is what
  **scoring** uses: usable area, furniture fit and clearance, circulation
  width, area-efficiency.

```json
{
  "externalGeometry": { "type": "POLYGON", "coordinates": [...] },
  "internalGeometry": { "type": "POLYGON", "coordinates": [...] }
}
```

The two are primaries and are stored together; neither is regenerated from the
other. Everything else — centerline, wall thickness, plaster offset, aspect
ratio, area, perimeter, centroid, bounding box — is **derived on demand**
(§2.5). A dimension that does not state `external` or `internal` explicitly is
ambiguous and must not enter the store.

Wall-bounded elements (spaces, boundaries, circulation) carry both polygons;
solid objects without a wall interior (furniture, structural columns, service
shafts) carry a single `geometry` where internal == external by definition.

## 2.4 Hard vs Soft

Every constraint should explicitly indicate whether it is hard or soft.

```json
{
  "hard": true
}
```

Hard constraint violations invalidate a candidate.

Soft constraint violations reduce its score.

Soft constraints are **graded ranges, not bare weights**. A soft constraint is a
predicate over `acceptable → preferred → undesirable` (bounds + falloff, e.g.
"master ≥ 10 sq m (6 sq m acceptable, 8 sq m preferred)"), and it is **not an
objective** — softening a constraint must never be used to chase a global
optimum like "maximize master area" (Plan.md §3.1).

## 2.5 Derived Properties

All of the following are derived from the two stored polygons (`externalGeometry`
+ `internalGeometry`) and are never stored independently:

- area (external and internal)
- perimeter
- centroid
- bounding box
- centerline (average of external / internal)
- wall thickness (external minus internal offset)
- aspect ratio
- adjacency
- circulation distance

This prevents inconsistent state.

## 2.6 Area units

Area is expressed in **square millimetres** (mm²) as an integer derived from the
stored polygon coordinates. For display it is shown in m²; the internal value is
always mm².

---

# 3. Canonical TypeScript Model

```typescript
type ID = string;
type Millimetres = number;   // always an integer (§2.2)
type Degrees = number;
type MillimetresSquared = number; // always an integer (§2.6)

type Point = {
  x: Millimetres;
  y: Millimetres;
};

type Polygon = {
  type: "POLYGON";
  coordinates: Point[];  // integer mm (§2.2)
};

type LineString = {
  type: "LINESTRING";
  coordinates: Point[];
};

type Vector = {
  x: number;
  y: number;
};
```

---

# 4. FloorPlan

```typescript
interface FloorPlan {
  schemaVersion: string;

  id: ID;

  metadata: {
    name?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };

  site: Site;

  building: Building;

  levels: Level[];

  zones: Zone[];

  spaces: Space[];

  boundaries: Boundary[];

  openings: Opening[];

  circulation: CirculationElement[];

  furniture: Furniture[];

  structuralGrid?: StructuralGrid;

  services?: ServiceLayout;

  constraints: Constraint[];

  objectives: Objective[];

  requirements: Requirement[];

  provenance: Provenance;
}
```

---

# 5. Site

```typescript
interface Site {
  id: ID;

  boundary: Polygon;

  orientation: {
    northAngle: Degrees;
  };

  roads: Road[];

  setbacks: Setback[];

  siteFeatures?: SiteFeature[];
}
```

Example:

```json
{
  "id": "site.main",
  "boundary": {
    "type": "POLYGON",
    "coordinates": [
      { "x": 0, "y": 0 },
      { "x": 15240, "y": 0 },
      { "x": 15240, "y": 9144 },
      { "x": 0, "y": 9144 }
    ]
  },
  "orientation": {
    "northAngle": 0
  },
  "roads": [
    {
      "id": "road.north",
      "side": "NORTH"
    }
  ],
  "setbacks": [
    {
      "side": "FRONT",
      "minimum": 1500
    }
  ]
}
```

---

# 6. Building

```typescript
interface Building {
  id: ID;

  constructionEnvelope: Polygon;

  maxHeight?: Millimetres;

  maxGroundCoverage?: number;

  maxFAR?: number;

  usage: "RESIDENTIAL" | "COMMERCIAL" | "MIXED";

  codeProfile?: string;
}
```

The construction envelope should be generated from the site and applicable regulations rather than manually guessed by the LLM.

---

# 7. Levels

```typescript
interface Level {
  id: ID;

  name: string;

  elevation: Millimetres;

  floorToFloorHeight: Millimetres;

  slabThickness?: Millimetres;

  spaces: ID[];

  structuralGridId?: ID;
}
```

Example:

```json
{
  "id": "level.ground",
  "name": "Ground Floor",
  "elevation": 0,
  "floorToFloorHeight": 3200,
  "spaces": [
    "space.living",
    "space.kitchen",
    "space.dining"
  ]
}
```

---

# 8. Zones

Zones provide semantic grouping.

```typescript
type ZoneType =
  | "PUBLIC"
  | "SEMI_PRIVATE"
  | "PRIVATE"
  | "SERVICE"
  | "CIRCULATION"
  | "OUTDOOR"
  | "PARKING";

interface Zone {
  id: ID;

  type: ZoneType;

  name: string;

  spaces: ID[];

  parentZoneId?: ID;
}
```

Example:

```json
{
  "id": "zone.private",
  "type": "PRIVATE",
  "name": "Private Zone",
  "spaces": [
    "space.master",
    "space.bedroom_2",
    "space.bedroom_3"
  ]
}
```

---

# 9. Spaces

A space is the primary architectural semantic entity.

```typescript
type SpaceType =
  | "LIVING"
  | "DINING"
  | "KITCHEN"
  | "BEDROOM"
  | "MASTER_BEDROOM"
  | "BATHROOM"
  | "TOILET"
  | "UTILITY"
  | "STUDY"
  | "PUJA"
  | "STORE"
  | "BALCONY"
  | "GARAGE"
  | "STAIRCASE"
  | "CORRIDOR"
  | "LOBBY"
  | "OTHER";

interface Space {
  id: ID;

  name: string;

  type: SpaceType;

  levelId: ID;

  zoneId?: ID;

  externalGeometry: Polygon;

  internalGeometry: Polygon;

  requirements?: SpaceRequirements;

  preferences?: SpacePreferences;

  openings: ID[];

  furniture: ID[];

  properties?: Record<string, unknown>;
}
```

---

# 10. Space Requirements

```typescript
interface SpaceRequirements {
  minArea?: number;     // mm² (§2.6)
  targetArea?: number;  // mm²
  maxArea?: number;     // mm²

  minWidth?: Millimetres;
  minLength?: Millimetres;

  maxAspectRatio?: number;

  requiresExteriorWall?: boolean;

  requiresWindow?: boolean;

  requiresNaturalVentilation?: boolean;

  accessibilityRequired?: boolean;

  privacyLevel?: "LOW" | "MEDIUM" | "HIGH";

  confidence?: number;

  needsClarification?: boolean;
}
```

`minArea/targetArea/maxArea` encode the interpreted range
`{minimum, preferred, maximum}` (Plan.md §3.1). Do not freeze "Reasonably large
bedroom" silently into a bare `MIN_AREA`; retain the source requirement,
uncertainty, and `needsClarification` (see §32 Requirement Model).

---

# 11. Space Preferences

Preferences are not necessarily hard constraints.

```typescript
interface SpacePreferences {
  preferredOrientation?: (
    | "NORTH"
    | "SOUTH"
    | "EAST"
    | "WEST"
  )[];

  preferredAdjacentTo?: ID[];

  preferredNear?: ID[];

  preferredAwayFrom?: ID[];

  preferredExteriorSide?: (
    | "FRONT"
    | "REAR"
    | "LEFT"
    | "RIGHT"
  )[];
}
```

---

# 12. Boundaries

```typescript
type BoundaryType =
  | "EXTERIOR_WALL"
  | "INTERIOR_WALL"
  | "PARTITION"
  | "PROPERTY_BOUNDARY";

interface Boundary {
  id: ID;

  type: BoundaryType;

  geometry: LineString;

  thickness: Millimetres;

  separates?: [ID, ID];

  loadBearing?: boolean;
}
```

---

# 13. Openings

```typescript
type OpeningType =
  | "DOOR"
  | "WINDOW"
  | "SLIDING_DOOR"
  | "VENTILATOR";

interface Opening {
  id: ID;

  type: OpeningType;

  hostBoundaryId: ID;

  position: number;

  width: Millimetres;

  height?: Millimetres;

  swing?: DoorSwing;

  connects?: [ID, ID];

  sillHeight?: Millimetres;
}
```

Door example:

```json
{
  "id": "opening.master_bedroom_door",
  "type": "DOOR",
  "hostBoundaryId": "wall.master.corridor",
  "position": 3200,
  "width": 900,
  "height": 2100,
  "swing": {
    "direction": "INWARD",
    "angle": 90
  },
  "connects": [
    "space.master",
    "space.corridor"
  ]
}
```

---

# 14. Circulation

```typescript
interface CirculationElement {
  id: ID;

  type:
    | "CORRIDOR"
    | "STAIR"
    | "RAMP"
    | "ENTRY_PATH"
    | "EGRESS_PATH";

  levelId: ID;

  externalGeometry: Polygon;

  internalGeometry: Polygon;

  width?: Millimetres;

  connects: ID[];

  accessibility?: {
    accessible: boolean;
  };
}
```

---

# 15. Furniture

Furniture is important because area-only validation cannot guarantee usability.

```typescript
interface Furniture {
  id: ID;

  type:
    | "BED"
    | "WARDROBE"
    | "SOFA"
    | "DINING_TABLE"
    | "KITCHEN_COUNTER"
    | "TOILET"
    | "SINK"
    | "SHOWER"
    | "DESK"
    | "OTHER";

  spaceId: ID;

  geometry: Polygon;

  clearance?: {
    polygon: Polygon;
  };

  movable: boolean;
}
```

---

# 16. Structural Grid

```typescript
interface StructuralGrid {
  id: ID;

  axesX: Millimetres[];

  axesY: Millimetres[];

  columns: StructuralColumn[];

  beams?: StructuralBeam[];
}

interface StructuralColumn {
  id: ID;

  position: Point;

  width: Millimetres;

  depth: Millimetres;
}
```

The architectural system should expose structural constraints but should not claim final structural adequacy without engineering analysis.

---

# 17. Services

```typescript
interface ServiceLayout {
  plumbingShafts: ServiceShaft[];

  wetAreas: ID[];

  electricalZones?: ID[];

  hvacZones?: ID[];
}

interface ServiceShaft {
  id: ID;

  geometry: Polygon;

  levels: ID[];

  services: (
    | "WATER"
    | "DRAINAGE"
    | "VENT"
    | "ELECTRICAL"
  )[];
}
```

---

# 18. Topological Constraints

```typescript
type TopologicalRelation =
  | "ADJACENT_TO"
  | "NOT_ADJACENT_TO"
  | "CONNECTS_TO"
  | "DIRECTLY_ACCESSES"
  | "SEPARATED_FROM"
  | "CONTAINED_IN"
  | "NEAR"
  | "CLUSTERED_WITH"
  | "ABOVE"
  | "BELOW"
  | "ALIGNED_WITH"
  | "BEFORE";

interface TopologicalConstraint {
  kind: "TOPOLOGICAL";

  id: ID;

  source: ID;

  relation: TopologicalRelation;

  target: ID;

  hard: boolean;

  weight?: number;

  rationale?: string;
}
```

Example:

```json
{
  "kind": "TOPOLOGICAL",
  "id": "constraint.kitchen_dining",
  "source": "space.kitchen",
  "relation": "ADJACENT_TO",
  "target": "space.dining",
  "hard": true
}
```

---

# 19. Geometric Constraints

```typescript
type GeometricConstraintType =
  | "MIN_AREA"
  | "MAX_AREA"
  | "MIN_WIDTH"
  | "MIN_LENGTH"
  | "MAX_ASPECT_RATIO"
  | "INSIDE"
  | "NO_OVERLAP"
  | "MIN_CLEARANCE"
  | "ON_WALL"
  | "ALIGN_WITH"
  | "ORTHOGONAL"
  | "SETBACK"
  | "ACCESSIBLE";

interface GeometricConstraint {
  kind: "GEOMETRIC";

  id: ID;

  type: GeometricConstraintType;

  entities: ID[];

  value?: number | string;   // mm for dimensions, mm² for area (§2.6)

  hard: boolean;

  weight?: number;

  rationale?: string;
}
```

---

# 20. Optimization Objectives

```typescript
type ObjectiveDirection = "MAXIMIZE" | "MINIMIZE";

type ObjectiveType =
  | "AREA_EFFICIENCY"
  | "CIRCULATION_EFFICIENCY"
  | "PRIVACY"
  | "DAYLIGHT"
  | "VENTILATION"
  | "PLUMBING_EFFICIENCY"
  | "STRUCTURAL_EFFICIENCY"
  | "COST"
  | "FURNITURE_USABILITY"
  | "ACCESSIBILITY"
  | "COMPACTNESS"
  | "AESTHETIC"
  | "FLEXIBILITY";

interface Objective {
  id: ID;

  type: ObjectiveType;

  direction: ObjectiveDirection;

  weight: number;

  target?: number;

  tolerance?: number;
}
```

---

# 21. Unified Constraint Type

The system can expose a single constraint collection while retaining specialized semantics.

```typescript
type Constraint =
  | TopologicalConstraint
  | GeometricConstraint
  | RegulatoryConstraint
  | SafetyConstraint
  | ServiceConstraint;
```

Regulatory and safety constraints should be provided by deterministic rule engines.

---

# 22. Regulatory Constraints

```typescript
interface RegulatoryConstraint {
  kind: "REGULATORY";

  id: ID;

  ruleId: string;

  entities: ID[];

  expression: string;

  hard: true;

  source: {
    jurisdiction: string;
    authority?: string;
    version?: string;
  };
}
```

Example:

```json
{
  "kind": "REGULATORY",
  "id": "rule.front_setback",
  "ruleId": "FRONT_SETBACK",
  "entities": ["building.main"],
  "expression": "frontSetback >= 1500",
  "hard": true,
  "source": {
    "jurisdiction": "example",
    "version": "2026"
  }
}
```

The expression should be evaluated by a rule engine, not by the LLM.

---

# 23. Provenance

Agentic systems need to know **why** a layout element exists.

```typescript
interface Provenance {
  source:
    | "USER"
    | "LLM"
    | "SOLVER"
    | "RULE_ENGINE"
    | "ARCHITECT"
    | "IMPORT";

  agentId?: string;

  reason?: string;

  parentVersion?: string;

  confidence?: number;
}
```

At entity level:

```typescript
interface EntityProvenance {
  createdBy: Provenance;
  modifiedBy?: Provenance[];
}
```

This enables explainability:

> "The kitchen was moved 600 mm east because the optimizer reduced plumbing distance while preserving the hard adjacency constraint."

---

# 24. Candidate / Solution Model

Do not mutate the user's canonical plan blindly.

Generate candidates.

```typescript
interface LayoutCandidate {
  id: ID;

  basePlanId: ID;

  plan: FloorPlan;

  validation: ValidationResult;

  score?: ScoreVector;

  generation: {
    agentId: string;
    iteration: number;
  };
}
```

---

# 25. Validation Result

```typescript
interface ValidationResult {
  valid: boolean;

  hardViolations: Violation[];

  softViolations: Violation[];

  warnings: Violation[];

  metrics: ValidationMetrics;
}

interface Violation {
  constraintId: ID;

  severity: "ERROR" | "WARNING";

  message: string;

  entities: ID[];

  actual?: number | string;

  expected?: number | string;
}
```

Example:

```json
{
  "valid": false,
  "hardViolations": [
    {
      "constraintId": "bedroom.min_width",
      "severity": "ERROR",
      "message": "Bedroom width is below minimum",
      "entities": ["space.bedroom_2"],
      "actual": 2700,
      "expected": 3000
    }
  ]
}
```

---

# 26. Score Vector

A single scalar score can hide important trade-offs.

Represent the full vector:

```typescript
interface ScoreVector {
  areaEfficiency: number;
  circulationEfficiency: number;
  privacy: number;
  daylight: number;
  ventilation: number;
  plumbingEfficiency: number;
  structuralEfficiency: number;
  cost: number;
  furnitureUsability: number;
  accessibility: number;
  compactness: number;
  aesthetics: number;
}
```

This allows Pareto optimization.

---

# 27. Layout State Machine

The plan should move through explicit states.

```text
DRAFT
  ↓
TOPOLOGY_VALID
  ↓
GEOMETRY_GENERATED
  ↓
GEOMETRY_VALID
  ↓
REGULATORY_VALID
  ↓
OPTIMIZED
  ↓
USER_APPROVED
  ↓
EXPORTABLE
```

A candidate should never reach `EXPORTABLE` while hard constraints remain unresolved.

The DSL state machine is computational; Plan.md §3.4 describes the
**user-facing design-maturity ladder** (CONCEPT → TOPOLOGY → SCHEMATIC →
GEOMETRIC → DETAILED → VALIDATED → APPROVED). The two are aligned as follows:

| Maturity stage | DSL state(s)                     |
| -------------- | -------------------------------- |
| CONCEPT        | DRAFT                            |
| TOPOLOGY       | TOPOLOGY_VALID                   |
| SCHEMATIC      | GEOMETRY_GENERATED               |
| GEOMETRIC      | GEOMETRY_VALID                   |
| DETAILED       | REGULATORY_VALID                 |
| VALIDATED      | OPTIMIZED                        |
| APPROVED       | USER_APPROVED                    |

---

# 28. Agent Interaction Contract

Agents should perform operations rather than directly rewriting the entire document.

Example:

```typescript
interface LayoutOperation {
  operationId: ID;

  type:
    | "ADD_SPACE"
    | "REMOVE_SPACE"
    | "MOVE_SPACE"
    | "RESIZE_SPACE"
    | "ROTATE_SPACE"
    | "ADD_OPENING"
    | "REMOVE_OPENING"
    | "ADD_CONSTRAINT"
    | "REMOVE_CONSTRAINT"
    | "CHANGE_OBJECTIVE";

  targetId?: ID;

  parentVersion?: ID;

  parameters: Record<string, unknown>;

  preconditions?: string[];

  expectedEffects?: string[];

  reason: string;
}
```

Example:

```json
{
  "operationId": "op.104",
  "type": "MOVE_SPACE",
  "targetId": "space.kitchen",
  "parameters": {
    "delta": {
      "x": 600,
      "y": 0
    }
  },
  "reason": "Reduce kitchen-to-plumbing-shaft distance."
}
```

The geometry engine then decides whether this operation is valid.

---

# 29. Transactional Agent Operations

Treat layout mutations like database transactions.

```text
Agent proposes operation
        ↓
Create candidate state
        ↓
Run topology validator
        ↓
Run geometry validator
        ↓
Run regulatory validator
        ↓
Run service validator
        ↓
Calculate objective delta
        ↓
COMMIT / REJECT
```

Conceptually:

```typescript
const result = layoutEngine.apply(plan, operation);

if (!result.validation.valid) {
  return reject(result.validation);
}

return commit(result.plan);
```

This is critical for preventing agents from corrupting the spatial state.

---

# 30. Example Complete DSL

```json
{
  "schemaVersion": "1.0.0",

  "id": "plan.house_001",

  "metadata": {
    "name": "3BHK Concept",
    "description": "Family residence"
  },

  "site": {
    "id": "site.main",

    "boundary": {
      "type": "POLYGON",
      "coordinates": [
        { "x": 0, "y": 0 },
        { "x": 15240, "y": 0 },
        { "x": 15240, "y": 9144 },
        { "x": 0, "y": 9144 }
      ]
    },

    "orientation": {
      "northAngle": 0
    },

    "roads": [
      {
        "id": "road.front",
        "side": "NORTH"
      }
    ],

    "setbacks": [
      {
        "side": "FRONT",
        "minimum": 1500
      },
      {
        "side": "REAR",
        "minimum": 1000
      }
    ]
  },

  "building": {
    "id": "building.main",
    "constructionEnvelope": {
      "type": "POLYGON",
      "coordinates": []
    },
    "usage": "RESIDENTIAL"
  },

  "levels": [
    {
      "id": "level.ground",
      "name": "Ground Floor",
      "elevation": 0,
      "floorToFloorHeight": 3200,
      "spaces": [
        "space.living",
        "space.dining",
        "space.kitchen",
        "space.master",
        "space.bedroom_2",
        "space.bathroom_1"
      ]
    }
  ],

  "zones": [
    {
      "id": "zone.public",
      "type": "PUBLIC",
      "name": "Public",
      "spaces": [
        "space.living",
        "space.dining"
      ]
    },
    {
      "id": "zone.service",
      "type": "SERVICE",
      "name": "Service",
      "spaces": [
        "space.kitchen",
        "space.bathroom_1"
      ]
    },
    {
      "id": "zone.private",
      "type": "PRIVATE",
      "name": "Private",
      "spaces": [
        "space.master",
        "space.bedroom_2"
      ]
    }
  ],

  "spaces": [],

  "boundaries": [],

  "openings": [],

  "circulation": [],

  "furniture": [],

  "constraints": [
    {
      "kind": "TOPOLOGICAL",
      "id": "constraint.kitchen_dining",
      "source": "space.kitchen",
      "relation": "ADJACENT_TO",
      "target": "space.dining",
      "hard": true
    },
    {
      "kind": "TOPOLOGICAL",
      "id": "constraint.master_bath",
      "source": "space.master",
      "relation": "DIRECTLY_ACCESSES",
      "target": "space.bathroom_1",
      "hard": false,
      "weight": 0.8
    },
    {
      "kind": "GEOMETRIC",
      "id": "constraint.master_area",
      "type": "MIN_AREA",
      "entities": [
        "space.master"
      ],
      "value": 120000000,
      "hard": true
    }
  ],

  "objectives": [
    {
      "id": "objective.area",
      "type": "AREA_EFFICIENCY",
      "direction": "MAXIMIZE",
      "weight": 0.25
    },
    {
      "id": "objective.privacy",
      "type": "PRIVACY",
      "direction": "MAXIMIZE",
      "weight": 0.2
    },
    {
      "id": "objective.circulation",
      "type": "CIRCULATION_EFFICIENCY",
      "direction": "MAXIMIZE",
      "weight": 0.2
    },
    {
      "id": "objective.cost",
      "type": "COST",
      "direction": "MINIMIZE",
      "weight": 0.15
    }
  ],

  "provenance": {
    "source": "USER",
    "reason": "Initial requirements"
  }
}
```

---

# 31. Recommended System Boundary

The DSL should establish this architectural boundary:

```text
                    LLM / AGENTS
                         │
                         │ LayoutOperation
                         ▼
              ┌─────────────────────┐
              │   Layout Engine     │
              │                     │
              │  DSL + State Mgmt   │
              └──────────┬──────────┘
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
         Topology     Geometry    Regulation
         Validator    Validator   Rule Engine
             │           │           │
             └───────────┼───────────┘
                         ▼
                    Optimizer
                         │
                         ▼
                    Candidate
                         │
                         ▼
                     Renderer
                  /       |       \
                SVG      DXF      BIM
```

The **DSL is the anti-corruption layer** between probabilistic AI reasoning and deterministic architectural computation.

---

# 32. Requirement Model

The DSL models **requirements above constraints** so the system can answer
"why is this constraint here?" and keep uncertainty visible (Plan.md §3.1).
A constraint never exists without a requirement that derived it.

```typescript
type RequirementStatus =
  | "UNRESOLVED"
  | "ACCEPTED"
  | "NEGOTIATED"
  | "REJECTED";

interface InterpretedRange {
  minimum?: number;
  preferred?: number;
  maximum?: number;
}

interface Requirement {
  id: ID;

  source: "USER" | "ARCHITECT" | "INFERRED" | "REGULATION";

  statement: string;

  priority: "MANDATORY" | "HIGH" | "MEDIUM" | "LOW";

  status: RequirementStatus;

  interpretedRange?: InterpretedRange;

  confidence?: number;

  needsClarification?: boolean;

  derivedConstraints: ID[];

  provenance: EntityProvenance;
}
```

`Requirement.derivedConstraints` is the traceability link into the constraint
graph. `interpretedRange` keeps soft-constraint flexibility explicit; a vague
"Reasonably large bedroom" must surface via `needsClarification` instead of
being silently frozen into a hard `MIN_AREA`.

---

# 33. Constraint Dependency Graph

Constraints are related, not isolated (Plan.md §3.6). A dependency edge tells
the system which constraints can disrupt each other when one changes.

```typescript
type ConstraintDependency =
  | "REQUIRES"
  | "CONFLICTS_WITH"
  | "AFFECTS"
  | "DERIVED_FROM";

interface ConstraintEdge {
  id: ID;

  sourceConstraintId: ID;

  relationship: ConstraintDependency;

  targetConstraintId: ID;

  rationale?: string;
}
```

- `REQUIRES` — "bedroom needs a window" → wall must be exterior → must respect
  setbacks (a chain).
- `CONFLICTS_WITH` — "4 bedrooms + 2-car parking + 120 sq ft living" on a small
  plot.
- `AFFECTS` — one constraint's value changes another's (raising master area low
  space for the kitchen).
- `DERIVED_FROM` — constraint originates from the same user requirement
  (links to §32).

Plan the constraint store as a **DAG plus conflict edges**, so unsat-core
extraction over it can attribute failure to the original requirements.

---

# 34. Feasibility Analysis / Unsat Reasoning

`ValidationResult` reports *what* failed; feasibility analysis reports *why* and
*how to relax* (Plan.md §3.6) — never a bare "NO SOLUTION".

```typescript
interface FeasibilityAnalysis {
  feasible: boolean;

  conflictingRequirements: ID[];

  conflictingConstraints: ID[];

  explanation: string;

  relaxationOptions: RelaxationOption[];
}

interface RelaxationOption {
  constraintId: ID;

  proposal: string;

  impact?: string;
}
```

Example:

```text
conflictingRequirements: [req.four_bedrooms, req.two_car_parking, req.living_120sqft]
conflictingConstraints:  [geo.usable_area_min, geo.covered_area_max]
explanation:             "required usable area 412 m² exceeds plot capacity 340 m²"
relaxationOptions: [
  { constraintId: "geo.living_area_min", proposal: "reduce living to 90 sq ft"  },
  { constraintId: "geo.cost_area",       proposal: "park outside the footprint" },
  { constraintId: "req.four_bedrooms",   proposal: "drop to three bedrooms"     },
  { constraintId: "req.plot_coverage",   proposal: "add one floor"              }
]
```

This analysis is derived from the constraint dependency graph (§33) plus the
requirement model (§32), by deterministic reasoning.

---

# 35. Multi-Level Vertical Semantics

Level relationships exist beyond `ABOVE/BELOW` (see §7, §18):

- **Staircase chain** — `STAIRCASE` elements connect consecutive levels with a
  joint total reading (STAIR.connecting = [level.ground, level.first]); the
  chain must be continuous: `[L0,L1]`, `[L1,L2]`, never `[L0,L2]` without `[L0,L1]`.
- **Wet-area stacking** — baths / toilets / kitchens with a shared plumbing
  shaft are preferred `ALIGNED_WITH` across floors (Plan.md §3.3). Represented
  as `TopologicalConstraint` with `relation: "ALIGNED_WITH"` and an
  `objectives` entry of `PLUMBING_EFFICIENCY`.

---

# 36. Versioning & Branching

Immutable-version semantics (Plan.md §6, AGENTS §3):

- The user's plan is a chain of **immutable versions**; never mutate in place.
- Agents read a **pinned version** (`parentVersion` on `LayoutOperation`, §28)
  and produce a candidate (`LayoutCandidate.basePlanId`).
- Only an explicit `COMMIT` (validated candidate, §29) creates a child version;
  anything else is discarded. Undo/rollback/audit/agent-attribution fall out of
  this model.
- Plans may branch: a `LayoutCandidate` with no commit is a branch; merging
  back is a new `COMMIT` child.

---

# 37. Most Important Invariant

The system should enforce:

```text
LLM cannot directly create "truth".

LLM proposes intent or operations.

Deterministic engines decide whether
that intent can become valid spatial state.
```

This makes the system:

- reproducible
- testable
- explainable
- debuggable
- versionable
- solver-friendly
- resistant to hallucinated geometry
- suitable for future CAD/BIM integrations


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

## 2.2 Units

The canonical internal unit should be **millimetres**.

```json
{
  "width": 3000,
  "height": 3600
}
```

The UI may display feet/inches or metres.

```text
Canonical: 3000 mm
Display: 9' 10"
```

This avoids floating-point and unit-conversion inconsistencies across agents.

## 2.3 Geometry Is Explicit

Do not store only:

```json
{
  "area": 120
}
```

Store actual geometry:

```json
{
  "geometry": {
    "type": "POLYGON",
    "coordinates": [...]
  }
}
```

Area should be derived and validated from geometry.

## 2.4 Hard vs Soft

Every constraint should explicitly indicate whether it is hard or soft.

```json
{
  "hard": true
}
```

Hard constraint violations invalidate a candidate.

Soft constraint violations reduce its score.

## 2.5 Derived Properties

Prefer storing source geometry and deriving:

- area
- perimeter
- centroid
- bounding box
- adjacency
- room dimensions
- circulation distance

This prevents inconsistent state.

---

# 3. Canonical TypeScript Model

```typescript
type ID = string;
type Millimetres = number;
type Degrees = number;

type Point = {
  x: Millimetres;
  y: Millimetres;
};

type Polygon = {
  type: "POLYGON";
  coordinates: Point[];
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

  geometry: Polygon;

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
  minArea?: number;
  targetArea?: number;
  maxArea?: number;

  minWidth?: Millimetres;
  minLength?: Millimetres;

  maxAspectRatio?: number;

  requiresExteriorWall?: boolean;

  requiresWindow?: boolean;

  requiresNaturalVentilation?: boolean;

  accessibilityRequired?: boolean;

  privacyLevel?: "LOW" | "MEDIUM" | "HIGH";
}
```

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

  geometry: Polygon | LineString;

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

  value?: number | string;

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

  parameters: Record<string, unknown>;

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
      "value": 120,
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

# 32. Most Important Invariant

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


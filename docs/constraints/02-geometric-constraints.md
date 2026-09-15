# Geometric Constraints for Agentic Floor-Plan Generation

## Purpose
Geometric constraints define the **physical shape, dimensions, coordinates, boundaries, orientation, openings, clearances, and spatial feasibility** of a floor plan.

These constraints should be validated by deterministic computational-geometry code rather than an LLM.

## 1. Site / Plot Boundary

The complete building layout must respect the plot boundary.

Examples:
- Every building polygon must be INSIDE plot boundary.
- No wall may extend outside the legal construction envelope.
- Setbacks must be preserved.

```text
constructionEnvelope = plot - requiredSetbacks
```

## 2. Room Area

Each room can have minimum, target, and maximum area.

Examples:
- Bedroom.area >= minimumArea
- Kitchen.area >= minimumArea
- LivingRoom.area >= minimumArea

All area values are in **mm²** (integer, derived from stored geometry).

Represent all three where useful:

```typescript
{
  minArea: 100000000,    // 100 m²
  targetArea: 140000000, // 140 m²
  maxArea: 200000000     // 200 m²
}
```

## 3. Width and Length

Minimum clear dimensions prevent unusable rooms.

Examples:
- Bedroom.width >= 10 ft
- Bathroom.width >= 5 ft
- Corridor.width >= requiredWidth

## 4. Aspect Ratio

Very narrow or excessively elongated rooms should be penalized or rejected.

```text
aspectRatio = max(width, length) / min(width, length)
```

Example:
- Bedroom aspectRatio <= 2.0

## 5. Non-Overlap

Rooms, stairs, shafts, furniture, and other physical objects must not overlap unless explicitly permitted.

For any two incompatible polygons A and B:

```text
intersectionArea(A, B) == 0
```

## 6. Wall Continuity

Walls should form valid closed or intentionally open boundaries.

Check for:
- dangling walls
- unintended gaps
- overlapping walls
- invalid intersections
- zero-length segments

## 7. Doors

Doors must:
- lie on a valid wall segment
- have valid width
- connect the intended two spaces
- have a feasible swing or sliding region
- not collide with walls/furniture
- not block required circulation

Example:

```text
Door ∈ Wall
Door connects RoomA ↔ RoomB
DoorClearance ∩ Obstacle == ∅
```

## 8. Windows

Windows should:
- lie on an exterior or permitted wall
- have valid width
- respect structural/wall constraints
- provide adequate external exposure where required

For daylight-oriented planning:

```text
habitableRoom.exteriorWallLength > minimum
```

## 9. Circulation Clearance

Corridors and movement paths must maintain minimum clear width.

Also check:
- door approach clearance
- staircase approach
- turning radius where applicable
- furniture clearance

## 10. Staircase Geometry

A staircase is a high-risk geometric component.

Validate:
- total rise
- tread depth
- riser height
- stair width
- landing dimensions
- headroom
- floor-to-floor connection
- opening in slab
- clearance from adjacent objects

Exact values must come from the applicable building code.

## 11. Furniture Feasibility

A room can satisfy area requirements and still be unusable.

Furniture-aware validation should check:

```text
room
 ├── bed
 ├── wardrobe
 ├── desk
 └── circulation path
```

Requirements:
- furniture does not overlap
- doors can open
- windows remain usable
- minimum movement clearance is maintained

## 12. Orientation

Some requirements depend on cardinal direction.

Examples:
- LivingRoom preferred on North/East side
- Kitchen preferred on a selected side
- Balcony faces garden
- Windows should maximize preferred exposure

Treat orientation preferences as weighted constraints unless a regulation makes them mandatory.

## 13. Alignment

Useful geometric relationships include:

- walls aligned with structural grid
- bathrooms vertically aligned
- plumbing shafts aligned
- columns aligned across floors
- doors aligned where desired

## 14. Orthogonality / Grid

Most conventional residential layouts benefit from orthogonal geometry.

Possible constraints:

```text
wall.angle ∈ {0°, 90°, 180°, 270°}
```

Non-orthogonal geometry can be permitted as an optimization variable.

## 15. Setbacks

Represent setbacks explicitly:

```typescript
interface SetbackConstraint {
  side: "front" | "rear" | "left" | "right";
  minimum: number;
}
```

The validator should compute actual setback distances from geometry rather than trusting metadata.

## 16. Structural Feasibility

The architectural geometry should be checked against structural constraints.

Potential checks:
- column locations
- beam spans
- load-bearing walls
- slab openings
- staircase opening
- column continuity across floors

Architectural generation should not claim structural safety without structural-engineering validation.

## 17. Plumbing / MEP Geometry

Check:
- wet-area clustering
- shaft accessibility
- pipe-routing distance
- drainage slope feasibility
- vertical alignment
- equipment clearance

## 18. Geometric Constraint Schema

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
  id: string;
  type: GeometricConstraintType;
  entities: string[];
  value?: number | string;
  hard: boolean;
  weight?: number;
  rationale?: string;
}
```

## 19. Validation Strategy

Separate constraints into:

### Hard geometric constraints
Violation means the candidate plan is invalid.

Examples:
- room outside envelope
- room overlap
- insufficient minimum width
- inaccessible room
- door not connected to wall

### Soft geometric constraints
Violation reduces the score.

Examples:
- slightly suboptimal aspect ratio
- longer-than-ideal plumbing route
- non-ideal orientation
- excess corridor area

## 20. Important Principle

Never use rendered pixels as the canonical representation.

Maintain:

`FloorPlan DSL → Geometry Model → Renderer`

The geometry model should be authoritative. SVG, PNG, DXF, or BIM should be generated from it.

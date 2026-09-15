# Topological Constraints for Agentic Floor-Plan Generation

## Purpose
Topological constraints define **how spaces relate to one another** without primarily specifying their exact dimensions or coordinates. They describe connectivity, adjacency, separation, containment, ordering, access, privacy, and circulation relationships.

The floor-plan system should represent these as a graph over spaces, openings, circulation zones, and service zones.

## 1. Adjacency

### Must be adjacent
Two spaces share a meaningful boundary or direct spatial relationship.

Examples:
- Kitchen ADJACENT_TO Dining
- MasterBedroom ADJACENT_TO MasterBathroom
- LivingRoom ADJACENT_TO Dining

### Must not be adjacent
Useful for privacy, acoustics, hygiene, or zoning.

Examples:
- MasterBedroom NOT_ADJACENT_TO Entrance
- Toilet NOT_ADJACENT_TO Dining
- Bedroom NOT_ADJACENT_TO Staircase (when acoustic privacy is required)

## 2. Connectivity / Accessibility

Every required room should be reachable through the circulation graph.

Examples:
- Entrance CONNECTS_TO LivingRoom
- Corridor CONNECTS_TO Bedroom
- Bedroom CONNECTS_TO Bathroom

A room that exists geometrically but has no valid access path is invalid.

### Graph invariant
For every required room `R`:
`reachable(Entrance, R) == true`

## 3. Direct Access

Some relationships require direct doorway-level access rather than merely being reachable through another room.

Examples:
- Kitchen DIRECTLY_ACCESSES Dining
- MasterBedroom DIRECTLY_ACCESSES MasterBathroom
- Garage DIRECTLY_ACCESSES HouseEntry

## 4. Separation

Spaces can be required to belong to different functional zones.

Examples:
- PublicZone SEPARATED_FROM PrivateZone
- ServiceZone SEPARATED_FROM FormalLiving
- BedroomCluster SEPARATED_FROM Entrance

Separation can be implemented as a graph-distance or boundary constraint.

## 5. Privacy Ordering

Privacy can be modeled as a progression through zones:

`Street → Entrance → Public → Semi-Private → Private`

Examples:
- MasterBedroom should have greater graph distance from Entrance than LivingRoom.
- BedroomCluster should not require passing through DiningRoom.
- Private rooms should not be exposed directly to the main entrance.

## 6. Circulation

Circulation should form a connected graph and avoid unnecessary traversal through rooms.

Examples:
- Entrance → Living → Corridor → Bedrooms
- Entrance → Parking → Utility
- Kitchen → Dining should preferably have a short path.

### Forbidden circulation
A required route should not pass through a private room.

Example:
`Entrance → MasterBedroom → Bathroom` is invalid if MasterBedroom is being used as a passage.

## 7. Containment / Zone Membership

Spaces belong to larger zones.

Examples:
- Bedroom CONTAINED_IN PrivateZone
- Kitchen CONTAINED_IN ServiceZone
- LivingRoom CONTAINED_IN PublicZone
- Bathroom CONTAINED_IN ServiceZone

Zones can themselves be nested.

## 8. Ordering

Useful when rooms need a functional sequence.

Examples:
- Entrance BEFORE LivingRoom
- LivingRoom BEFORE PrivateBedroomZone
- Kitchen NEAR Dining in the functional sequence

Ordering does not necessarily mean physical left-to-right ordering.

## 9. Service Relationships

Rooms requiring shared infrastructure should have topological relationships.

Examples:
- Kitchen NEAR Utility
- Bathrooms CLUSTERED_WITH PlumbingShaft
- Bathroom ABOVE Bathroom (between floors)
- Kitchen ALIGNED_WITH Kitchen (between floors)

These relationships reduce service-routing complexity.

## 10. Vertical Relationships

For multi-floor buildings:

- Staircase CONNECTS Floor1 TO Floor2
- BedroomFloor2 ACCESSIBLE_FROM Staircase
- BathroomFloor2 ALIGNED_WITH BathroomFloor1
- PlumbingShaft CONNECTS vertically across floors

## 11. Emergency / Egress Relationships

Depending on applicable regulations:

- Every habitable floor must have a valid egress path.
- Required rooms must be connected to an acceptable exit route.
- Escape routes must not depend on passing through prohibited spaces.

## 12. Recommended Constraint Schema

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
  id: string;
  source: string;
  relation: TopologicalRelation;
  target: string;
  hard: boolean;
  weight?: number;
  rationale?: string;
}
```

## 13. Important Principle

Topology should be solved **before or alongside geometric realization**.

A good architecture is:

`Requirements → Room Graph → Topological Validation → Geometric Layout → Geometric Validation`

The LLM can infer semantic relationships, but graph validation should be deterministic.

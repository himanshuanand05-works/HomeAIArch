# Optimization Objectives for Agentic Floor-Plan Generation

## Purpose
Optimization objectives determine which valid floor plan is **better** when multiple feasible layouts satisfy the hard constraints.

The system should distinguish between:

1. Hard constraints — must be satisfied.
2. Soft constraints — preferences that can be violated with a penalty.
3. Optimization objectives — metrics to maximize or minimize.

## 1. Feasibility First

The primary optimization rule is:

```text
Any solution violating a hard constraint is invalid.
```

Do not allow a high aesthetic score to compensate for a regulatory or geometric violation.

A useful hierarchy is:

```text
Hard validity
    ↓
Safety / code compliance
    ↓
Functional quality
    ↓
Spatial efficiency
    ↓
Comfort
    ↓
Aesthetics
```

## 2. Area Efficiency

Maximize useful area relative to total constructed area.

```text
usableAreaRatio = usableArea / totalBuiltArea
```

Minimize:
- oversized circulation
- unusable corners
- excessive wall thickness impact
- dead spaces

## 3. Circulation Efficiency

Minimize unnecessary walking distance.

Examples:
- Entrance → Living
- Kitchen → Dining
- Bedrooms → Bathrooms
- Parking → Entry

Possible metric:

```text
circulationEfficiency =
    usefulArea / circulationArea
```

Also minimize graph path lengths between frequently interacting spaces.

## 4. Adjacency Satisfaction

Maximize satisfaction of preferred relationships.

Example:

```text
score =
  w1 * kitchenDiningAdjacency
+ w2 * masterBathroomAdjacency
+ w3 * livingGardenRelationship
```

Hard adjacency should be handled as a constraint, not merely a score.

## 5. Privacy

Maximize separation between public and private spaces.

Possible metrics:
- graph distance from entrance to bedrooms
- number of exposed bedroom doors
- number of private rooms visible from entrance
- avoidance of circulation through bedrooms

Example:

```text
privacyScore =
    weightedDistance(privateRooms, entrance)
```

## 6. Daylight

Maximize access to exterior-facing walls/windows for habitable spaces.

Possible inputs:
- exterior wall length
- window area
- orientation
- obstruction
- estimated solar exposure

A physics-based daylight model is preferable for high-confidence evaluation.

## 7. Natural Ventilation

Maximize potential airflow.

Useful indicators:
- number of exterior openings
- opposing openings
- cross-ventilation paths
- room depth relative to openings

For high-confidence engineering decisions, use a dedicated environmental simulation rather than an LLM judgment.

## 8. Plumbing Efficiency

Minimize wet-area service-routing complexity.

Examples:
- bathrooms close to shafts
- kitchens close to wet stacks
- bathrooms stacked vertically
- short drainage routes

Possible metric:

```text
plumbingCost =
  Σ pipeRouteLength
+ verticalOffsetPenalty
+ shaftCountPenalty
```

## 9. Structural Efficiency

Prefer layouts compatible with simple structural grids.

Minimize:
- unusual column locations
- large transfer beams
- excessive spans
- discontinuous columns
- irregular structural geometry

The final structural assessment belongs to a structural-analysis workflow.

## 10. Construction Cost

Approximate construction cost using measurable geometric quantities.

Possible components:

```text
cost =
    wallLength * wallRate
  + floorArea * floorRate
  + windowArea * windowRate
  + doorCount * doorRate
  + plumbingLength * plumbingRate
  + structuralComplexityPenalty
```

Use a regional cost model if cost estimation is part of the product.

## 11. Compactness

A compact plan often reduces:
- external wall length
- construction cost
- heat gain/loss
- circulation

Possible metric:

```text
compactness =
    4π * area / perimeter²
```

Higher values generally indicate more compact geometry.

## 12. Furniture Usability

Maximize the percentage of room area that remains usable after furniture placement.

Example:

```text
furnitureUsability =
    freeCirculationArea / roomArea
```

Penalize:
- blocked wardrobes
- inaccessible beds
- door collisions
- unusable corners
- blocked windows

## 13. Accessibility

Where applicable, optimize:
- continuous accessible routes
- turning areas
- door clearances
- bathroom accessibility
- vertical accessibility

Exact requirements should be sourced from the applicable accessibility standard.

## 14. Future Flexibility

A strong residential layout may support future modification.

Examples:
- provision for future bedroom
- easy conversion of study → bedroom
- service shaft access
- structural grid suitable for partitions
- future floor expansion

## 15. Aesthetic / Spatial Quality

Aesthetic objectives can include:
- visual symmetry
- balanced massing
- consistent room proportions
- sight-line quality
- hierarchy of spaces
- alignment of doors/windows
- coherent public-to-private progression

LLMs can provide useful qualitative critique, but measurable metrics should remain deterministic where possible.

## 16. Multi-Objective Scoring

One practical approach:

```text
TotalScore =
    w_area       * AreaEfficiency
  + w_circulation * CirculationEfficiency
  + w_privacy     * PrivacyScore
  + w_daylight    * DaylightScore
  + w_ventilation * VentilationScore
  + w_plumbing    * PlumbingEfficiency
  + w_structure   * StructuralEfficiency
  + w_cost        * CostEfficiency
  + w_furniture   * FurnitureUsability
  + w_aesthetic   * AestheticScore
```

Before calculating this score:

```text
if hardConstraintViolations > 0:
    candidate = INVALID
```

## 17. Pareto Optimization

A single weighted score can hide trade-offs.

For example:

```text
Plan A:
  cheaper
  less daylight

Plan B:
  better daylight
  more expensive

Plan C:
  best circulation
  slightly less privacy
```

Instead of forcing everything into one number, maintain a Pareto frontier.

A plan is Pareto-optimal if no objective can improve without worsening at least one other objective.

This is particularly useful for presenting several alternatives to the user.

## 18. Candidate Generation + Optimization

A robust architecture is:

```text
Requirement Graph
      ↓
Generate candidates
      ↓
Hard Constraint Filter
      ↓
Feasible candidates
      ↓
Multi-objective optimizer
      ↓
Pareto frontier
      ↓
AI Critic / User preference model
      ↓
Final candidate
```

Potential solver families:
- Constraint Programming / CP-SAT
- Mixed Integer Linear Programming
- Genetic Algorithms
- Simulated Annealing
- Evolutionary Multi-Objective Optimization
- Reinforcement Learning
- Custom spatial search

The appropriate solver depends heavily on how the floor plan is parameterized.

## 19. User Preference as Dynamic Weighting

User feedback should modify preferences rather than rewrite the entire plan.

Example:

User:
> "I don't care about a large living room. Give me bigger bedrooms."

Update:

```text
w_livingArea ↓
w_bedroomArea ↑
```

Then re-run optimization against the same constraint model.

## 20. Important Principle

Optimization should never directly mutate arbitrary geometry.

Use:

```text
Optimizer
    ↓
Layout parameters
    ↓
Geometry generator
    ↓
Validator
    ↓
Score
```

rather than:

```text
Optimizer
    ↓
randomly modify walls
```

This preserves invariants and makes the system reproducible and debuggable.

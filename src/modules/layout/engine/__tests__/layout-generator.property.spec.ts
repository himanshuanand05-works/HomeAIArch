import fc from 'fast-check';
import { UnsolvableLayoutError } from '../../../../common/errors/domain-errors';
import { AlgorithmicLayoutGenerator } from '../algorithmic/algorithmic-layout-generator';
import { rectsOverlap, areaOf } from '../model';
import { GenerationRequest } from '../generation-request';
import { sampleRequest } from './fixtures';

const generator = new AlgorithmicLayoutGenerator({ maxRetries: 2, timeoutMs: 2000 });

const plausibleRequest = fc
  .record({
    widthM: fc.integer({ min: 9, max: 25 }),
    depthM: fc.integer({ min: 9, max: 25 }),
    openSides: fc.integer({ min: 2, max: 4 }),
    floors: fc.constantFrom(1, 2),
    seed: fc.integer({ min: 1, max: 10000 }),
    parking: fc.constantFrom(false, true),
  })
  .map((r) =>
    sampleRequest({
      plot: { widthM: r.widthM, depthM: r.depthM },
      openSides: r.openSides,
      floors: r.floors,
      seed: r.seed,
      mandatory: {
        attachedBathrooms: true,
        indoorParking: { required: r.parking, cars: r.parking ? 1 : 0 },
      },
    }),
  );

describe('generation invariants (property-based)', () => {
  it('never returns a half-valid layout', () => {
    fc.assert(
      fc.property(plausibleRequest, (request: GenerationRequest) => {
        try {
          const result = generator.generate(request);
          for (const floor of result.layout.floors) {
            for (const room of floor.rooms) {
              expect(room.areaM2).toBeGreaterThan(0);
              expect(room.x).toBeGreaterThanOrEqual(0);
              expect(room.y).toBeGreaterThanOrEqual(0);
            }
          }
          for (let i = 0; i < result.layout.floors.length; i += 1) {
            const rooms = result.layout.floors[i].rooms;
            for (let a = 0; a < rooms.length; a += 1) {
              for (let b = a + 1; b < rooms.length; b += 1) {
                expect(rectsOverlap(rooms[a], rooms[b])).toBe(false);
              }
            }
          }
        } catch (error) {
          expect(error).toBeInstanceOf(UnsolvableLayoutError);
        }
      }),
      { numRuns: 75 },
    );
  });

  it('is deterministic: same inputs and seed => identical layout', () => {
    fc.assert(
      fc.property(plausibleRequest, (request: GenerationRequest) => {
        try {
          const a = generator.generate(request).layout;
          const b = generator.generate(request).layout;
          expect(a).toEqual(b);
        } catch (error) {
          expect(error).toBeInstanceOf(UnsolvableLayoutError);
        }
      }),
      { numRuns: 30 },
    );
  });

  it('keeps every room inside the plot boundary', () => {
    fc.assert(
      fc.property(plausibleRequest, (request: GenerationRequest) => {
        try {
          const { layout } = generator.generate(request);
          const width = layout.plot.width;
          const depth = layout.plot.depth;
          for (const floor of layout.floors) {
            for (const room of floor.rooms) {
              expect(room.x).toBeGreaterThanOrEqual(0);
              expect(room.y).toBeGreaterThanOrEqual(0);
              expect(room.x + room.width).toBeLessThanOrEqual(width + 1e-6);
              expect(room.y + room.depth).toBeLessThanOrEqual(depth + 1e-6);
              expect(areaOf(room)).toBeGreaterThanOrEqual(0.5);
            }
          }
        } catch (error) {
          expect(error).toBeInstanceOf(UnsolvableLayoutError);
        }
      }),
      { numRuns: 75 },
    );
  });
});

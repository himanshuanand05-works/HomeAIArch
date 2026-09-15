import { AlgorithmicLayoutGenerator } from '../algorithmic/algorithmic-layout-generator';
import { UnsolvableLayoutError } from '../../../../common/errors/domain-errors';
import { sampleRequest } from './fixtures';

const generator = new AlgorithmicLayoutGenerator({ maxRetries: 3, timeoutMs: 4000 });

describe('AlgorithmicLayoutGenerator', () => {
  it('produces a valid, scorable layout in integer mm with dual geometry', () => {
    const result = generator.generate(sampleRequest());
    expect(result.layout.floors.length).toBe(2);
    expect(result.layout.unit).toBe('mm');
    expect(result.layout.metrics.score).toBeGreaterThan(0);
    expect(result.layout.connections.length).toBeGreaterThan(0);
    for (const floor of result.layout.floors) {
      expect(floor.rooms.length).toBeGreaterThan(0);
      for (const room of floor.rooms) {
        expect(room.roomId).toMatch(/^[a-z0-9_]+_f/);
        expect(room.areaMm2).toBeGreaterThan(0);
        expect(Number.isInteger(room.x)).toBe(true);
        expect(Number.isInteger(room.y)).toBe(true);
        expect(Number.isInteger(room.width)).toBe(true);
        expect(Number.isInteger(room.depth)).toBe(true);
        expect(room.externalGeometry).toBeDefined();
        expect(room.internalGeometry).toEqual({
          x: room.x,
          y: room.y,
          width: room.width,
          depth: room.depth,
        });
        expect(room.externalGeometry.width).toBeGreaterThanOrEqual(room.width);
        expect(room.externalGeometry.depth).toBeGreaterThanOrEqual(room.depth);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    const a = generator.generate(sampleRequest({ seed: 7 })).layout;
    const b = generator.generate(sampleRequest({ seed: 7 })).layout;
    expect(a).toEqual(b);
  });

  it('produces different layouts for different seeds', () => {
    const a = generator.generate(sampleRequest({ seed: 7 })).layout;
    const b = generator.generate(sampleRequest({ seed: 8 })).layout;
    expect(JSON.stringify(a.floors)).not.toBe(JSON.stringify(b.floors));
  });

  it('throws UnsolvableLayoutError with reasons for impossible inputs', () => {
    expect(() =>
      generator.generate(sampleRequest({ plot: { widthMm: 3000, depthMm: 3000 } })),
    ).toThrow(UnsolvableLayoutError);
    try {
      generator.generate(sampleRequest({ plot: { widthMm: 3000, depthMm: 3000 } }));
    } catch (error) {
      expect(error).toBeInstanceOf(UnsolvableLayoutError);
      const unsolvable = error as UnsolvableLayoutError;
      expect(Array.isArray(unsolvable.details)).toBe(true);
    }
  });

  it('applies add/remove change requests', () => {
    const base = sampleRequest({ seed: 11 });
    const baseResult = generator.generate(base).layout;
    const changed = generator.generate(
      sampleRequest({
        seed: 11,
        parent: baseResult,
        changeRequest: {
          addRooms: [
            {
              type: 'study',
              count: 1,
              minMm2: 6_000_000,
              idealMm2: 9_000_000,
              maxMm2: 14_000_000,
              minSideMm: 2400,
            },
          ],
        },
      }),
    ).layout;

    const hasStudy = changed.floors.some((floor) =>
      floor.rooms.some((room) => room.type === 'study'),
    );
    expect(hasStudy).toBe(true);

    const removed = generator.generate(
      sampleRequest({
        seed: 11,
        changeRequest: { removeTypes: ['dining'] },
      }),
    ).layout;
    const hasDining = removed.floors.some((floor) =>
      floor.rooms.some((room) => room.type === 'dining'),
    );
    expect(hasDining).toBe(false);
  });
});

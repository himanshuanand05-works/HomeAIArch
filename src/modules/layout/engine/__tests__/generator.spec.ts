import { AlgorithmicLayoutGenerator } from '../algorithmic/algorithmic-layout-generator';
import { UnsolvableLayoutError } from '../../../../common/errors/domain-errors';
import { sampleRequest } from './fixtures';

const generator = new AlgorithmicLayoutGenerator({ maxRetries: 3, timeoutMs: 4000 });

describe('AlgorithmicLayoutGenerator', () => {
  it('produces a valid, scorable layout', () => {
    const result = generator.generate(sampleRequest());
    expect(result.layout.floors.length).toBe(2);
    expect(result.layout.metrics.score).toBeGreaterThan(0);
    expect(result.layout.connections.length).toBeGreaterThan(0);
    for (const floor of result.layout.floors) {
      expect(floor.rooms.length).toBeGreaterThan(0);
      for (const room of floor.rooms) {
        expect(room.roomId).toMatch(/^[a-z0-9_]+_f/);
        expect(room.areaM2).toBeGreaterThan(0);
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
    expect(() => generator.generate(sampleRequest({ plot: { widthM: 3, depthM: 3 } }))).toThrow(
      UnsolvableLayoutError,
    );
    try {
      generator.generate(sampleRequest({ plot: { widthM: 3, depthM: 3 } }));
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
          addRooms: [{ type: 'study', count: 1, minM2: 6, idealM2: 9, maxM2: 14 }],
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

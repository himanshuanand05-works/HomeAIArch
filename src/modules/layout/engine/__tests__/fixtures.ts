import { GenerationRequest } from '../generation-request';

export function sampleRequest(overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    plot: { widthMm: 12000, depthMm: 18000 },
    openSides: 3,
    wallThicknessMm: 229,
    circulationRatio: 0.08,
    doorWidthMm: 900,
    staircase: { widthMm: 1000, depthMm: 2500 },
    floors: 2,
    rooms: [
      {
        type: 'living',
        count: 1,
        minMm2: 12_000_000,
        idealMm2: 18_000_000,
        maxMm2: 30_000_000,
        minSideMm: 3000,
      },
      {
        type: 'dining',
        count: 1,
        minMm2: 9_000_000,
        idealMm2: 12_000_000,
        maxMm2: 18_000_000,
        minSideMm: 2400,
      },
      {
        type: 'kitchen',
        count: 1,
        minMm2: 7_000_000,
        idealMm2: 10_000_000,
        maxMm2: 16_000_000,
        minSideMm: 2100,
      },
      {
        type: 'bed1',
        count: 1,
        minMm2: 13_400_000,
        idealMm2: 18_000_000,
        maxMm2: 30_000_000,
        minSideMm: 3300,
      },
      {
        type: 'bed2',
        count: 1,
        minMm2: 10_000_000,
        idealMm2: 14_000_000,
        maxMm2: 22_000_000,
        minSideMm: 3000,
      },
    ],
    kitchen: { minMm2: 7_000_000, idealMm2: 10_000_000, maxMm2: 16_000_000, counterMinMm: 3050 },
    bathConnectivity: { ensuite: true, commonBaths: 1, wcPerFloor: 1 },
    mandatory: {
      attachedBathrooms: true,
      indoorParking: { required: false, cars: 0 },
    },
    maxCoverage: null,
    seed: 42,
    ...overrides,
  };
}

export function sampleRequestSingleStorey(
  overrides: Partial<GenerationRequest> = {},
): GenerationRequest {
  return sampleRequest({
    floors: 1,
    rooms: [
      {
        type: 'living',
        count: 1,
        minMm2: 12_000_000,
        idealMm2: 18_000_000,
        maxMm2: 30_000_000,
        minSideMm: 3000,
      },
      {
        type: 'kitchen',
        count: 1,
        minMm2: 7_000_000,
        idealMm2: 10_000_000,
        maxMm2: 16_000_000,
        minSideMm: 2100,
      },
      {
        type: 'bed1',
        count: 1,
        minMm2: 13_400_000,
        idealMm2: 18_000_000,
        maxMm2: 30_000_000,
        minSideMm: 3300,
      },
      {
        type: 'bed2',
        count: 2,
        minMm2: 10_000_000,
        idealMm2: 12_000_000,
        maxMm2: 20_000_000,
        minSideMm: 3000,
      },
    ],
    ...overrides,
  });
}

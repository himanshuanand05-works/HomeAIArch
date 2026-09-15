import { GenerationRequest } from '../generation-request';

export function sampleRequest(overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return {
    plot: { widthM: 12, depthM: 18 },
    openSides: 3,
    wallThicknessM: 0.2286,
    circulationRatio: 0.08,
    doorWidthM: 0.9,
    staircase: { widthM: 1.0, depthM: 2.5 },
    floors: 2,
    rooms: [
      { type: 'living', count: 1, minM2: 12, idealM2: 18, maxM2: 30 },
      { type: 'dining', count: 1, minM2: 9, idealM2: 12, maxM2: 18 },
      { type: 'kitchen', count: 1, minM2: 7, idealM2: 10, maxM2: 16 },
      { type: 'bed1', count: 1, minM2: 13.4, idealM2: 18, maxM2: 30 },
      { type: 'bed2', count: 1, minM2: 10, idealM2: 14, maxM2: 22 },
    ],
    kitchen: { minM2: 7, idealM2: 10, maxM2: 16, counterMinM: 3.05 },
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
      { type: 'living', count: 1, minM2: 12, idealM2: 18, maxM2: 30 },
      { type: 'kitchen', count: 1, minM2: 7, idealM2: 10, maxM2: 16 },
      { type: 'bed1', count: 1, minM2: 13.4, idealM2: 18, maxM2: 30 },
      { type: 'bed2', count: 2, minM2: 10, idealM2: 12, maxM2: 20 },
    ],
    ...overrides,
  });
}

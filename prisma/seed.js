/**
 * Seeds the regional DesignTemplates (ADR-0002). Idempotent.
 * Standards: 9" brick wall, master >= 12x12 ft, kitchen counter >= 10 ft.
 * ADR-0005: all lengths stored as integer mm; area bounds remain m² (user-facing).
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const INCH_MM = 25.4;
const FOOT_MM = 304.8;
const FOOT = 0.3048;

const toMm = (value) => Math.round(value * 1000);

const standardIndia = {
  slug: 'standard-india',
  name: 'Standard (India norms)',
  region: 'IN',
  wallThicknessMm: Math.round(9 * INCH_MM),
  wallNote: '9" brick wall',
  circulationRatio: 0.08,
  doorWidthMm: 900,
  staircase: { widthMm: 1000, depthMm: 2500 },
  roomDefaults: {
    living: { minM2: 12, idealM2: 18, maxM2: 30, minSideMm: toMm(3.0) },
    dining: { minM2: 9, idealM2: 12, maxM2: 18, minSideMm: toMm(2.4) },
    kitchen: { minM2: 7, idealM2: 10, maxM2: 16, minSideMm: toMm(2.1) },
    bed1: {
      minM2: 12 * FOOT * 12 * FOOT,
      idealM2: 18,
      maxM2: 30,
      minSideMm: Math.round(12 * FOOT_MM),
    },
    bed2: { minM2: 10, idealM2: 14, maxM2: 22, minSideMm: toMm(3.0) },
    bed3: { minM2: 9, idealM2: 12, maxM2: 18, minSideMm: toMm(2.8) },
    bed4: { minM2: 8, idealM2: 10, maxM2: 15, minSideMm: toMm(2.4) },
    bath: { minM2: 2.4, idealM2: 3.6, maxM2: 6, minSideMm: toMm(1.5) },
    wc: { minM2: 1.2, idealM2: 1.8, maxM2: 3, minSideMm: toMm(1.0) },
    study: { minM2: 6, idealM2: 9, maxM2: 14, minSideMm: toMm(2.4) },
    store: { minM2: 3, idealM2: 4.5, maxM2: 8, minSideMm: toMm(1.5) },
    utility: { minM2: 4, idealM2: 6, maxM2: 10, minSideMm: toMm(2.0) },
    lobby: { minM2: 4, idealM2: 6, maxM2: 10, minSideMm: toMm(1.8) },
    parking: { minM2: 12.5, idealM2: 16, maxM2: 25, minSideMm: toMm(2.4) },
  },
  kitchenDefaults: {
    minM2: 7,
    idealM2: 10,
    maxM2: 16,
    minSideMm: toMm(2.1),
    counterMinMm: Math.round(10 * FOOT_MM),
  },
  bathDefaults: {
    ensuite: { minM2: 2.4, idealM2: 3.6, maxM2: 5, minSideMm: toMm(1.5) },
    common: { minM2: 2.4, idealM2: 3.6, maxM2: 6, minSideMm: toMm(1.5) },
    wc: { minM2: 1.2, idealM2: 1.5, maxM2: 2.4, minSideMm: toMm(1.0) },
  },
  mandatoryDefaults: {
    attachedBathrooms: true,
    indoorParking: { required: false, cars: 0 },
    outdoorParking: { required: false, cars: 0 },
  },
};

const southIndia = {
  slug: 'south-india-compact',
  name: 'South India compact',
  region: 'IN-South',
  wallThicknessMm: Math.round(4.5 * INCH_MM),
  wallNote: '4.5" brick wall',
  circulationRatio: 0.1,
  doorWidthMm: 900,
  staircase: { widthMm: 900, depthMm: 2400 },
  roomDefaults: {
    living: { minM2: 10, idealM2: 14, maxM2: 24, minSideMm: toMm(2.7) },
    dining: { minM2: 7.5, idealM2: 10, maxM2: 16, minSideMm: toMm(2.1) },
    kitchen: { minM2: 5.5, idealM2: 8, maxM2: 13, minSideMm: toMm(1.8) },
    bed1: { minM2: 11.2, idealM2: 15, maxM2: 25, minSideMm: toMm(3.0) },
    bed2: { minM2: 9, idealM2: 12, maxM2: 19, minSideMm: toMm(2.7) },
    bed3: { minM2: 8, idealM2: 10, maxM2: 16, minSideMm: toMm(2.4) },
    bed4: { minM2: 7, idealM2: 9, maxM2: 13, minSideMm: toMm(2.4) },
    bath: { minM2: 2.2, idealM2: 3.2, maxM2: 5, minSideMm: toMm(1.4) },
    wc: { minM2: 1.1, idealM2: 1.6, maxM2: 2.6, minSideMm: toMm(1.0) },
    study: { minM2: 5, idealM2: 8, maxM2: 12, minSideMm: toMm(2.1) },
    store: { minM2: 2.6, idealM2: 4, maxM2: 7, minSideMm: toMm(1.4) },
    utility: { minM2: 3.5, idealM2: 5, maxM2: 9, minSideMm: toMm(1.8) },
    lobby: { minM2: 3.5, idealM2: 5, maxM2: 8, minSideMm: toMm(1.7) },
    parking: { minM2: 11.5, idealM2: 14, maxM2: 22, minSideMm: toMm(2.3) },
  },
  kitchenDefaults: {
    minM2: 5.5,
    idealM2: 8,
    maxM2: 13,
    minSideMm: toMm(1.8),
    counterMinMm: Math.round(8 * FOOT_MM),
  },
  bathDefaults: {
    ensuite: { minM2: 2.2, idealM2: 3.2, maxM2: 4.5, minSideMm: toMm(1.4) },
    common: { minM2: 2.2, idealM2: 3.2, maxM2: 5.5, minSideMm: toMm(1.4) },
    wc: { minM2: 1.1, idealM2: 1.4, maxM2: 2.2, minSideMm: toMm(1.0) },
  },
  mandatoryDefaults: {
    attachedBathrooms: true,
    indoorParking: { required: false, cars: 0 },
    outdoorParking: { required: false, cars: 0 },
  },
};

async function upsertTemplate(t) {
  const existing = await prisma.designTemplate.findUnique({ where: { slug: t.slug } });
  if (existing) {
    return prisma.designTemplate.update({
      where: { slug: t.slug },
      data: {
        name: t.name,
        region: t.region,
        version: existing.version + 1,
        isActive: true,
        wallThicknessMm: t.wallThicknessMm,
        wallNote: t.wallNote,
        circulationRatio: t.circulationRatio,
        doorWidthMm: t.doorWidthMm,
        staircase: t.staircase,
        roomDefaults: t.roomDefaults,
        kitchenDefaults: t.kitchenDefaults,
        bathDefaults: t.bathDefaults,
        mandatoryDefaults: t.mandatoryDefaults,
      },
    });
  }
  return prisma.designTemplate.create({ data: { slug: t.slug, ...t } });
}

async function main() {
  const a = await upsertTemplate(standardIndia);
  const b = await upsertTemplate(southIndia);
  console.log(`seeded templates: ${a.slug} (v${a.version}), ${b.slug} (v${b.version})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

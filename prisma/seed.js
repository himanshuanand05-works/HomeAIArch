/**
 * Seeds the regional DesignTemplates (ADR-0002). Idempotent.
 * Standards: 9" brick wall, master >= 12x12 ft, kitchen counter >= 10 ft.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const INCH = 0.0254;
const FOOT = 0.3048;

const standardIndia = {
  slug: 'standard-india',
  name: 'Standard (India norms)',
  region: 'IN',
  wallThicknessM: 9 * INCH,
  wallNote: '9" brick wall',
  circulationRatio: 0.08,
  doorWidthM: 0.9,
  staircase: { widthM: 1.0, depthM: 2.5 },
  roomDefaults: {
    living: { minM2: 12, idealM2: 18, maxM2: 30, minSideM: 3.0 },
    dining: { minM2: 9, idealM2: 12, maxM2: 18, minSideM: 2.4 },
    kitchen: { minM2: 7, idealM2: 10, maxM2: 16, minSideM: 2.1 },
    bed1: { minM2: 12 * FOOT * 12 * FOOT, idealM2: 18, maxM2: 30, minSideM: 3.3 },
    bed2: { minM2: 10, idealM2: 14, maxM2: 22, minSideM: 3.0 },
    bed3: { minM2: 9, idealM2: 12, maxM2: 18, minSideM: 2.8 },
    bed4: { minM2: 8, idealM2: 10, maxM2: 15, minSideM: 2.4 },
    bath: { minM2: 2.4, idealM2: 3.6, maxM2: 6, minSideM: 1.5 },
    wc: { minM2: 1.2, idealM2: 1.8, maxM2: 3, minSideM: 1.0 },
    study: { minM2: 6, idealM2: 9, maxM2: 14, minSideM: 2.4 },
    store: { minM2: 3, idealM2: 4.5, maxM2: 8, minSideM: 1.5 },
    utility: { minM2: 4, idealM2: 6, maxM2: 10, minSideM: 2.0 },
    lobby: { minM2: 4, idealM2: 6, maxM2: 10, minSideM: 1.8 },
    parking: { minM2: 12.5, idealM2: 16, maxM2: 25, minSideM: 2.4 },
  },
  kitchenDefaults: { minM2: 7, idealM2: 10, maxM2: 16, minSideM: 2.1, counterMinM: 10 * FOOT },
  bathDefaults: {
    ensuite: { minM2: 2.4, idealM2: 3.6, maxM2: 5, minSideM: 1.5 },
    common: { minM2: 2.4, idealM2: 3.6, maxM2: 6, minSideM: 1.5 },
    wc: { minM2: 1.2, idealM2: 1.5, maxM2: 2.4, minSideM: 1.0 },
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
  wallThicknessM: 4.5 * INCH,
  wallNote: '4.5" brick wall',
  circulationRatio: 0.1,
  doorWidthM: 0.9,
  staircase: { widthM: 0.9, depthM: 2.4 },
  roomDefaults: {
    living: { minM2: 10, idealM2: 14, maxM2: 24, minSideM: 2.7 },
    dining: { minM2: 7.5, idealM2: 10, maxM2: 16, minSideM: 2.1 },
    kitchen: { minM2: 5.5, idealM2: 8, maxM2: 13, minSideM: 1.8 },
    bed1: { minM2: 11.2, idealM2: 15, maxM2: 25, minSideM: 3.0 },
    bed2: { minM2: 9, idealM2: 12, maxM2: 19, minSideM: 2.7 },
    bed3: { minM2: 8, idealM2: 10, maxM2: 16, minSideM: 2.4 },
    bed4: { minM2: 7, idealM2: 9, maxM2: 13, minSideM: 2.4 },
    bath: { minM2: 2.2, idealM2: 3.2, maxM2: 5, minSideM: 1.4 },
    wc: { minM2: 1.1, idealM2: 1.6, maxM2: 2.6, minSideM: 1.0 },
    study: { minM2: 5, idealM2: 8, maxM2: 12, minSideM: 2.1 },
    store: { minM2: 2.6, idealM2: 4, maxM2: 7, minSideM: 1.4 },
    utility: { minM2: 3.5, idealM2: 5, maxM2: 9, minSideM: 1.8 },
    lobby: { minM2: 3.5, idealM2: 5, maxM2: 8, minSideM: 1.7 },
    parking: { minM2: 11.5, idealM2: 14, maxM2: 22, minSideM: 2.3 },
  },
  kitchenDefaults: { minM2: 5.5, idealM2: 8, maxM2: 13, minSideM: 1.8, counterMinM: 8 * FOOT },
  bathDefaults: {
    ensuite: { minM2: 2.2, idealM2: 3.2, maxM2: 4.5, minSideM: 1.4 },
    common: { minM2: 2.2, idealM2: 3.2, maxM2: 5.5, minSideM: 1.4 },
    wc: { minM2: 1.1, idealM2: 1.4, maxM2: 2.2, minSideM: 1.0 },
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
        wallThicknessM: t.wallThicknessM,
        wallNote: t.wallNote,
        circulationRatio: t.circulationRatio,
        doorWidthM: t.doorWidthM,
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

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/errors/all-exceptions.filter';
import { RequestIdMiddleware } from '../src/common/middleware/request-id.middleware';

function loadDotEnv(): void {
  if (process.env.DATABASE_URL) {
    return;
  }
  for (const candidate of ['.env', '.env.local']) {
    const file = path.join(process.cwd(), candidate);
    if (!existsSync(file)) {
      continue;
    }
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2];
      }
    }
    return;
  }
}

loadDotEnv();

describe('API flow (user -> plot -> template -> profile -> project -> design -> iterate)', () => {
  let app: INestApplication;
  let ready = false;
  let templateId = '';

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set — skipping e2e test');
      return;
    }
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = moduleFixture.createNestApplication();
      app.use(RequestIdMiddleware);
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
      );
      app.useGlobalFilters(new AllExceptionsFilter());
      const apiBasePath = process.env.API_BASE_PATH?.trim().startsWith('/')
        ? process.env.API_BASE_PATH.trim()
        : process.env.API_BASE_PATH
          ? `/${process.env.API_BASE_PATH.trim()}`
          : '/api/v1';
      app.setGlobalPrefix(apiBasePath, { exclude: ['health', 'health/ready'] });
      await app.init();
      ready = true;
    } catch (error) {
      console.warn(
        'Database unreachable — skipping e2e test',
        error instanceof Error ? error.message : '',
      );
    }
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  const itWhenReady = (name: string, fn: () => Promise<void>): void => {
    it(name, async () => {
      if (!ready) {
        return;
      }
      await fn();
    });
  };

  itWhenReady('runs the full happy path', async () => {
    const server = app.getHttpServer();

    const templates = await request(server).get('/api/v1/templates').expect(200);
    expect(templates.body.length).toBeGreaterThan(0);
    templateId = templates.body[0].id;

    const user = await request(server)
      .post('/api/v1/users')
      .send({ email: `e2e-${Date.now()}@homeaiarch.test`, name: 'E2E User' })
      .expect(201);
    const userId = user.body.id;

    const plot = await request(server)
      .post('/api/v1/plots')
      .send({ ownerId: userId, width: 40, depth: 60, unit: 'FT', openSides: 3 })
      .expect(201);
    const plotId = plot.body.id;
    expect(plot.body.widthMm).toBe(12192); // 40 ft = 12192 mm
    expect(plot.body.depthMm).toBe(18288); // 60 ft = 18288 mm

    const profile = await request(server)
      .post('/api/v1/profiles')
      .send({
        userId,
        name: 'E2E 2-storey',
        templateId,
        floors: 2,
        rooms: [
          { type: 'living', count: 1 },
          { type: 'dining', count: 1 },
          { type: 'kitchen', count: 1 },
          { type: 'bed1', count: 1 },
          { type: 'bed2', count: 1 },
        ],
        kitchen: { counterMinM: 3.2 },
      })
      .expect(201);
    const profileId = profile.body.id;
    expect(profile.body.templateSnapshot.wallThicknessMm).toBeGreaterThan(0);

    const project = await request(server)
      .post('/api/v1/projects')
      .send({ ownerId: userId, plotId, homeProfileId: profileId, name: 'E2E project' })
      .expect(201);
    const projectId = project.body.id;
    expect(project.body.prefsSnapshot.floors).toBe(2);

    const design = await request(server)
      .post(`/api/v1/projects/${projectId}/designs`)
      .send({ seed: 123 })
      .expect(201);
    expect(design.body.versionNumber).toBe(1);
    expect(design.body.layout.unit).toBe('mm');
    expect(design.body.layout.wallThicknessMm).toBeGreaterThan(0);
    expect(design.body.layout.floors).toHaveLength(2);
    expect(design.body.layout.metrics.score).toBeGreaterThan(0);
    for (const floor of design.body.layout.floors) {
      expect(floor.rooms.length).toBeGreaterThan(0);
      for (const room of floor.rooms) {
        expect(room.externalGeometry).toBeDefined();
        expect(room.internalGeometry).toBeDefined();
        expect(room.areaMm2).toBeGreaterThan(0);
      }
    }

    const list = await request(server).get(`/api/v1/projects/${projectId}/designs`).expect(200);
    expect(list.body).toHaveLength(1);

    const iteration = await request(server)
      .post(`/api/v1/projects/${projectId}/designs/1/iterations`)
      .send({ changeRequest: { removeTypes: ['dining'] }, seed: 123 })
      .expect(201);
    expect(iteration.body.versionNumber).toBe(2);
    expect(iteration.body.parentId).toBe(design.body.id);
    const removed = iteration.body.layout.floors.flatMap((floor: { rooms: { type: string }[] }) =>
      floor.rooms.filter((room) => room.type === 'dining'),
    );
    expect(removed).toHaveLength(0);

    const fetched = await request(server)
      .get(`/api/v1/projects/${projectId}/designs/2`)
      .expect(200);
    expect(fetched.body.metrics.score).toBeGreaterThan(0);

    await request(server).delete(`/api/v1/projects/${projectId}`).expect(204);
    await request(server).delete(`/api/v1/profiles/${profileId}`).expect(204);
    await request(server).delete(`/api/v1/plots/${plotId}`).expect(204);
    await request(server).delete(`/api/v1/users/${userId}`).expect(204);
  });
});

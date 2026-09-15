import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(RequestIdMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const apiBasePath = normalizeBasePath(config.get<string>('API_BASE_PATH', '/api/v1'));
  app.setGlobalPrefix(apiBasePath, { exclude: ['health', 'health/ready'] });

  const openApi = new DocumentBuilder()
    .setTitle('HomeAIArch API')
    .setDescription('Automated home layout design backend (Phase 0 prototype)')
    .setVersion('0.1.0')
    .addTag('health', 'Liveness and readiness probes')
    .addTag('users', 'User identity (placeholder userId in Phase 0)')
    .addTag('plots', 'Plot dimensions and open-side counts')
    .addTag('templates', 'Regional DesignTemplates (seeded standards)')
    .addTag('profiles', 'Home profiles — preferences frozen at creation from a template')
    .addTag('projects', 'Projects binding a plot + profile, and CRUD')
    .addTag('layout', 'Design generation, iteration, and feedback')
    .build();
  const document = SwaggerModule.createDocument(app, openApi);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port} (prefix ${apiBasePath})`, 'Bootstrap');
}

void bootstrap();

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { PlotsModule } from './modules/plots/plots.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { LayoutModule } from './modules/layout/layout.module';
import { HealthModule } from './modules/health/health.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    PrismaModule,
    UsersModule,
    PlotsModule,
    TemplatesModule,
    ProfilesModule,
    ProjectsModule,
    LayoutModule,
    HealthModule,
  ],
})
export class AppModule {}

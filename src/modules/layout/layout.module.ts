import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrefsModule } from '../prefs/prefs.module';
import { AlgorithmicLayoutGenerator } from './engine/algorithmic/algorithmic-layout-generator';
import { LAYOUT_GENERATOR } from './engine/layout-generator.port';
import { LayoutService } from './layout.service';
import { LayoutController } from './layout.controller';

@Module({
  imports: [PrefsModule],
  controllers: [LayoutController],
  providers: [
    LayoutService,
    {
      provide: LAYOUT_GENERATOR,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new AlgorithmicLayoutGenerator({
          maxRetries: config.get<number>('ENGINE_MAX_RETRIES', 3),
          timeoutMs: config.get<number>('ENGINE_TIMEOUT_MS', 4000),
        }),
    },
  ],
})
export class LayoutModule {}

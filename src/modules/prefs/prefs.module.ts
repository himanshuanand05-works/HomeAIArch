import { Module } from '@nestjs/common';
import { PrefsService } from './prefs.service';

@Module({
  providers: [PrefsService],
  exports: [PrefsService],
})
export class PrefsModule {}

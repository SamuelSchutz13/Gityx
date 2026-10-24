import { Controller, DynamicModule, Get, Module } from '@nestjs/common';
import { GitService } from './git/git.service';
import { ChangesController } from './changes/changes.controller';
import { ChangesService } from './changes/changes.service';
import { HistoryController } from './history/history.controller';
import { HistoryService } from './history/history.service';
import { LiveController } from './live/live.controller';
import { LiveService } from './live/live.service';

@Controller('api')
class HealthController {
  @Get('health')
  health() {
    return { ok: true };
  }
}

@Module({})
export class AppModule {
  static forRoot(root: string): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, ChangesController, HistoryController, LiveController],
      providers: [{ provide: GitService, useValue: new GitService(root) }, ChangesService, HistoryService, LiveService],
    };
  }
}

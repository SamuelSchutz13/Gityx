import { Controller, DynamicModule, Get, Module } from '@nestjs/common';
import { basename } from 'node:path';
import { GitService } from './git/git.service';
import { ChangesController } from './changes/changes.controller';
import { ChangesService } from './changes/changes.service';
import { HistoryController } from './history/history.controller';
import { HistoryService } from './history/history.service';
import { LiveController } from './live/live.controller';
import { LiveService } from './live/live.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService, LAST_TEST } from './dashboard/dashboard.service';
import { RunnerService } from './tests/runner.service';
import { TestsController } from './tests/tests.controller';
import { ExportController } from './export/export.controller';
import { StatsController } from './stats/stats.controller';
import { StatsService } from './stats/stats.service';

@Controller('api')
class HealthController {
  constructor(private readonly git: GitService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('info')
  info() {
    return { repo: basename(this.git.root) };
  }
}

@Module({})
export class AppModule {
  static forRoot(root: string): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, ChangesController, HistoryController, LiveController, DashboardController, TestsController, ExportController, StatsController],
      providers: [
        { provide: GitService, useValue: new GitService(root) },
        ChangesService,
        HistoryService,
        LiveService,
        DashboardService,
        RunnerService,
        StatsService,
        { provide: LAST_TEST, useFactory: (r: RunnerService) => () => r.lastSummary(), inject: [RunnerService] },
      ],
    };
  }
}

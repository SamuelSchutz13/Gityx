import { Controller, DynamicModule, Get, Module } from '@nestjs/common';
import { GitService } from './git/git.service';

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
      controllers: [HealthController],
      providers: [{ provide: GitService, useValue: new GitService(root) }],
    };
  }
}

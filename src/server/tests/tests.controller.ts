import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, MessageEvent, Post, Sse } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ConfigError } from './config';
import { AlreadyRunning, NeedsConfirmation, RunnerService, UnknownProject } from './runner.service';

@Controller('api/tests')
export class TestsController {
  constructor(private readonly runner: RunnerService) {}

  @Get('projects')
  projects() {
    try {
      return this.runner.projects();
    } catch (e) {
      if (e instanceof ConfigError) throw new BadRequestException(e.message);
      throw e;
    }
  }

  @Get('run')
  current() {
    return this.runner.current();
  }

  @Post('run')
  @HttpCode(202)
  start(@Body() body: { projects?: unknown; confirm?: unknown }) {
    const projects = body?.projects ?? 'all';
    if (projects !== 'all' && !(Array.isArray(projects) && projects.every((p) => typeof p === 'string'))) {
      throw new BadRequestException('projects deve ser "all" ou uma lista de nomes');
    }
    try {
      return this.runner.start(projects as string[] | 'all', body?.confirm === true);
    } catch (e) {
      if (e instanceof NeedsConfirmation) throw new ConflictException({ needsConfirmation: true });
      if (e instanceof AlreadyRunning) throw new ConflictException({ alreadyRunning: true });
      if (e instanceof UnknownProject) throw new BadRequestException(`Projeto desconhecido: ${e.message}`);
      if (e instanceof ConfigError) throw new BadRequestException(e.message);
      throw e;
    }
  }

  @Post('cancel')
  @HttpCode(204)
  cancel() {
    this.runner.cancel();
  }

  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.runner.run$.pipe(map((run) => ({ type: 'run', data: run })));
  }
}

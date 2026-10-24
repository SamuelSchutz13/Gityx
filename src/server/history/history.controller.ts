import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { BadPathError } from '../repo/paths';
import { CommitNotFoundError, HistoryService } from './history.service';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA = /^[0-9a-f]{4,40}$/;

function int(v: string | undefined, def: number, min: number, max: number, name: string): number {
  if (v === undefined || v === '') return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new BadRequestException(`${name} inválido`);
  return n;
}

function date(v: string | undefined, name: string): string | undefined {
  if (v === undefined || v === '') return undefined;
  if (!DATE.test(v)) throw new BadRequestException(`${name} deve ser AAAA-MM-DD`);
  return v;
}

@Controller('api')
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get('history')
  async page(@Query() q: Record<string, string | undefined>) {
    try {
      return await this.history.page({
        skip: int(q.skip, 0, 0, Number.MAX_SAFE_INTEGER, 'skip'),
        limit: int(q.limit, 200, 1, 500, 'limit'),
        author: q.author || undefined,
        path: q.path || undefined,
        since: date(q.since, 'since'),
        until: date(q.until, 'until'),
      });
    } catch (e) {
      if (e instanceof BadPathError) throw new BadRequestException(e.message);
      throw e;
    }
  }

  @Get('commits/:sha')
  async detail(@Param('sha') sha: string) {
    if (!SHA.test(sha)) throw new BadRequestException('SHA inválido');
    try {
      return await this.history.detail(sha);
    } catch (e) {
      if (e instanceof CommitNotFoundError) throw new NotFoundException('Commit não encontrado');
      throw e;
    }
  }
}

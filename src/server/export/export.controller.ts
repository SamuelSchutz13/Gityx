import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { basename } from 'node:path';
import { ChangesService } from '../changes/changes.service';
import { GitService } from '../git/git.service';
import { RunnerService } from '../tests/runner.service';
import { buildReport } from './sensitive';
import { renderHtml } from './render-html';
import { renderMarkdown } from './render-md';

const TYPES = { md: 'text/markdown', json: 'application/json', html: 'text/html' } as const;

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

@Controller('api/export')
export class ExportController {
  constructor(
    private readonly git: GitService,
    private readonly changes: ChangesService,
    private readonly runner: RunnerService,
  ) {}

  @Get()
  async export(@Query('format') format: string, @Query('includeSensitive') include: string, @Res() res: Response) {
    if (!(format in TYPES)) throw new BadRequestException('format deve ser md, json ou html');
    const fmt = format as keyof typeof TYPES;
    const [branch, head, files] = await Promise.all([
      this.git.tryRun(['symbolic-ref', '-q', '--short', 'HEAD']),
      this.git.tryRun(['rev-parse', '-q', '--short', '--verify', 'HEAD']),
      this.changes.list(),
    ]);
    const repo = basename(this.git.root);
    const report = buildReport({ repo, branch: branch?.trim() || null, head: head?.trim() || null }, files, this.runner.current(), include === '1');
    const body = fmt === 'md' ? renderMarkdown(report) : fmt === 'html' ? renderHtml(report) : JSON.stringify(report, null, 2);
    const safeRepo = repo.replace(/[^A-Za-z0-9._-]/g, '_');
    res.setHeader('Content-Type', `${TYPES[fmt]}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="gityx-${safeRepo}-${stamp(new Date())}.${fmt}"`);
    res.send(body);
  }
}

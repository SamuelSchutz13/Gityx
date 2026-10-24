import { Controller, Get } from '@nestjs/common';
import { ChangesService } from './changes.service';

@Controller('api/changes')
export class ChangesController {
  constructor(private readonly changes: ChangesService) {}

  @Get()
  list() {
    return this.changes.list();
  }
}

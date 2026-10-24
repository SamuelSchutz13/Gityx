import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { LiveService } from './live.service';

@Controller('api')
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.live.events$.pipe(map((e) => ({ type: e.type, data: {} })));
  }
}

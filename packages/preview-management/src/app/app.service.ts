import { Injectable } from '@nestjs/common';
import { PreviewPoolService } from './domain/services/pool.service';

@Injectable()
export class AppService {
  constructor(private poolService: PreviewPoolService) {}

  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}

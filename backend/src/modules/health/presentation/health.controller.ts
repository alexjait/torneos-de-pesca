import { Controller, Get } from '@nestjs/common';
import { HealthService } from '../application/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  live() {
    return this.healthService.getLiveStatus();
  }

  @Get('ready')
  ready() {
    return this.healthService.getReadyStatus();
  }
}

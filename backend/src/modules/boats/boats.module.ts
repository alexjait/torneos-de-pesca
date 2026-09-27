import { Module } from '@nestjs/common';
import { BoatsController } from './presentation/boats.controller';
import { BoatsService } from './application/boats.service';

@Module({
  controllers: [BoatsController],
  providers: [BoatsService],
})
export class BoatsModule {}

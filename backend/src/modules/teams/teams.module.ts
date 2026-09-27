import { Module } from '@nestjs/common';
import { TeamsService } from './application/teams.service';
import { TeamsController } from './presentation/teams.controller';

@Module({
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}

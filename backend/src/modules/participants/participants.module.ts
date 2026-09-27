import { Module } from '@nestjs/common';
import { ParticipantsService } from './application/participants.service';
import { ParticipantsController } from './presentation/participants.controller';
import { UsersAccessModule } from '../users-access/users-access.module';

@Module({
  imports: [UsersAccessModule],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
})
export class ParticipantsModule {}

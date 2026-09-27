import { Module } from '@nestjs/common';
import { UsersAccessModule } from '../users-access/users-access.module';
import { OfficialsService } from './application/officials.service';
import { OfficialsController } from './presentation/officials.controller';

@Module({
  imports: [UsersAccessModule],
  controllers: [OfficialsController],
  providers: [OfficialsService],
})
export class OfficialsModule {}

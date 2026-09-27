import { Module } from '@nestjs/common';
import { UsersAccessService } from './application/users-access.service';

@Module({
  providers: [UsersAccessService],
  exports: [UsersAccessService],
})
export class UsersAccessModule {}

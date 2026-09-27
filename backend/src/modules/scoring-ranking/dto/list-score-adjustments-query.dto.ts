import { ScoreAdjustmentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListScoreAdjustmentsQueryDto {
  @IsOptional()
  @IsEnum(ScoreAdjustmentStatus)
  status?: ScoreAdjustmentStatus;

  @IsOptional()
  @IsString()
  participantId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;
}

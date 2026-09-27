import { CaptureStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListCapturesQueryDto {
  @IsOptional()
  @IsString()
  tournamentId?: string;

  @IsOptional()
  @IsEnum(CaptureStatus)
  status?: CaptureStatus;
}

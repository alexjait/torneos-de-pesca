import { IsOptional, IsString, MinLength } from 'class-validator';

export class RevokeScoreAdjustmentDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}

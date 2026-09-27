import { IsInt, IsOptional, IsString, Max, MinLength } from 'class-validator';

export class CreateScoreAdjustmentDto {
  @IsString()
  participantId!: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsInt()
  @Max(-1)
  pointsDelta!: number;

  @IsString()
  @MinLength(3)
  reason!: string;
}

import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TournamentStatus } from '@prisma/client';

export class UpdateTournamentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @IsOptional()
  @IsString()
  rulesSummary?: string;
}

import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TournamentStatus } from '@prisma/client';

export class CreateTournamentDto {
  @IsString()
  name!: string;

  @IsDateString()
  eventDate!: string;

  @IsString()
  location!: string;

  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @IsOptional()
  @IsString()
  rulesSummary?: string;
}

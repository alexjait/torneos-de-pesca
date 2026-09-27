import { IsDateString, IsOptional } from 'class-validator';

export class UpdateTournamentScheduleDto {
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  fishingStartAt?: string;

  @IsOptional()
  @IsDateString()
  fishingEndAt?: string;

  @IsOptional()
  @IsDateString()
  validationDeadlineAt?: string;
}

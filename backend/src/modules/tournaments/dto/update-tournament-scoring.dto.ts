import { IsInt, IsOptional, IsObject, Min, ValidateIf } from 'class-validator';

export class UpdateTournamentScoringDto {
  @ValidateIf((dto) => dto.scoringConfig === undefined)
  @IsInt()
  @Min(0)
  pointsPerValidPiece?: number;

  @ValidateIf((dto) => dto.scoringConfig === undefined)
  @IsInt()
  @Min(0)
  largestCaptureBonusPoints?: number;

  @ValidateIf((dto) => dto.scoringConfig === undefined)
  @IsInt()
  @Min(0)
  distinctSpeciesPoints?: number;

  @IsOptional()
  @IsObject()
  scoringConfig?: Record<string, unknown>;
}

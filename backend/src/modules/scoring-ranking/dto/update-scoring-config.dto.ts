import { IsInt, Min } from 'class-validator';

export class UpdateScoringConfigDto {
  @IsInt()
  @Min(0)
  pointsPerValidPiece!: number;

  @IsInt()
  @Min(0)
  largestCaptureBonusPoints!: number;

  @IsInt()
  @Min(0)
  distinctSpeciesPoints!: number;
}

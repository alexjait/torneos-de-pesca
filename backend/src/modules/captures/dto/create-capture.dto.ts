import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { CaptureGpsDto } from './capture-gps.dto';
import { CaptureMediaInputDto } from './capture-media-input.dto';

export class CreateCaptureDto {
  @IsString()
  clientCaptureId!: string;

  @IsString()
  tournamentId!: string;

  @IsString()
  participantId!: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsString()
  species!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  length!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CaptureGpsDto)
  gps?: CaptureGpsDto;

  @IsOptional()
  @IsString()
  observation?: string;

  @ValidateNested()
  @Type(() => CaptureMediaInputDto)
  media!: CaptureMediaInputDto;
}

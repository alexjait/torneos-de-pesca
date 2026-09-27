import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { CaptureGpsDto } from './capture-gps.dto';
import { CaptureMediaInputDto } from './capture-media-input.dto';

export class UpdateCaptureDto {
  @IsOptional()
  @IsString()
  participantId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  species?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  length?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CaptureGpsDto)
  gps?: CaptureGpsDto;

  @IsOptional()
  @IsString()
  observation?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CaptureMediaInputDto)
  media?: CaptureMediaInputDto;
}

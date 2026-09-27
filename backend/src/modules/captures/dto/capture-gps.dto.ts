import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class CaptureGpsDto {
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  accuracy?: number;
}

import { IsOptional, IsString } from 'class-validator';

export class ResolveCaptureDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

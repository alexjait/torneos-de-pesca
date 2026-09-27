import { IsString } from 'class-validator';

export class CaptureMediaInputDto {
  @IsString()
  originalName!: string;

  @IsString()
  mimeType!: string;

  @IsString()
  dataUrl!: string;
}

import { ExportFormat, ExportType, RankingScope } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class CreateExportDto {
  @IsEnum(ExportType)
  exportType!: ExportType;

  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @IsOptional()
  @IsEnum(RankingScope)
  scope?: RankingScope;
}

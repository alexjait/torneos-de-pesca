import { RankingScope } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class RankingQueryDto {
  @IsOptional()
  @IsEnum(RankingScope)
  scope?: RankingScope;
}

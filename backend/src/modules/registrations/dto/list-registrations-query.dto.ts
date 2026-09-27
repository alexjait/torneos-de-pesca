import {
  RegistrationChannel,
  RegistrationReviewStatus,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListRegistrationsQueryDto {
  @IsOptional()
  @IsString()
  tournamentId?: string;

  @IsOptional()
  @IsEnum(RegistrationReviewStatus)
  reviewStatus?: RegistrationReviewStatus;

  @IsOptional()
  @IsEnum(RegistrationChannel)
  channel?: RegistrationChannel;
}

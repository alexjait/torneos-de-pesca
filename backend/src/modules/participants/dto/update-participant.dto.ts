import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateParticipantDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsBoolean()
  enabledToCompete?: boolean;
}

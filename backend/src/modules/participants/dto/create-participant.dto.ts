import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateParticipantDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

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

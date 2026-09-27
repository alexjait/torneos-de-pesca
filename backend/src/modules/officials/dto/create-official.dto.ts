import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOfficialDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  documentId!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  temporaryPassword?: string;
}

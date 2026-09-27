import { Equals, IsEmail, IsOptional, IsString } from 'class-validator';

export class SelfRegisterDto {
  @IsString()
  tournamentId!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @Equals(true, { message: 'Debes aceptar el reglamento para enviar la solicitud' })
  acceptedRules!: true;
}

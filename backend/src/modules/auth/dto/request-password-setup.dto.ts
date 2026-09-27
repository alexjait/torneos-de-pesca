import { IsEmail } from 'class-validator';

export class RequestPasswordSetupDto {
  @IsEmail()
  email!: string;
}

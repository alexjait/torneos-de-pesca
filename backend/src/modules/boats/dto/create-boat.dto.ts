import { IsOptional, IsString } from 'class-validator';

export class CreateBoatDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;
}

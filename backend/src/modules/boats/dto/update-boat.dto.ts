import { IsOptional, IsString } from 'class-validator';

export class UpdateBoatDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;
}

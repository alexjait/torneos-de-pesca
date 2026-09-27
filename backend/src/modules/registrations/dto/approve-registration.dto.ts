import { IsOptional, IsString } from 'class-validator';

export class ApproveRegistrationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

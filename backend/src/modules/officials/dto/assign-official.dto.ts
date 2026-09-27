import { IsString } from 'class-validator';

export class AssignOfficialDto {
  @IsString()
  tournamentId!: string;
}

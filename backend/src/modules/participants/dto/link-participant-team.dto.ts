import { IsString } from 'class-validator';

export class LinkParticipantTeamDto {
  @IsString()
  teamId!: string;
}

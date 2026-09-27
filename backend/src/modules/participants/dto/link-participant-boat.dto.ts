import { IsString } from 'class-validator';

export class LinkParticipantBoatDto {
  @IsString()
  boatId!: string;
}

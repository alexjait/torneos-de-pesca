import { Equals, IsString } from 'class-validator';

export class CreateRegistrationDto {
  @IsString()
  tournamentId!: string;

  @IsString()
  participantId!: string;

  @Equals(true, { message: 'Debes aceptar el reglamento para completar la inscripcion' })
  acceptedRules!: true;
}

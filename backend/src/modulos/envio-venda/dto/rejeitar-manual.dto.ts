/**
 * DTO para o Admin informar o motivo de rejeição manual.
 */
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class RejeitarManualDto {
  @IsString({ message: 'O motivo deve ser uma string.' })
  @IsNotEmpty({ message: 'O motivo não pode estar vazio.' })
  @MinLength(5, { message: 'O motivo deve ter pelo menos 5 caracteres.' })
  motivoRejeicao: string;
}

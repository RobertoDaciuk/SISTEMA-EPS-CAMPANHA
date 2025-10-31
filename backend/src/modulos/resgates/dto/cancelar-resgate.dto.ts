import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * DTO para o cancelamento/estorno de um resgate por parte do administrador.
 */
export class CancelarResgateDto {
  /**
   * Motivo detalhado do cancelamento (mínimo 10 caracteres).
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  motivoCancelamento!: string;
}

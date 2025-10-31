import { IsUUID, IsNotEmpty } from 'class-validator';

/**
 * DTO para solicitação de resgate de prêmio pelo Vendedor.
 */
export class SolicitarResgateDto {
  @IsUUID()
  @IsNotEmpty()
  premioId: string;
}

/**
 * DTO para filtro de listagem de envios.
 * Permite filtrar por status, campanha e vendedor.
 */
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { StatusEnvioVenda } from '@prisma/client';

export class ListarEnviosFiltroDto {
  @IsEnum(StatusEnvioVenda, { message: 'Status inválido.' })
  @IsOptional()
  status?: StatusEnvioVenda;

  @IsUUID('4', { message: 'campanhaId inválido.' })
  @IsOptional()
  campanhaId?: string;

  @IsUUID('4', { message: 'vendedorId inválido.' })
  @IsOptional()
  vendedorId?: string;
}

import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { StatusResgate } from '@prisma/client';

/**
 * DTO para filtros de query na listagem de ResgatePremio (admin).
 * Permite filtrar por status, vendedor e prêmio.
 */
export class ListarResgatesFiltroDto {
  /**
   * Status do resgate (opcional).
   */
  @IsEnum(StatusResgate)
  @IsOptional()
  status?: StatusResgate;

  /**
   * ID do vendedor (opcional).
   */
  @IsUUID()
  @IsOptional()
  vendedorId?: string;

  /**
   * ID do prêmio (opcional).
   */
  @IsUUID()
  @IsOptional()
  premioId?: string;
}

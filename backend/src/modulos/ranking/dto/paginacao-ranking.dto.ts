import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para paginação da listagem do ranking geral.
 */
export class PaginacaoRankingDto {
  /**
   * Página atual (padrão: 1).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  /**
   * Quantidade de registros por página (padrão: 20).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  porPagina?: number = 20;
}

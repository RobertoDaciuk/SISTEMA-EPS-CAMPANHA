import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginacaoRankingDto } from './paginacao-ranking.dto';

/**
 * DTO para filtros da listagem de ranking de vendedores.
 * Estende a paginação e adiciona filtros específicos.
 */
export class FiltrosRankingVendedoresDto extends PaginacaoRankingDto {
  /**
   * Filtra o ranking de vendedores por um ID de ótica específico.
   * Acessível apenas para Admins.
   */
  @IsOptional()
  @IsString()
  @IsUUID('4', { message: 'ID da ótica deve ser um UUID válido.' })
  opticaId?: string;
}

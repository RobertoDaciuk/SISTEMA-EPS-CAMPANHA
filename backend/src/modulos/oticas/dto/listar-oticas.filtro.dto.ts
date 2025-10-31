/**
 * ============================================================================
 * DTO: Filtros de Listagem de Óticas (Admin)
 * ============================================================================
 *
 * Descrição:
 * Data Transfer Object para validação de filtros de listagem de óticas.
 * Todos os campos são opcionais para permitir buscas flexíveis.
 *
 * REFATORAÇÃO (Tarefa 44.1 - Sprint 18.1):
 * - Adicionado filtro 'ehMatriz' para buscar apenas matrizes ou apenas filiais
 * - Usado no combobox do frontend para selecionar matriz ao criar filial
 *
 * Filtros Disponíveis:
 * - nome: Busca parcial e case-insensitive
 * - cnpj: Busca parcial (aceita CNPJ com ou sem pontuação)
 * - ativa: Filtra por status (string 'true' ou 'false')
 * - ehMatriz: Filtra por tipo (boolean true/false)
 *
 * @module OticasModule
 * ============================================================================
 */

import { IsOptional, IsString, IsBooleanString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para filtros de listagem de óticas no Admin.
 * Todos os campos são opcionais para permitir buscas flexíveis.
 */
export class ListarOticasFiltroDto {
  /**
   * Filtra por nome (consulta parcial e insensível a maiúsculas/minúsculas).
   *
   * @example "Central"  // Retorna "Ótica Central", "Central Vision", etc.
   */
  @IsString()
  @IsOptional()
  nome?: string;

  /**
   * Filtra pelo CNPJ (consulta parcial).
   *
   * Aceita CNPJ com ou sem pontuação. O service sanitizará antes de buscar.
   *
   * @example "12345678"  // Retorna CNPJs que contenham "12345678"
   * @example "12.345"    // Aceita pontuação
   */
  @IsString()
  @IsOptional()
  cnpj?: string;

  /**
   * Filtra pelo status de ativação ('true' ou 'false' como texto).
   *
   * Query params sempre vêm como string, então usamos IsBooleanString.
   *
   * @example "true"   // Apenas óticas ativas
   * @example "false"  // Apenas óticas inativas
   */
  @IsBooleanString()
  @IsOptional()
  ativa?: string;

  /**
   * Filtra pelo tipo de ótica (Matriz ou Filial).
   *
   * NOVO CAMPO (Tarefa 44.1):
   * - Usado no frontend para popular dropdown de matrizes
   * - Se true: Retorna apenas óticas marcadas como Matriz
   * - Se false: Retorna apenas filiais
   * - Se não fornecido: Retorna todas
   *
   * IMPORTANTE:
   * Query params vêm como string ('true'/'false'), mas class-transformer
   * com @Type(() => Boolean) converte automaticamente para boolean.
   *
   * @example true   // Apenas matrizes
   * @example false  // Apenas filiais
   */
  @IsOptional()
  @IsBoolean({ message: 'ehMatriz deve ser um booleano (true/false)' })
  @Type(() => Boolean) // Transforma string 'true'/'false' em boolean
  ehMatriz?: boolean;

  /**
   * Se true, retorna uma lista simplificada (id, nome).
   * Ideal para popular dropdowns no frontend.
   */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  simple?: boolean;
}

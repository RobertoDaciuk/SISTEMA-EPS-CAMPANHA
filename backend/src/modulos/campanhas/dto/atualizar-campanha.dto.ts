/**
 * ============================================================================
 * DTO: Atualizar Campanha (ATUALIZADO - Sprint 17)
 * ============================================================================
 *
 * Descrição:
 * Data Transfer Object para atualização parcial de uma campanha.
 *
 * Permite atualizar apenas os campos básicos da campanha (título, datas, valores).
 * NÃO permite atualizar cartelas/requisitos/condições aninhadas por questões
 * de complexidade e integridade de dados.
 *
 * Para alterar estrutura de cartelas, Admin deve criar nova campanha.
 *
 * Alterações Sprint 17 (Tarefa 41):
 * - ADICIONADO: campo paraTodasOticas (atualizável)
 * - REMOVIDO: campo oticasAlvoIds (NÃO atualizável via PATCH - simplificação)
 *
 * @module CampanhasModule
 * ============================================================================
 */

import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CriarCampanhaDto } from './criar-campanha.dto';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO para atualização de campanha.
 *
 * Herda todos os campos de CriarCampanhaDto EXCETO cartelas E oticasAlvoIds.
 * Todos os campos são opcionais (PartialType).
 *
 * Campos atualizáveis:
 * - titulo
 * - descricao
 * - dataInicio
 * - dataFim
 * - moedinhasPorCartela
 * - pontosReaisPorCartela
 * - percentualGerente
 * - paraTodasOticas (Sprint 17)
 *
 * Campos NÃO atualizáveis:
 * - cartelas (estrutura complexa aninhada - criar nova campanha se necessário)
 * - oticasAlvoIds (simplificação - só pode ser definido na criação)
 *
 * @example
 * ```
 * // Atualizar apenas título e data de término
 * {
 *   titulo: "Campanha Lentes Q1 2025 - PRORROGADA",
 *   dataFim: "2025-04-30"
 * }
 *
 * // Alterar targeting para todas as óticas
 * {
 *   paraTodasOticas: true
 * }
 * ```
 */
export class AtualizarCampanhaDto extends PartialType(
  OmitType(CriarCampanhaDto, ['cartelas', 'oticasAlvoIds'] as const),
) {
  /**
   * Indica se a campanha é válida para todas as óticas.
   * (Adicionado no Sprint 17)
   */
  @IsBoolean({ message: 'O campo paraTodasOticas deve ser booleano.' })
  @IsOptional()
  paraTodasOticas?: boolean;
}

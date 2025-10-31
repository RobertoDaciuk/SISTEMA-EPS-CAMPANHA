/**
 * ============================================================================
 * DTO: Criar Regra de Cartela
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object para validação de uma regra de cartela.
 * Nível intermediário da hierarquia de DTOs aninhados.
 * 
 * Uma regra de cartela representa uma "Cartela" numerada (1, 2, 3, etc.)
 * que contém múltiplos requisitos (cards).
 * 
 * Hierarquia de Aninhamento:
 * CriarCampanhaDto
 *   └─ CriarRegraCartelaDto[] ← (Este arquivo)
 *       └─ CriarRequisitoCartelaDto[]
 *           └─ CriarCondicaoRequisitoDto[]
 * 
 * @module CampanhasModule
 * ============================================================================
 */

import {
  IsInt,
  IsString,
  ValidateNested,
  IsArray,
  Min,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CriarRequisitoCartelaDto } from './criar-requisito-cartela.dto';

/**
 * DTO para criação de uma regra de cartela.
 * 
 * Representa uma "Cartela" numerada que agrupa múltiplos requisitos.
 * 
 * @example
 * ```
 * {
 *   numeroCartela: 1,
 *   descricao: "Cartela Bronze - Produtos Básicos",
 *   requisitos: [
 *     {
 *       descricao: "Lentes BlueProtect",
 *       quantidade: 5,
 *       tipoUnidade: "PAR",
 *       condicoes: [...]
 *     },
 *     {
 *       descricao: "Armações Premium",
 *       quantidade: 3,
 *       tipoUnidade: "UNIDADE",
 *       condicoes: [...]
 *     }
 *   ]
 * }
 * ```
 */
export class CriarRegraCartelaDto {
  /**
   * Número sequencial da cartela (1, 2, 3, ...).
   * 
   * Define a ordem de prioridade do spillover:
   * - Cartela 1 é preenchida primeiro
   * - Quando Cartela 1 completa, vendas vão para Cartela 2
   * - E assim por diante
   * 
   * @example 1
   */
  @IsInt({ message: 'O número da cartela deve ser um inteiro' })
  @Min(1, { message: 'O número da cartela deve ser no mínimo 1' })
  numeroCartela: number;

  /**
   * Descrição opcional da cartela.
   * 
   * Ajuda a identificar o propósito/nível da cartela.
   * 
   * @example "Cartela Bronze - Produtos Básicos"
   */
  @IsString({ message: 'A descrição deve ser uma string' })
  @IsOptional()
  descricao?: string;

  /**
   * Lista de requisitos (cards) desta cartela.
   * 
   * Cada requisito é um objetivo que o vendedor deve cumprir.
   * 
   * Mínimo: 1 requisito (cartela precisa ter pelo menos um objetivo)
   * 
   * @example
   * ```
   * [
   *   {
   *     descricao: "Lentes BlueProtect Max",
   *     quantidade: 5,
   *     tipoUnidade: "PAR",
   *     condicoes: [...]
   *   }
   * ]
   * ```
   */
  @IsArray({ message: 'Os requisitos devem ser um array' })
  @ValidateNested({ each: true })
  @Type(() => CriarRequisitoCartelaDto)
  @IsNotEmpty({ message: 'A cartela deve ter pelo menos um requisito' })
  requisitos: CriarRequisitoCartelaDto[];
}

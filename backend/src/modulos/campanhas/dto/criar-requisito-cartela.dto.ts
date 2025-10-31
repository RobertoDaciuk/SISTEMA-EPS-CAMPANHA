/**
 * ============================================================================
 * DTO: Criar Requisito de Cartela
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object para validação de um requisito (card) de cartela.
 * Nível intermediário da hierarquia de DTOs aninhados.
 * 
 * Um requisito representa um "card" que o vendedor vê na interface.
 * Exemplo: "Lentes BlueProtect Max - 5 pares"
 * 
 * Hierarquia de Aninhamento:
 * CriarCampanhaDto
 *   └─ CriarRegraCartelaDto[]
 *       └─ CriarRequisitoCartelaDto[] ← (Este arquivo)
 *           └─ CriarCondicaoRequisitoDto[]
 * 
 * @module CampanhasModule
 * ============================================================================
 */

import {
  IsString,
  IsInt,
  IsEnum,
  ValidateNested,
  IsArray,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoUnidade } from '@prisma/client';
import { CriarCondicaoRequisitoDto } from './criar-condicao-requisito.dto';

/**
 * DTO para criação de um requisito de cartela.
 *
 * Representa um "card" na interface do vendedor com validação dinâmica
 * baseada em condições do Rule Builder.
 *
 * ATUALIZADO Sprint 16.5 - Tarefa 38.7:
 * - Adicionado campo ordem (obrigatório) para suportar spillover correto
 *
 * @example
 * ```
 * {
 *   descricao: "Lentes BlueProtect Max",
 *   quantidade: 5,
 *   tipoUnidade: "PAR",
 *   ordem: 1,
 *   condicoes: [
 *     {
 *       campo: "NOME_PRODUTO",
 *       operador: "CONTEM",
 *       valor: "BlueProtect"
 *     },
 *     {
 *       campo: "NOME_PRODUTO",
 *       operador: "CONTEM",
 *       valor: "Max"
 *     }
 *   ]
 * }
 * ```
 */
export class CriarRequisitoCartelaDto {
  /**
   * Título/descrição do card mostrado ao vendedor.
   *
   * Este é o nome "amigável" que aparece na interface.
   *
   * @example "Lentes BlueProtect Max"
   */
  @IsString({ message: 'A descrição deve ser uma string' })
  @IsNotEmpty({ message: 'A descrição não pode estar vazia' })
  descricao: string;

  /**
   * Quantidade necessária para completar este requisito.
   *
   * Interpretação depende de tipoUnidade:
   * - Se PAR: precisa de N pares
   * - Se UNIDADE: precisa de N unidades
   *
   * @example 5
   */
  @IsInt({ message: 'A quantidade deve ser um número inteiro' })
  @Min(1, { message: 'A quantidade deve ser no mínimo 1' })
  quantidade: number;

  /**
   * Tipo de unidade para contabilização.
   *
   * Define como as vendas são contadas:
   * - PAR: 1 venda = 1 par (usado para lentes)
   * - UNIDADE: 1 venda = 1 unidade (usado para armações, acessórios)
   *
   * @example "PAR"
   */
  @IsEnum(TipoUnidade, {
    message: 'O tipo de unidade deve ser PAR ou UNIDADE',
  })
  tipoUnidade: TipoUnidade;

  /**
   * Ordem do requisito dentro da cartela (1, 2, 3...).
   *
   * CRÍTICO PARA SPILLOVER:
   * - Requisitos com a mesma ordem entre cartelas diferentes são considerados "relacionados"
   * - Exemplo: "Lentes X" com ordem=1 na Cartela 1, 2 e 3 representa o mesmo requisito lógico
   * - O frontend usa este campo para agrupar requisitos e calcular spillover visual
   * - O backend usa este campo para calcular em qual cartela alocar envios validados
   *
   * Regras:
   * - Deve ser um número inteiro positivo (1, 2, 3...)
   * - Geralmente corresponde à posição do requisito no array (primeiro req = 1, segundo = 2, etc.)
   * - DEVE ser igual para o mesmo requisito lógico em cartelas diferentes
   *
   * @example 1
   */
  @IsInt({ message: 'A ordem deve ser um número inteiro' })
  @Min(1, { message: 'A ordem deve ser no mínimo 1' })
  ordem: number;

  /**
   * Lista de condições de validação (Rule Builder).
   *
   * Cada condição é uma regra que o pedido deve atender.
   * Múltiplas condições são combinadas com AND lógico.
   *
   * Mínimo: 1 condição (requisito precisa ter pelo menos uma regra)
   *
   * @example
   * ```
   * [
   *   { campo: "NOME_PRODUTO", operador: "CONTEM", valor: "BlueProtect" },
   *   { campo: "VALOR_VENDA", operador: "MAIOR_QUE", valor: "500" }
   * ]
   * ```
   */
  @IsArray({ message: 'As condições devem ser um array' })
  @ValidateNested({ each: true })
  @Type(() => CriarCondicaoRequisitoDto)
  @IsNotEmpty({ message: 'O requisito deve ter pelo menos uma condição' })
  condicoes: CriarCondicaoRequisitoDto[];
}

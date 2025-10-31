/**
 * ============================================================================
 * DTO: Criar Condição de Requisito
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object para validação de uma condição individual do Rule Builder.
 * Este é o nível mais baixo da hierarquia de DTOs aninhados.
 * 
 * Uma condição representa uma regra de validação aplicada aos dados do pedido.
 * Exemplo: "NOME_PRODUTO CONTÉM BlueProtect"
 * 
 * Hierarquia de Aninhamento:
 * CriarCampanhaDto
 *   └─ CriarRegraCartelaDto[]
 *       └─ CriarRequisitoCartelaDto[]
 *           └─ CriarCondicaoRequisitoDto[] ← (Este arquivo)
 * 
 * @module CampanhasModule
 * ============================================================================
 */

import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { CampoVerificacao, OperadorCondicao } from '@prisma/client';

/**
 * DTO para criação de uma condição de requisito.
 * 
 * Representa uma regra individual de validação no formato:
 * [campo] [operador] [valor]
 * 
 * @example
 * ```
 * {
 *   campo: "NOME_PRODUTO",
 *   operador: "CONTEM",
 *   valor: "BlueProtect"
 * }
 * ```
 */
export class CriarCondicaoRequisitoDto {
  /**
   * Campo do pedido que será verificado.
   * 
   * Opções disponíveis:
   * - NOME_PRODUTO: Nome/descrição do produto
   * - CODIGO_PRODUTO: Código/SKU do produto
   * - VALOR_VENDA: Valor monetário da venda
   * - CATEGORIA_PRODUTO: Categoria do produto
   * 
   * @example "NOME_PRODUTO"
   */
  @IsEnum(CampoVerificacao, {
    message: 'O campo deve ser um dos valores válidos: NOME_PRODUTO, CODIGO_PRODUTO, VALOR_VENDA, CATEGORIA_PRODUTO',
  })
  campo: CampoVerificacao;

  /**
   * Operador lógico da comparação.
   * 
   * Opções disponíveis:
   * - CONTEM: Campo contém o valor (case-insensitive)
   * - NAO_CONTEM: Campo não contém o valor
   * - IGUAL_A: Campo é exatamente igual ao valor
   * - NAO_IGUAL_A: Campo é diferente do valor
   * - MAIOR_QUE: Campo é numericamente maior (para VALOR_VENDA)
   * - MENOR_QUE: Campo é numericamente menor (para VALOR_VENDA)
   * 
   * @example "CONTEM"
   */
  @IsEnum(OperadorCondicao, {
    message: 'O operador deve ser um dos valores válidos: CONTEM, NAO_CONTEM, IGUAL_A, NAO_IGUAL_A, MAIOR_QUE, MENOR_QUE',
  })
  operador: OperadorCondicao;

  /**
   * Valor de referência para a comparação.
   * 
   * Interpretação depende do campo:
   * - NOME_PRODUTO/CODIGO_PRODUTO: string para comparação
   * - VALOR_VENDA: número como string (ex: "500.00")
   * - CATEGORIA_PRODUTO: string exata
   * 
   * @example "BlueProtect"
   */
  @IsString({ message: 'O valor deve ser uma string' })
  @IsNotEmpty({ message: 'O valor não pode estar vazio' })
  valor: string;
}

/**
 * ============================================================================
 * DTO: Criar Envio de Venda
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object para validação de submissão de venda pelo vendedor.
 * 
 * Representa a ação do vendedor clicando em um "card" de requisito na
 * interface e informando o número do pedido que ele vendeu.
 * 
 * Fluxo de Uso:
 * 1. Vendedor visualiza campanha ativa
 * 2. Vendedor vê cards de requisitos (ex: "Lentes BlueProtect Max - 5 pares")
 * 3. Vendedor clica no card específico que ele quer preencher
 * 4. Vendedor informa número do pedido (ex: "#12345")
 * 5. Sistema envia este DTO para criação do envio
 * 6. Envio entra na fila com status EM_ANALISE
 * 7. Admin/Robô valida posteriormente
 * 
 * @module EnvioVendaModule
 * ============================================================================
 */

import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO para criação de um envio de venda.
 * 
 * Representa a submissão de uma venda pelo vendedor contra um
 * requisito específico de uma campanha.
 * 
 * @example
 * ```
 * {
 *   numeroPedido: "#12345",
 *   campanhaId: "uuid-da-campanha",
 *   requisitoId: "uuid-do-requisito-blueprotect"
 * }
 * ```
 */
export class CriarEnvioVendaDto {
  /**
   * Número do pedido (vindo do sistema externo ou planilha).
   * 
   * Este é o identificador único da venda no ERP/sistema da ótica.
   * Será usado pelo Admin/Robô para buscar dados do pedido e validar.
   * 
   * Formato livre (pode conter #, letras, números, etc.).
   * 
   * @example "#12345"
   * @example "PED-2025-001234"
   * @example "12345"
   */
  @IsString({ message: 'O número do pedido deve ser uma string' })
  @IsNotEmpty({ message: 'O número do pedido não pode estar vazio' })
  numeroPedido: string;

  /**
   * ID da campanha à qual esta venda pertence.
   * 
   * Vendedor está submetendo venda para uma campanha específica.
   * 
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @IsUUID('4', { message: 'O ID da campanha deve ser um UUID válido' })
  campanhaId: string;

  /**
   * ID do requisito (card) contra o qual esta venda está sendo submetida.
   * 
   * Vendedor escolheu um card específico na interface.
   * Ex: "Lentes BlueProtect Max - 5 pares"
   * 
   * Este ID vincula a venda ao requisito específico, permitindo que:
   * - Sistema valide se o pedido atende às condições do requisito
   * - Robô aloque corretamente a venda na cartela apropriada
   * - Vendedor veja progresso em tempo real no card
   * 
   * @example "550e8400-e29b-41d4-a716-446655440001"
   */
  @IsUUID('4', { message: 'O ID do requisito deve ser um UUID válido' })
  requisitoId: string;
}

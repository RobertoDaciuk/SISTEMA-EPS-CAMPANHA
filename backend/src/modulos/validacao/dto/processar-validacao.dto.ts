/**
 * ============================================================================
 * DTO: Processar Validação (ATUALIZADO - Sprint 16.4)
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object para processamento em lote dos envios de vendas.
 * Usado pelo "Robô" do Admin via upload/processamento de planilha.
 * 
 * Alterações Sprint 16.4 (Tarefa 38.4):
 * - ADICIONADO: Decorator customizado @IsMapaComCnpj para garantir que
 *   o mapaColunas contém obrigatoriamente um mapeamento para "CNPJ_OTICA".
 * - ATUALIZADO: Campo mapaColunas agora usa @IsDefined() e @IsMapaComCnpj()
 *   no lugar de @IsObject() para reforçar a validação.
 * 
 * Fluxo:
 * 1. Admin faz upload de planilha para o frontend
 * 2. Frontend envia as linhas (já lidas do .xlsx) + mapa de colunas
 * 3. DTO chega ao backend; Validação em lote dos envios pendentes da campanha
 * 4. Validação de CNPJ (Sprint 16.4) requer que CNPJ_OTICA esteja mapeado
 * 
 * @module ValidacaoModule
 * ============================================================================
 */

import {
  IsString,
  IsBoolean,
  IsArray,
  IsObject,
  IsUUID,
  IsDefined,
  ValidationOptions,
  registerDecorator,
  ValidationArguments,
} from 'class-validator';

/**
 * ============================================================================
 * DECORATOR CUSTOMIZADO: @IsMapaComCnpj
 * ============================================================================
 * 
 * Valida se o mapaColunas é um objeto válido E contém um mapeamento para
 * a chave "CNPJ_OTICA" (necessária para a validação de CNPJ na Tarefa 38.4).
 * 
 * Retorna erro customizado se:
 * - O valor não for um objeto
 * - O objeto não contiver "CNPJ_OTICA" entre os valores mapeados
 * 
 * Exemplo de mapa válido:
 * {
 *   "CNPJ da Loja": "CNPJ_OTICA",
 *   "Número do Pedido (OS)": "NUMERO_PEDIDO_OS",
 *   "Produto": "NOME_PRODUTO"
 * }
 */
function IsMapaComCnpj(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isMapaComCnpj',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        /**
         * Valida se o valor é um objeto e contém "CNPJ_OTICA" mapeado.
         * 
         * @param value - Valor do campo mapaColunas
         * @param args - Argumentos de validação
         * @returns true se válido, false caso contrário
         */
        validate(value: any, args: ValidationArguments) {
          // 1. Verifica se é um objeto não-nulo
          if (typeof value !== 'object' || value === null) {
            return false;
          }

          // 2. Verifica se algum valor do objeto é exatamente "CNPJ_OTICA"
          const valores = Object.values(value);
          return valores.includes('CNPJ_OTICA');
        },

        /**
         * Mensagem de erro padrão exibida quando a validação falha.
         * 
         * @param args - Argumentos de validação
         * @returns Mensagem de erro customizada
         */
        defaultMessage(args: ValidationArguments) {
          return 'O mapaColunas deve ser um objeto e conter um mapeamento para "CNPJ_OTICA".';
        },
      },
    });
  };
}

/**
 * ============================================================================
 * DTO PRINCIPAL: ProcessarValidacaoDto
 * ============================================================================
 */
export class ProcessarValidacaoDto {
  /**
   * ID da campanha que será processada.
   * 
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @IsUUID('4', { message: 'O ID da campanha deve ser UUID válido' })
  campanhaId: string;

  /**
   * Indica se esta execução é uma simulação (não comita alterações no banco).
   * 
   * - true: Apenas simula (pré-visualização, dry-run)
   * - false: Valida "de verdade" e persiste resultados
   */
  @IsBoolean({ message: 'ehSimulacao deve ser booleano' })
  ehSimulacao: boolean;

  /**
   * Mapa de colunas da planilha para campos do sistema.
   * 
   * OBRIGATÓRIO (Sprint 16.4): Deve conter um mapeamento para "CNPJ_OTICA"
   * para permitir a validação de CNPJ contra a Ótica do Vendedor.
   * 
   * Estrutura:
   * - Chave: Nome da coluna na planilha (ex: "CNPJ da Loja")
   * - Valor: Campo do sistema (ex: "CNPJ_OTICA")
   * 
   * Exemplo válido:
   * {
   *   "Número do Pedido (OS)": "NUMERO_PEDIDO_OS",
   *   "CNPJ da Loja": "CNPJ_OTICA",
   *   "Produto": "NOME_PRODUTO",
   *   "Valor": "VALOR_VENDA"
   * }
   * 
   * Exemplo inválido (sem CNPJ_OTICA):
   * {
   *   "Número do Pedido (OS)": "NUMERO_PEDIDO_OS",
   *   "Produto": "NOME_PRODUTO"
   * }
   */
  @IsDefined({ message: 'O mapaColunas é obrigatório.' })
  @IsMapaComCnpj({
    message: 'O mapaColunas é obrigatório e deve incluir um mapeamento para "CNPJ_OTICA".',
  })
  mapaColunas: Record<string, string>;

  /**
   * Array de objetos com os dados das linhas lidas da planilha.
   * 
   * Cada objeto representa uma linha da planilha com as colunas mapeadas.
   * 
   * Exemplo:
   * [
   *   { "Número do Pedido (OS)": "#100", "CNPJ da Loja": "12345678000190", "Produto": "Lente X" },
   *   { "Número do Pedido (OS)": "#101", "CNPJ da Loja": "98765432000199", "Produto": "Lente Y" }
   * ]
   */
  @IsArray({ message: 'linhasPlanilha deve ser um array' })
  linhasPlanilha: any[];
}

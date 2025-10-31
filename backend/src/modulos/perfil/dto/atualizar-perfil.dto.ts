import {
  IsString,
  IsOptional,
  IsNotEmpty,
  Matches,
  IsObject,
} from 'class-validator';

/**
 * ====================================================================
 * DTO: AtualizarPerfilDto
 * ====================================================================
 *
 * Data Transfer Object para atualização do perfil pelo próprio usuário.
 *
 * Regras:
 * - Todo campo é opcional, mas ao menos um deve ser enviado.
 * - Não permite alteração de email, papel ou status (campos restritos).
 * - Campos validados: nome, cpf, whatsapp, mapeamentoPlanilhaSalvo.
 *
 * Adicionado na Versão 4.1 (Sprint 17.2 - Tarefa 40.1):
 * - Campo mapeamentoPlanilhaSalvo para persistir preferências de mapeamento
 *   de colunas da planilha (usado pelo Admin na validação de vendas).
 *
 * @example
 * {
 *   "nome": "João Silva",
 *   "cpf": "12345678901",
 *   "whatsapp": "5511987654321",
 *   "mapeamentoPlanilhaSalvo": {
 *     "Coluna A": "NOME_PRODUTO",
 *     "Coluna B": "DATA_VENDA",
 *     "Coluna C": "CNPJ_OTICA"
 *   }
 * }
 */
export class AtualizarPerfilDto {
  /**
   * Nome completo do usuário.
   *
   * Validações:
   * - Deve ser uma string não vazia.
   * - Campo opcional (apenas se o usuário quiser atualizar).
   *
   * @example "João Silva Santos"
   */
  @IsString({ message: 'O nome deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome não pode estar vazio.' })
  @IsOptional()
  nome?: string;

  /**
   * CPF do usuário (apenas dígitos, sem pontuação).
   *
   * Validações:
   * - Deve conter exatamente 11 dígitos numéricos.
   * - Campo opcional (apenas se o usuário quiser atualizar).
   *
   * Formato esperado: 12345678901 (sem pontos ou traços)
   *
   * @example "12345678901"
   */
  @IsString({ message: 'O CPF deve ser uma string.' })
  @IsOptional()
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos numéricos.',
  })
  cpf?: string;

  /**
   * WhatsApp do usuário (formato: DDI + DDD + número, apenas dígitos).
   *
   * Validações:
   * - Deve conter entre 12 e 13 dígitos (ex: 5511987654321).
   * - Campo opcional (apenas se o usuário quiser atualizar).
   *
   * Formato esperado: DDI (2 dígitos) + DDD (2 dígitos) + Número (8-9 dígitos)
   * - Brasil (55): 5511987654321 (12 dígitos) ou 55119876543210 (13 dígitos)
   *
   * @example "5511987654321"
   */
  @IsString({ message: 'O WhatsApp deve ser uma string.' })
  @IsOptional()
  @Matches(/^\d{12,13}$/, {
    message:
      'WhatsApp deve conter DDI, DDD e número, totalizando 12 ou 13 dígitos (apenas números).',
  })
  whatsapp?: string;

  /**
   * Preferências de mapeamento de colunas da planilha salvas pelo Admin.
   *
   * Este campo armazena um objeto JSON onde:
   * - Chave: Nome da coluna da planilha (ex: "Coluna A", "Data Venda")
   * - Valor: Identificador do campo do sistema (ex: "NOME_PRODUTO", "DATA_VENDA")
   *
   * Validações:
   * - Deve ser um objeto válido (ou null para limpar as preferências).
   * - Campo opcional (usado apenas por usuários com papel ADMIN).
   *
   * Estrutura esperada:
   * ```
   * {
   *   "Nome do Produto": "NOME_PRODUTO",
   *   "Data": "DATA_VENDA",
   *   "CNPJ": "CNPJ_OTICA",
   *   "Pedido": "NUMERO_PEDIDO_OS",
   *   "Valor": "VALOR_VENDA"
   * }
   * ```
   *
   * Valores aceitos para os campos do sistema:
   * - IGNORAR (coluna será ignorada no processamento)
   * - NUMERO_PEDIDO_OS
   * - NUMERO_PEDIDO_OPTICLICK
   * - NUMERO_PEDIDO_ONLINE
   * - NUMERO_PEDIDO_ENVELOPE
   * - DATA_VENDA
   * - NOME_PRODUTO
   * - CNPJ_OTICA
   * - CPF
   * - VALOR_VENDA
   *
   * Para limpar as preferências salvas, envie `null`.
   *
   * Adicionado no Sprint 17.2 (Tarefa 40.1)
   *
   * @example
   * {
   *   "Coluna X": "NOME_PRODUTO",
   *   "Coluna Y": "DATA_VENDA",
   *   "Coluna Z": "CNPJ_OTICA"
   * }
   *
   * @example null // Para limpar as preferências
   */
  @IsObject({ message: 'O mapeamento da planilha deve ser um objeto válido.' })
  @IsOptional()
  mapeamentoPlanilhaSalvo?: Record<string, string> | null;
}

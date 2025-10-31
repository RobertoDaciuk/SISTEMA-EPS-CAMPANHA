/**
 * ============================================================================
 * DTO: Criar Ótica
 * ============================================================================
 *
 * Descrição:
 * Data Transfer Object para validação dos dados de criação de uma nova ótica
 * parceira no sistema. Este DTO é usado pelo Admin ao cadastrar óticas.
 *
 * REFATORAÇÃO (Tarefa 44.1 - Sprint 18.1):
 * - Adicionado campo 'ehMatriz' (Boolean) para marcar ótica como matriz
 * - Adicionado campo 'matrizId' (UUID) para vincular filial à matriz
 * - Implementadas validações de hierarquia no Service (não no DTO)
 *
 * Validações Aplicadas:
 * - CNPJ: Obrigatório, string não vazia
 * - Nome: Obrigatório, string não vazia
 * - ehMatriz: Opcional, padrão false
 * - matrizId: Opcional, UUID válido
 * - Endereço, Cidade, Estado, Telefone, Email: Opcionais
 *
 * Observação:
 * O CNPJ será sanitizado (remover pontos, traços, barras) pelo service antes
 * de salvar no banco. O usuário pode enviar no formato "12.345.678/0001-90"
 * ou "12345678000190" - ambos são aceitos.
 *
 * @module OticasModule
 * ============================================================================
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Length,
  IsBoolean,
  IsUUID,
} from 'class-validator';

/**
 * DTO para criação de uma nova ótica parceira.
 *
 * Usado na rota POST /api/oticas (Admin apenas).
 */
export class CriarOticaDto {
  /**
   * CNPJ da ótica (14 dígitos).
   *
   * Aceita formatos:
   * - Com pontuação: "12.345.678/0001-90"
   * - Sem pontuação: "12345678000190"
   *
   * O service removerá a pontuação antes de salvar.
   *
   * @example "12.345.678/0001-90"
   * @example "12345678000190"
   */
  @IsString({ message: 'O CNPJ deve ser uma string' })
  @IsNotEmpty({ message: 'O CNPJ é obrigatório' })
  cnpj: string;

  /**
   * Nome fantasia ou razão social da ótica.
   *
   * @example "Ótica Central LTDA"
   * @example "Visão Perfeita"
   */
  @IsString({ message: 'O nome deve ser uma string' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  nome: string;

  /**
   * Endereço completo da ótica (opcional).
   *
   * @example "Rua das Flores, 123, Centro"
   */
  @IsOptional()
  @IsString({ message: 'O endereço deve ser uma string' })
  endereco?: string;

  /**
   * Cidade onde a ótica está localizada (opcional).
   *
   * @example "São Paulo"
   */
  @IsOptional()
  @IsString({ message: 'A cidade deve ser uma string' })
  cidade?: string;

  /**
   * Estado (UF) onde a ótica está localizada (opcional).
   *
   * @example "SP"
   */
  @IsOptional()
  @IsString({ message: 'O estado deve ser uma string' })
  @Length(2, 2, { message: 'O estado deve ter exatamente 2 caracteres (UF)' })
  estado?: string;

  /**
   * Telefone de contato da ótica (opcional).
   *
   * Aceita diversos formatos:
   * - "(11) 98765-4321"
   * - "11987654321"
   * - "+55 11 98765-4321"
   *
   * @example "(11) 98765-4321"
   */
  @IsOptional()
  @IsString({ message: 'O telefone deve ser uma string' })
  telefone?: string;

  /**
   * Email de contato da ótica (opcional).
   *
   * @example "contato@oticacentral.com.br"
   */
  @IsOptional()
  @IsEmail({}, { message: 'O email deve ser válido' })
  email?: string;

  /**
   * Indica se esta ótica é uma Matriz (pode ter filiais).
   *
   * NOVO CAMPO (Tarefa 44.1):
   * - Se true: Esta ótica pode ter filiais vinculadas a ela
   * - Se false (padrão): Esta ótica é uma filial (ou independente)
   *
   * Validações no Service:
   * - Se ehMatriz=true, matrizId DEVE ser null
   * - Se ehMatriz=false e matrizId fornecido, vincula como filial
   *
   * @example true  // Esta é uma matriz
   * @example false // Esta é uma filial
   */
  @IsOptional()
  @IsBoolean({ message: 'ehMatriz deve ser um booleano (true/false)' })
  ehMatriz?: boolean;

  /**
   * ID da ótica Matriz à qual esta ótica pertence (se for filial).
   *
   * NOVO CAMPO (Tarefa 44.1):
   * - Usado apenas se ehMatriz=false
   * - Deve apontar para uma ótica que tenha ehMatriz=true
   *
   * Validações no Service:
   * - Se fornecido, a ótica referenciada DEVE existir
   * - A ótica referenciada DEVE ter ehMatriz=true
   * - Prevenir referência circular (A→B→A)
   * - Se ehMatriz=true, este campo é ignorado (sempre null para matrizes)
   *
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @IsOptional()
  @IsUUID('4', { message: 'O ID da matriz deve ser um UUID válido' })
  matrizId?: string;
}

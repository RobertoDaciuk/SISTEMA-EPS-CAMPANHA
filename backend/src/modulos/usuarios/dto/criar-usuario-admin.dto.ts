/**
 * ============================================================================
 * DTO: Criar Usuário (Admin)
 * ============================================================================
 *
 * Descrição:
 * Data Transfer Object para validação dos dados de criação de usuário
 * pelo Admin. Diferente do auto-registro, permite definir papel, status
 * e vínculos hierárquicos (gerente, ótica).
 *
 * REFATORAÇÃO (Tarefa 44.1 - Sprint 18.1):
 * - Campo 'senha' agora é OPCIONAL
 * - Se senha NÃO fornecida: Sistema gera token temporário de 7 dias
 * - Se senha fornecida: Usuario pode logar imediatamente
 * - Adicionado campo 'whatsapp' (estava no schema mas não no DTO)
 *
 * Diferenças do RegistrarUsuarioDto (auto-registro):
 * - Auto-registro: papel sempre VENDEDOR, status sempre PENDENTE
 * - Admin: pode definir qualquer papel e status
 * - Admin: pode criar Admin, Gerente ou Vendedor
 * - Admin: pode vincular Gerente a Vendedor (gerenteId)
 *
 * @module UsuariosModule
 * ============================================================================
 */

import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsOptional,
  IsUUID,
  Matches,
  Length,
} from 'class-validator';
import { PapelUsuario, StatusUsuario } from '@prisma/client';

/**
 * DTO para criação de usuário pelo Admin.
 */
export class CriarUsuarioAdminDto {
  /**
   * Email do usuário (será usado para login).
   *
   * @example "admin@epscampanhas.com"
   */
  @IsEmail({}, { message: 'O email deve ser válido' })
  @IsNotEmpty({ message: 'O email é obrigatório' })
  email: string;

  /**
   * Nome completo do usuário.
   *
   * @example "Carlos Admin Silva"
   */
  @IsString({ message: 'O nome deve ser uma string' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  nome: string;

  /**
   * Senha do usuário (OPCIONAL desde Tarefa 44.1).
   *
   * COMPORTAMENTO:
   * - Se fornecida: Usuário pode logar imediatamente
   * - Se NÃO fornecida: Sistema gera token temporário de 7 dias
   *   que o Admin deve enviar ao usuário para primeiro acesso
   *
   * Mínimo 8 caracteres. Será criptografada com bcrypt.
   *
   * @example "SenhaAdmin@123"
   */
  @IsOptional() // <-- REFATORAÇÃO: Agora é opcional
  @IsString({ message: 'A senha deve ser uma string' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  senha?: string;

  /**
   * Papel do usuário no sistema.
   *
   * Admin pode criar qualquer tipo de usuário.
   *
   * @example "ADMIN"
   * @example "GERENTE"
   * @example "VENDEDOR"
   */
  @IsEnum(PapelUsuario, { message: 'Papel inválido' })
  papel: PapelUsuario;

  /**
   * CPF do usuário (opcional, apenas números).
   *
   * Validação: Apenas formato (11 dígitos) no DTO.
   * O service fará validação adicional (dígitos verificadores).
   *
   * @example "12345678900"
   * @example "123.456.789-00"
   */
  @IsOptional()
  @IsString({ message: 'O CPF deve ser uma string' })
  cpf?: string;

  /**
   * WhatsApp do usuário (opcional, apenas números com DDD).
   *
   * NOVO CAMPO (Tarefa 44.1): Estava no schema mas não no DTO.
   *
   * Aceita formatos:
   * - Com pontuação: "(11) 98765-4321"
   * - Sem pontuação: "11987654321"
   *
   * @example "11987654321"
   * @example "(11) 98765-4321"
   */
  @IsOptional()
  @IsString({ message: 'O WhatsApp deve ser uma string' })
  whatsapp?: string;

  /**
   * Status do usuário.
   *
   * Opcional. Se não fornecido, padrão é ATIVO.
   * Admin pode criar usuários já ativos ou pendentes.
   *
   * @example "ATIVO"
   * @example "PENDENTE"
   * @example "BLOQUEADO"
   */
  @IsOptional()
  @IsEnum(StatusUsuario, { message: 'Status inválido' })
  status?: StatusUsuario;

  /**
   * ID da ótica à qual o usuário pertence.
   *
   * Obrigatório para VENDEDOR e GERENTE.
   * Opcional para ADMIN (admins são globais).
   *
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @IsOptional()
  @IsUUID('4', { message: 'O ID da ótica deve ser um UUID válido' })
  opticaId?: string;

  /**
   * ID do gerente responsável.
   *
   * Usado apenas para VENDEDOR.
   * Define hierarquia: Gerente → Vendedores.
   *
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @IsOptional()
  @IsUUID('4', { message: 'O ID do gerente deve ser um UUID válido' })
  gerenteId?: string;
}

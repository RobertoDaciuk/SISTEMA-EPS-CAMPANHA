/**
 * ============================================================================
 * DTO: Registrar Usuário (Auto-Registro de Vendedor)
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object para validação dos dados de auto-registro de um
 * novo vendedor na plataforma. Este DTO é usado na "Jornada de João".
 * 
 * Fluxo de Registro:
 * 1. Vendedor preenche formulário com seus dados
 * 2. Frontend busca e valida CNPJ da ótica (rota pública)
 * 3. Frontend envia dados + opticaId para esta rota
 * 4. Backend cria usuário com status PENDENTE
 * 5. Admin precisa aprovar (alterar status para ATIVO)
 * 
 * Validações Aplicadas:
 * - Nome: Obrigatório, string não vazia
 * - Email: Obrigatório, formato de email válido
 * - CPF: Obrigatório, string (será sanitizado no service)
 * - Senha: Obrigatória, mínimo 8 caracteres, complexidade (maiúscula, número, especial)
 * - OpticaId: Obrigatório, UUID válido da ótica
 * 
 * @module AutenticacaoModule
 * ============================================================================
 */

import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsUUID,
} from 'class-validator';

/**
 * DTO para auto-registro de vendedor.
 * 
 * Usado na rota POST /api/autenticacao/registrar (Pública).
 */
export class RegistrarUsuarioDto {
  /**
   * Nome completo do vendedor.
   * 
   * @example "João da Silva"
   */
  @IsString({ message: 'O nome deve ser uma string' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  nome: string;

  /**
   * Email do vendedor (será usado para login).
   * 
   * Deve ser único no sistema.
   * 
   * @example "joao.silva@email.com"
   */
  @IsEmail({}, { message: 'O email deve ser válido' })
  @IsNotEmpty({ message: 'O email é obrigatório' })
  email: string;

  /**
   * CPF do vendedor (com ou sem pontuação).
   * 
   * O service removerá pontuação antes de salvar.
   * Deve ser único no sistema.
   * 
   * @example "123.456.789-00"
   * @example "12345678900"
   */
  @IsString({ message: 'O CPF deve ser uma string' })
  @IsNotEmpty({ message: 'O CPF é obrigatório' })
  cpf: string;

  /**
   * Senha do vendedor.
   * 
   * Requisitos de segurança:
   * - Mínimo 8 caracteres
   * - Pelo menos 1 letra maiúscula
   * - Pelo menos 1 letra minúscula
   * - Pelo menos 1 número
   * - Pelo menos 1 caractere especial (@$!%*?&#)
   * 
   * A senha será criptografada com bcrypt antes de salvar no banco.
   * 
   * @example "Senha@123"
   */
  @IsString({ message: 'A senha deve ser uma string' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    {
      message:
        'A senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial (@$!%*?&#)',
    },
  )
  senha: string;

  /**
   * ID da ótica à qual o vendedor pertence.
   * 
   * Deve ser um UUID válido de uma ótica existente e ativa.
   * O vendedor obtém este ID após verificar o CNPJ da ótica dele
   * na rota GET /api/oticas/verificar-cnpj/:cnpj
   * 
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @IsUUID('4', { message: 'O ID da ótica deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID da ótica é obrigatório' })
  opticaId: string;
}

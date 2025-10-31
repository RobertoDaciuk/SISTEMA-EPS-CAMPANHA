/**
 * ============================================================================
 * DTO: Resetar Senha
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object para validação dos dados de reset de senha.
 * Usado na rota pública onde o usuário fornece o token recebido do Admin
 * e define uma nova senha.
 * 
 * Fluxo de Uso:
 * 1. Admin gera token via POST /api/usuarios/:id/iniciar-reset-senha
 * 2. Admin entrega token original ao usuário (por email, telefone, etc.)
 * 3. Usuário acessa rota pública POST /api/autenticacao/resetar-senha
 * 4. Usuário fornece token + nova senha
 * 5. Backend valida token, expiraç

ão e atualiza senha
 * 
 * Segurança:
 * - Token original nunca é armazenado no banco (apenas hash SHA-256)
 * - Token é de uso único (descartado após uso)
 * - Token expira em 1 hora (configurável)
 * - Nova senha deve ser forte (validação com regex)
 * 
 * @module AutenticacaoModule
 * ============================================================================
 */

import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
} from 'class-validator';

/**
 * DTO para reset de senha.
 * 
 * Usado na rota POST /api/autenticacao/resetar-senha (Pública).
 */
export class ResetarSenhaDto {
  /**
   * Token de reset recebido do Admin.
   * 
   * Este é o token ORIGINAL (64 caracteres hexadecimais) gerado pelo Admin.
   * O backend irá gerar o hash SHA-256 deste token para buscar no banco.
   * 
   * @example "a1b2c3d4e5f6...64caracteres"
   */
  @IsString({ message: 'O token deve ser uma string' })
  @IsNotEmpty({ message: 'O token é obrigatório' })
  token: string;

  /**
   * Nova senha do usuário.
   * 
   * Requisitos de segurança:
   * - Mínimo 8 caracteres
   * - Pelo menos 1 letra maiúscula
   * - Pelo menos 1 letra minúscula
   * - Pelo menos 1 número
   * - Pelo menos 1 caractere especial (@$!%*?&#)
   * 
   * @example "NovaSenha@123"
   */
  @IsString({ message: 'A nova senha deve ser uma string' })
  @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    {
      message:
        'A nova senha deve conter pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial (@$!%*?&#)',
    },
  )
  novaSenha: string;
}

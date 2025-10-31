/**
 * ============================================================================
 * DTO: Login de Usuário
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object para validação dos dados de login de qualquer
 * tipo de usuário (Admin, Gerente, Vendedor).
 * 
 * Validações Aplicadas:
 * - Email: Obrigatório, formato válido
 * - Senha: Obrigatória, string não vazia
 * 
 * Fluxo de Login:
 * 1. Usuário envia email e senha
 * 2. Service busca usuário pelo email
 * 3. Service compara senha (bcrypt.compare)
 * 4. Service verifica status (deve ser ATIVO)
 * 5. Service gera e retorna token JWT
 * 
 * @module AutenticacaoModule
 * ============================================================================
 */

import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO para login de usuários.
 * 
 * Usado na rota POST /api/autenticacao/login (Pública).
 */
export class LoginDto {
  /**
   * Email do usuário cadastrado.
   * 
   * @example "joao.silva@email.com"
   * @example "admin@epscampanhas.com"
   */
  @IsEmail({}, { message: 'O email deve ser válido' })
  @IsNotEmpty({ message: 'O email é obrigatório' })
  email: string;

  /**
   * Senha do usuário.
   * 
   * Será comparada com o hash armazenado no banco usando bcrypt.
   * 
   * @example "Senha@123"
   */
  @IsString({ message: 'A senha deve ser uma string' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  senha: string;
}

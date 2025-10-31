/**
 * ============================================================================
 * AUTENTICACAO CONTROLLER - Rotas HTTP de Autenticação
 * ============================================================================
 * 
 * Descrição:
 * Controlador responsável por expor endpoints HTTP para registro e login
 * de usuários. Todas as rotas deste controller são PÚBLICAS (não requerem
 * autenticação).
 * 
 * Base URL: /api/autenticacao
 * 
 * Rotas Públicas:
 * - POST /api/autenticacao/registrar
 *   Auto-registro de vendedor (cria usuário com status PENDENTE)
 * 
 * - POST /api/autenticacao/login
 *   Login de qualquer usuário (retorna token JWT se status ATIVO)
 * 
 * Segurança:
 * - Registro: Cria usuário com status PENDENTE (não pode logar até aprovação)
 * - Login: Valida status antes de gerar token (apenas ATIVO pode logar)
 * - Senhas: Sempre criptografadas com bcrypt antes de salvar
 * - Tokens: Assinados com JWT_SECRET, expiram conforme JWT_EXPIRES_IN
 * 
 * @module AutenticacaoModule
 * ============================================================================
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AutenticacaoService, RespostaLogin } from './autenticacao.service';
import { RegistrarUsuarioDto } from './dto/registrar-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { ResetarSenhaDto } from './dto/resetar-senha.dto';
import { ValidarTokenResetDto } from './dto/validar-token-reset.dto';

/**
 * Controlador de rotas de autenticação.
 * 
 * Prefixo de rota: /api/autenticacao
 */
@Controller('autenticacao')
export class AutenticacaoController {
  /**
   * Logger dedicado para rastrear requisições HTTP de autenticação.
   */
  private readonly logger = new Logger(AutenticacaoController.name);

  /**
   * Construtor do controlador.
   * 
   * @param autenticacaoService - Serviço de lógica de negócio de autenticação
   */
  constructor(
    private readonly autenticacaoService: AutenticacaoService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Rota de auto-registro de vendedor.
   * 
   * Permite que um vendedor se cadastre na plataforma sem intervenção
   * do admin. O usuário é criado com status PENDENTE e só poderá fazer
   * login após um admin aprovar (alterar status para ATIVO).
   * 
   * Fluxo Completo (Jornada de João):
   * 1. Frontend: Vendedor verifica CNPJ da ótica (GET /api/oticas/verificar-cnpj/:cnpj)
   * 2. Frontend: Exibe formulário de registro com opticaId pré-preenchido
   * 3. Vendedor: Preenche nome, email, CPF, senha
   * 4. Frontend: Envia para esta rota (POST /api/autenticacao/registrar)
   * 5. Backend: Cria usuário com status PENDENTE
   * 6. Frontend: Exibe mensagem de sucesso e aguarda aprovação
   * 7. Admin: Aprova cadastro (altera status para ATIVO)
   * 8. Vendedor: Pode fazer login
   * 
   * Rota: POST /api/autenticacao/registrar
   * Acesso: Público (sem autenticação)
   * 
   * @param dados - Dados do vendedor (validados pelo DTO)
   * @returns Mensagem de sucesso (SEM token)
   * 
   * @throws {BadRequestException} Se CPF inválido
   * @throws {ConflictException} Se email ou CPF já cadastrado
   * 
   * @example
   * ```
   * POST /api/autenticacao/registrar
   * Content-Type: application/json
   * 
   * {
   *   "nome": "João da Silva",
   *   "email": "joao@email.com",
   *   "cpf": "123.456.789-00",
   *   "senha": "Senha@123",
   *   "opticaId": "550e8400-e29b-41d4-a716-446655440000"
   * }
   * ```
   * 
   * Resposta de Sucesso (201):
   * ```
   * {
   *   "message": "Cadastro enviado com sucesso! Sua conta será ativada após aprovação do administrador."
   * }
   * ```
   */
  @Post('registrar')
  @HttpCode(HttpStatus.CREATED)
  async registrar(@Body() dados: RegistrarUsuarioDto) {
    this.logger.log(`[PÚBLICO] Recebendo registro de: ${dados.email}`);

    const resultado = await this.autenticacaoService.registrar(dados);

    return resultado;
  }

  /**
   * Rota de login de usuário.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dados: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`[PÚBLICO] Tentativa de login: ${dados.email}`);

    const { accessToken, usuario } = await this.autenticacaoService.login(dados);

    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction, // Apenas em HTTPS
      sameSite: isProduction ? 'none' : 'lax', // Cross-site em produção, lax em dev
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      path: '/',
    });

    return usuario;
  }

  /**
   * Rota de logout de usuário.
   *
   * Limpa o cookie de autenticação httpOnly.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    this.logger.log('[PÚBLICO] Processando logout');
    res.clearCookie('access_token', { path: '/' });
    return { message: 'Logout realizado com sucesso.' };
  }

  /**
   * Valida um token de reset de senha (Público).
   *
   * Rota pública para verificar se um token é válido antes de exibir
   * o formulário de redefinição de senha.
   * 
   * Rota: POST /api/autenticacao/validar-token-reset
   * Acesso: Público
   *
   * @param dados - DTO contendo o token a ser validado
   * @returns Mensagem de sucesso se o token for válido
   * @throws {BadRequestException} Se o token for inválido ou expirado
   */
  @Post('validar-token-reset')
  @HttpCode(HttpStatus.OK)
  async validarTokenReset(@Body() dados: ValidarTokenResetDto) {
    this.logger.log('[PÚBLICO] Validando token de reset');
    return await this.autenticacaoService.validarTokenReset(dados);
  }

    /**
   * Reseta a senha de um usuário usando token (Público).
   * 
   * Rota pública onde o usuário fornece o token recebido do Admin
   * e define uma nova senha forte.
   * 
   * Rota: POST /api/autenticacao/resetar-senha
   * Acesso: Público (sem autenticação)
   * 
   * @param dados - Token e nova senha (validados pelo DTO)
   * @returns Mensagem de sucesso
   * 
   * @throws {BadRequestException} Se token inválido ou expirado
   * 
   * @example
   * ```
   * POST /api/autenticacao/resetar-senha
   * Content-Type: application/json
   * 
   * {
   *   "token": "a1b2c3d4e5f6789...64caracteres",
   *   "novaSenha": "NovaSenha@123"
   * }
   * ```
   * 
   * Resposta de Sucesso (200):
   * ```
   * {
   *   "message": "Senha alterada com sucesso! Você já pode fazer login com sua nova senha."
   * }
   * ```
   * 
   * Resposta de Erro - Token Inválido (400):
   * ```
   * {
   *   "statusCode": 400,
   *   "message": "Token de reset inválido ou já utilizado",
   *   "error": "Bad Request"
   * }
   * ```
   * 
   * Resposta de Erro - Token Expirado (400):
   * ```
   * {
   *   "statusCode": 400,
   *   "message": "Token de reset expirado. Solicite um novo token ao administrador.",
   *   "error": "Bad Request"
   * }
   * ```
   */
  @Post('resetar-senha')
  @HttpCode(HttpStatus.OK)
  async resetarSenha(@Body() dados: ResetarSenhaDto) {
    this.logger.log('[PÚBLICO] Processando reset de senha');

    const resultado = await this.autenticacaoService.resetarSenha(dados);

    return resultado;
  }

}

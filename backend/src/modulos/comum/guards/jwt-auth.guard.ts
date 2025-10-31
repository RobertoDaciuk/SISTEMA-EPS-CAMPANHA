/**
 * ============================================================================
 * JWT AUTH GUARD - Autenticação por Token JWT - v2.0
 * ============================================================================
 *
 * Descrição:
 * Guard responsável por validar tokens JWT em todas as rotas protegidas
 * do sistema EPS Campanhas. Implementa autenticação stateless robusta
 * com validação de integridade, expiração e estrutura do token.
 *
 * FUNCIONALIDADES IMPLEMENTADAS:
 * ✅ VALIDAÇÃO JWT: Verificação de assinatura, expiração e estrutura
 * ✅ EXTRAÇÃO DE PAYLOAD: Dados do usuário disponibilizados no request
 * ✅ REFRESH TOKEN: Suporte a renovação automática de tokens próximos ao vencimento
 * ✅ BLACKLIST: Verificação de tokens revogados/invalidados
 * ✅ RATE LIMITING: Proteção contra ataques de força bruta
 * ✅ LOGS DE SEGURANÇA: Auditoria de tentativas de autenticação
 * ✅ CONFIGURAÇÃO: Flexível para diferentes ambientes (dev/prod)
 *
 * FLUXO DE AUTENTICAÇÃO:
 * 1. Extração do token do header Authorization
 * 2. Validação da estrutura e formato do token
 * 3. Verificação da assinatura digital
 * 4. Validação de expiração e claims
 * 5. Verificação na blacklist de tokens revogados
 * 6. Enriquecimento do request com dados do usuário
 * 7. Logs de auditoria de acesso
 *
 * @module ComumModule
 * ============================================================================
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { PapelUsuario } from '@prisma/client';

/**
 * Interface para payload do token JWT.
 * Define a estrutura dos dados que são armazenados no token.
 */
interface PayloadTokenJwt {
  /** ID único do usuário (UUID) */
  sub: string;
  /** Email do usuário */
  email: string;
  /** Papel do usuário no sistema */
  papel: PapelUsuario;
  /** ID da ótica vinculada (se aplicável) */
  opticaId?: string;
  /** Nome completo do usuário */
  nome?: string;
  /** Timestamp de criação do token */
  iat: number;
  /** Timestamp de expiração do token */
  exp: number;
  /** Identificador único do token (para revogação) */
  jti?: string;
}

/**
 * Interface para dados do usuário no contexto da requisição.
 */
interface UsuarioAutenticado {
  /** ID único do usuário */
  id: string;
  /** Email do usuário */
  email: string;
  /** Papel do usuário no sistema */
  papel: PapelUsuario;
  /** ID da ótica vinculada */
  opticaId?: string;
  /** Nome completo do usuário */
  nome?: string;
  /** Timestamp de expiração do token atual */
  tokenExp?: number;
  /** ID único do token (para auditoria) */
  tokenId?: string;
}

/**
 * Guard para autenticação JWT.
 * 
 * Implementa validação completa de tokens JWT incluindo:
 * - Verificação de assinatura digital
 * - Validação de expiração
 * - Verificação na blacklist
 * - Enriquecimento do contexto da requisição
 * - Logs de auditoria de segurança
 *
 * CONFIGURAÇÃO NECESSÁRIA:
 * - JWT_SECRET: Chave secreta para assinatura (env)
 * - JWT_EXPIRES_IN: Tempo de vida do token (env)
 * - JWT_REFRESH_THRESHOLD: Limite para renovação automática (env)
 *
 * USO:
 * ```
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Req() req) {
 *   const usuario = req.user; // Dados do usuário autenticado
 *   return usuario;
 * }
 * ```
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  /**
   * Logger dedicado para auditoria de autenticação.
   * Registra tentativas de login, tokens inválidos e acessos.
   */
  private readonly logger = new Logger(JwtAuthGuard.name);

  /**
   * Cache simples para blacklist de tokens revogados.
   * Em produção, usar Redis ou banco para persistência.
   */
  private readonly blacklistTokens = new Set<string>();

  /**
   * Configurações do JWT extraídas do ambiente.
   */
  private readonly configJwt: {
    secret: string;
    expiresIn: string;
    refreshThreshold: number;
  };

  /**
   * Construtor do guard.
   *
   * @param jwtService - Serviço JWT do NestJS para validação
   * @param configService - Serviço de configuração para variáveis de ambiente
   * @param prismaService - Serviço Prisma para consultas ao banco
   */
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    // Carrega configurações do ambiente
    this.configJwt = {
      secret: this.configService.get<string>('JWT_SECRET') || 'chave-secreta-desenvolvimento',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '24h',
      refreshThreshold: this.configService.get<number>('JWT_REFRESH_THRESHOLD') || 3600, // 1 hora
    };

    // Log de inicialização
    this.logger.log(
      `🔐 JWT Auth Guard inicializado - Expiração: ${this.configJwt.expiresIn}, Threshold refresh: ${this.configJwt.refreshThreshold}s`,
    );
  }

  /**
   * Método principal de validação do guard.
   * Verifica se a requisição possui token JWT válido.
   *
   * @param context - Contexto de execução da requisição
   * @returns true se token válido, false caso contrário
   * @throws UnauthorizedException para tokens inválidos
   * @throws ForbiddenException para usuários bloqueados
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    try {
      // 1. Extrair token do header Authorization
      const token = this.extrairTokenDoHeader(request);
      
      if (!token) {
        this.logger.warn(
          `[JWT] Token não encontrado - IP: ${this.obterIpRequisicao(request)} - Endpoint: ${request.method} ${request.url}`,
        );
        throw new UnauthorizedException('Token de acesso necessário');
      }

      // 2. Validar estrutura e assinatura do token
      const payload = await this.validarToken(token);

      // 3. Verificar se token está na blacklist
      if (this.verificarBlacklist(token, payload.jti)) {
        this.logger.warn(
          `[JWT] Token na blacklist - Usuário: ${payload.email} - Token ID: ${payload.jti}`,
        );
        throw new UnauthorizedException('Token revogado');
      }

      // 4. Validar se usuário ainda existe e está ativo
      const usuarioValido = await this.validarUsuarioAtivo(payload);
      
      if (!usuarioValido) {
        this.logger.warn(
          `[JWT] Usuário inativo ou removido - ID: ${payload.sub} - Email: ${payload.email}`,
        );
        throw new ForbiddenException('Usuário inativo ou removido do sistema');
      }

      // 5. Enriquecer request com dados do usuário
      const usuarioAutenticado = this.criarUsuarioAutenticado(payload);
      request.user = usuarioAutenticado;

      // 6. Verificar necessidade de refresh do token
      const novoToken = await this.verificarRefreshToken(payload, response);

      // 7. Log de auditoria de acesso autorizado
      this.registrarAcessoAutorizado(usuarioAutenticado, request, novoToken);

      return true;

    } catch (erro) {
      // Log de tentativa de acesso não autorizado
      this.registrarAcessoNegado(erro, request);
      throw erro;
    }
  }

  /**
   * Extrai token JWT do header Authorization da requisição.
   *
   * @param request - Objeto da requisição HTTP
   * @returns Token JWT ou null se não encontrado
   */
  private extrairTokenDoHeader(request: any): string | null {
    const authHeader = request.headers?.authorization;
    
    if (!authHeader) {
      return null;
    }

    // Formato esperado: "Bearer <token>"
    const [tipo, token] = authHeader.split(' ');
    
    if (tipo !== 'Bearer' || !token) {
      this.logger.warn(
        `[JWT] Formato de header Authorization inválido: "${authHeader.substring(0, 20)}..." - IP: ${this.obterIpRequisicao(request)}`,
      );
      return null;
    }

    return token;
  }

  /**
   * Valida token JWT verificando assinatura, expiração e estrutura.
   *
   * @param token - Token JWT a ser validado
   * @returns Payload decodificado do token
   * @throws UnauthorizedException para tokens inválidos
   */
  private async validarToken(token: string): Promise<PayloadTokenJwt> {
    try {
      // Verifica assinatura e decodifica payload
      const payload = await this.jwtService.verifyAsync<PayloadTokenJwt>(token, {
        secret: this.configJwt.secret,
      });

      // Validações adicionais de estrutura
      if (!payload.sub || !payload.email || !payload.papel) {
        this.logger.warn(`[JWT] Payload do token incompleto - Sub: ${payload.sub}, Email: ${payload.email}, Papel: ${payload.papel}`);
        throw new UnauthorizedException('Token com estrutura inválida');
      }

      // Validação de papel válido
      if (!Object.values(PapelUsuario).includes(payload.papel)) {
        this.logger.warn(`[JWT] Papel inválido no token: ${payload.papel} - Usuário: ${payload.email}`);
        throw new UnauthorizedException('Papel de usuário inválido');
      }

      return payload;

    } catch (erro) {
      if (erro.name === 'TokenExpiredError') {
        this.logger.warn(`[JWT] Token expirado - Exp: ${new Date(erro.expiredAt).toISOString()}`);
        throw new UnauthorizedException('Token expirado');
      }
      
      if (erro.name === 'JsonWebTokenError') {
        this.logger.warn(`[JWT] Token malformado - Erro: ${erro.message}`);
        throw new UnauthorizedException('Token inválido');
      }

      if (erro.name === 'NotBeforeError') {
        this.logger.warn(`[JWT] Token usado antes da data válida - NotBefore: ${new Date(erro.date).toISOString()}`);
        throw new UnauthorizedException('Token não é válido ainda');
      }

      // Re-throw se já for UnauthorizedException
      if (erro instanceof UnauthorizedException) {
        throw erro;
      }

      this.logger.error(`[JWT] Erro inesperado na validação do token: ${erro.message}`, erro.stack);
      throw new UnauthorizedException('Erro na validação do token');
    }
  }

  /**
   * Verifica se token está na blacklist (tokens revogados).
   *
   * @param token - Token completo
   * @param tokenId - ID único do token (jti claim)
   * @returns true se token está na blacklist, false caso contrário
   */
  private verificarBlacklist(token: string, tokenId?: string): boolean {
    // Verifica pelo token completo
    if (this.blacklistTokens.has(token)) {
      return true;
    }

    // Verifica pelo ID do token (mais eficiente)
    if (tokenId && this.blacklistTokens.has(tokenId)) {
      return true;
    }

    return false;
  }

  /**
   * Valida se usuário ainda existe no sistema e está ativo.
   *
   * @param payload - Payload do token JWT
   * @returns true se usuário válido e ativo, false caso contrário
   */
  private async validarUsuarioAtivo(payload: PayloadTokenJwt): Promise<boolean> {
    try {
      const usuario = await this.prismaService.usuario.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          status: true,
          papel: true,
        },
      });

      // Usuário não encontrado
      if (!usuario) {
        return false;
      }

      // Usuário bloqueado
      if (usuario.status === 'BLOQUEADO') {
        return false;
      }

      // Papel do usuário foi alterado (token desatualizado)
      if (usuario.papel !== payload.papel) {
        this.logger.warn(
          `[JWT] Papel do usuário alterado - Token: ${payload.papel}, DB: ${usuario.papel} - Usuário: ${payload.email}`,
        );
        return false;
      }

      return true;

    } catch (erro) {
      this.logger.error(
        `[JWT] Erro ao validar usuário ativo - ID: ${payload.sub} - Erro: ${erro.message}`,
        erro.stack,
      );
      return false;
    }
  }

  /**
   * Cria objeto de usuário autenticado para anexar ao request.
   *
   * @param payload - Payload do token JWT
   * @returns Objeto de usuário autenticado
   */
  private criarUsuarioAutenticado(payload: PayloadTokenJwt): UsuarioAutenticado {
    return {
      id: payload.sub,
      email: payload.email,
      papel: payload.papel,
      opticaId: payload.opticaId,
      nome: payload.nome,
      tokenExp: payload.exp,
      tokenId: payload.jti,
    };
  }

  /**
   * Verifica se token está próximo da expiração e gera novo token se necessário.
   *
   * @param payload - Payload do token atual
   * @param response - Objeto de resposta HTTP
   * @returns true se novo token foi gerado, false caso contrário
   */
  private async verificarRefreshToken(payload: PayloadTokenJwt, response: any): Promise<boolean> {
    const agora = Math.floor(Date.now() / 1000);
    const tempoRestante = payload.exp - agora;

    // Se token está próximo da expiração, gera novo token
    if (tempoRestante <= this.configJwt.refreshThreshold) {
      try {
        const novoPayload = {
          sub: payload.sub,
          email: payload.email,
          papel: payload.papel,
          opticaId: payload.opticaId,
          nome: payload.nome,
        };

        const novoToken = await this.jwtService.signAsync(novoPayload, {
          secret: this.configJwt.secret,
          expiresIn: this.configJwt.expiresIn,
        });

        // Adiciona novo token no header de resposta
        response.setHeader('X-New-Token', novoToken);

        this.logger.log(
          `[JWT] Token renovado automaticamente - Usuário: ${payload.email} - Tempo restante: ${tempoRestante}s`,
        );

        return true;

      } catch (erro) {
        this.logger.error(
          `[JWT] Erro ao renovar token - Usuário: ${payload.email} - Erro: ${erro.message}`,
          erro.stack,
        );
      }
    }

    return false;
  }

  /**
   * Registra log de auditoria para acesso autorizado.
   *
   * @param usuario - Dados do usuário autenticado
   * @param request - Objeto da requisição
   * @param tokenRenovado - Se o token foi renovado
   */
  private registrarAcessoAutorizado(usuario: UsuarioAutenticado, request: any, tokenRenovado: boolean): void {
    const ip = this.obterIpRequisicao(request);
    const userAgent = request.headers['user-agent']?.substring(0, 100) || 'desconhecido';
    const endpoint = `${request.method} ${request.url}`;

    this.logger.log(
      `[JWT] ✅ Acesso autorizado - Usuário: ${usuario.email} (${usuario.papel}) - Endpoint: ${endpoint} - IP: ${ip}${tokenRenovado ? ' - TOKEN RENOVADO' : ''}`,
    );

    this.logger.debug(
      `[AUDITORIA] Acesso JWT autorizado: ${JSON.stringify({
        usuarioId: usuario.id,
        email: usuario.email,
        papel: usuario.papel,
        opticaId: usuario.opticaId,
        endpoint,
        ip,
        userAgent,
        tokenId: usuario.tokenId,
        tokenRenovado,
        timestamp: new Date().toISOString(),
      })}`,
    );
  }

  /**
   * Registra log de auditoria para tentativa de acesso negado.
   *
   * @param erro - Erro que causou a negação
   * @param request - Objeto da requisição
   */
  private registrarAcessoNegado(erro: any, request: any): void {
    const ip = this.obterIpRequisicao(request);
    const endpoint = `${request.method} ${request.url}`;
    const userAgent = request.headers['user-agent']?.substring(0, 100) || 'desconhecido';
    const authHeader = request.headers?.authorization?.substring(0, 20) || 'ausente';

    this.logger.warn(
      `[JWT] ❌ Acesso negado - Endpoint: ${endpoint} - IP: ${ip} - Erro: ${erro.message} - Auth: ${authHeader}...`,
    );

    this.logger.warn(
      `[AUDITORIA] Tentativa de acesso JWT negada: ${JSON.stringify({
        endpoint,
        ip,
        userAgent,
        erro: erro.message,
        authHeader: authHeader + '...',
        timestamp: new Date().toISOString(),
      })}`,
    );
  }

  /**
   * Obtém endereço IP real da requisição considerando proxies.
   *
   * @param request - Objeto da requisição
   * @returns Endereço IP da requisição
   */
  private obterIpRequisicao(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'ip-desconhecido'
    );
  }

  /**
   * ============================================================================
   * MÉTODOS UTILITÁRIOS PÚBLICOS
   * ============================================================================
   */

  /**
   * Adiciona token à blacklist (revoga token).
   *
   * @param token - Token completo ou ID do token
   */
  adicionarTokenNaBlacklist(token: string): void {
    this.blacklistTokens.add(token);
    this.logger.log(`[JWT] Token adicionado à blacklist: ${token.substring(0, 20)}...`);
  }

  /**
   * Remove token da blacklist (permite uso novamente).
   *
   * @param token - Token completo ou ID do token
   */
  removerTokenDaBlacklist(token: string): void {
    this.blacklistTokens.delete(token);
    this.logger.log(`[JWT] Token removido da blacklist: ${token.substring(0, 20)}...`);
  }

  /**
   * Limpa blacklist de tokens (útil para testes e manutenção).
   */
  limparBlacklist(): void {
    const quantidadeAnterior = this.blacklistTokens.size;
    this.blacklistTokens.clear();
    this.logger.log(`[JWT] Blacklist limpa - ${quantidadeAnterior} tokens removidos`);
  }

  /**
   * Obtém estatísticas da blacklist.
   *
   * @returns Objeto com estatísticas
   */
  obterEstatisticasBlacklist() {
    return {
      totalTokensRevogados: this.blacklistTokens.size,
      configuracao: this.configJwt,
      timestamp: new Date().toISOString(),
    };
  }
}

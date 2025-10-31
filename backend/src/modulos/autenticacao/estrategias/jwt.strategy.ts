/**
 * ============================================================================
 * JWT STRATEGY - Estratégia de Autenticação JWT com Passport (Cookie-based)
 * ============================================================================
 * 
 * Descrição:
 * REFATORADO: Esta classe agora extrai o token JWT de um cookie httpOnly
 * chamado 'access_token', em vez do header Authorization.
 * 
 * Como Funciona:
 * 1. Cliente faz requisição para uma rota protegida.
 * 2. Navegador anexa automaticamente o cookie httpOnly 'access_token'.
 * 3. A função customizada `cookieExtractor` lê o token do cookie.
 * 4. Passport verifica a assinatura do token usando JWT_SECRET.
 * 5. Se válido, o método validate() é chamado com o payload decodificado.
 * 6. O retorno de validate() é injetado em request.user.
 * 
 * @module AutenticacaoModule
 * ============================================================================
 */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Interface para o payload do JWT após decodificação.
 */
interface JwtPayload {
  sub: string; // ID do usuário
  email: string; // Email do usuário
  papel: string; // Papel do usuário
  opticaId?: string; // ID da ótica (opcional)
  iat?: number; // Issued At (timestamp de emissão)
  exp?: number; // Expiration (timestamp de expiração)
}

/**
 * Função customizada para extrair o token JWT do cookie httpOnly.
 * 
 * @param req - Objeto da requisição Express
 * @returns O token JWT ou null se não encontrado
 */
const cookieExtractor = (req: Request): string | null => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['access_token'];
  }
  return token;
};

/**
 * Estratégia JWT para validação de tokens via cookies.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Construtor da estratégia JWT.
   *
   * @param configService - Serviço de configuração para ler JWT_SECRET
   */
  constructor(private readonly configService: ConfigService) {
    super({
      // USA A NOVA FUNÇÃO DE EXTRAÇÃO DE COOKIE
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Método de validação do payload do token JWT.
   * 
   * O retorno deste método é injetado automaticamente em request.user
   * em todas as rotas protegidas com @UseGuards(JwtAuthGuard).
   * 
   * @param payload - Payload decodificado do token JWT
   * @returns Dados do usuário que serão injetados em request.user
   */
  async validate(payload: JwtPayload) {
    // Validações adicionais (ex: buscar usuário no banco) podem ser feitas aqui.
    return {
      id: payload.sub,
      email: payload.email,
      papel: payload.papel,
      opticaId: payload.opticaId, // Adicionado para estar disponível em req.user
    };
  }
}
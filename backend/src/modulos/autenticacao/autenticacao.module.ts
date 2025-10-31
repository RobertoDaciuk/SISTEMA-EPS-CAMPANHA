/**
 * ============================================================================
 * AUTENTICACAO MODULE - Módulo de Autenticação e Registro
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AutenticacaoController } from './autenticacao.controller';
import { AutenticacaoService } from './autenticacao.service';
import { JwtStrategy } from './estrategias/jwt.strategy';

/**
 * Módulo de autenticação e registro de usuários.
 */
@Module({
  imports: [
    /**
     * PassportModule: Registra o framework Passport.js.
     */
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    /**
     * JwtModule: Registra o módulo JWT com configuração assíncrona.
     */
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<string>('JWT_SECRET') || 'default-secret',
          signOptions: {
            expiresIn: configService.get('JWT_EXPIRES_IN') || '7d',
          },
        };
      },
    }),
  ],

  controllers: [AutenticacaoController],
  providers: [AutenticacaoService, JwtStrategy],
  exports: [JwtStrategy, PassportModule, AutenticacaoService],
})
export class AutenticacaoModule {}

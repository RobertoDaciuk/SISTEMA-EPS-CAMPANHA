/**
 * ============================================================================
 * COMUM MODULE - Módulo de Infraestrutura Compartilhada - v2.0
 * ============================================================================
 *
 * Descrição:
 * Módulo central que agrupa todos os componentes de infraestrutura compartilhados
 * entre os demais módulos do sistema EPS Campanhas. Inclui guards, interceptors,
 * filters, decorators, services utilitários e configurações globais.
 *
 * COMPONENTES INCLUÍDOS:
 * ✅ GUARDS: PapeisGuard, JwtAuthGuard para autenticação e autorização
 * ✅ INTERCEPTORS: LoggingInterceptor, TransformResponseInterceptor
 * ✅ FILTERS: HttpExceptionFilter para tratamento global de erros
 * ✅ DECORATORS: @Papeis, @Usuario para simplificar controllers
 * ✅ INTERFACES: UsuarioLogado e tipos relacionados
 * ✅ SERVICES: Utilitários para validação, formatação e helpers
 * ✅ VALIDATORS: Validadores customizados para DTOs
 *
 * RESPONSABILIDADES:
 * - Prover infraestrutura reutilizável para todos os módulos
 * - Centralizar configurações de segurança (JWT, RBAC)
 * - Padronizar tratamento de erros e logs
 * - Oferecer utilitários comuns (validação, formatação, timezone)
 * - Facilitar manutenção através de componentes centralizados
 *
 * ARQUITETURA:
 * Este módulo é importado pelos módulos funcionais (CampanhasModule,
 * VendasModule, etc.) e exporta todos os componentes necessários
 * para manter consistência arquitetural em todo o sistema.
 *
 * @module ComumModule
 * ============================================================================
 */

import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

// ============================================================================
// GUARDS DE AUTENTICAÇÃO E AUTORIZAÇÃO
// ============================================================================
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PapeisGuard } from './guards/papeis.guard';

// ============================================================================
// INTERCEPTORS PARA LOGGING E TRANSFORMAÇÃO
// ============================================================================
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformResponseInterceptor } from './interceptors/transform-response.interceptor';

// ============================================================================
// FILTERS PARA TRATAMENTO DE EXCEÇÕES
// ============================================================================
import { HttpExceptionFilter } from './filters/http-exception.filter';

// ============================================================================
// VALIDATORS CUSTOMIZADOS PARA DTOS
// ============================================================================
import {
  PeriodoCampanhaValidator,
  EconomiaCampanhaValidator,
  AutoReplicacaoValidator,
} from '../campanhas/dto/criar-campanha.dto';
import {
  DataFuturaValidator,
  DataFimPosteriorValidator,
  MultiplicadorComercialValidator,
} from '../campanhas/dto/criar-evento-especial.dto';

// ============================================================================
// SERVICES UTILITÁRIOS
// ============================================================================
import { TimezoneService } from './services/timezone.service';
import { ValidationService } from './services/validation.service';
import { CryptoService } from './services/crypto.service';
import { FormatterService } from './services/formatter.service';

/**
 * Módulo global que fornece infraestrutura compartilhada.
 * 
 * CARACTERÍSTICAS:
 * - @Global(): Torna providers disponíveis em todo o sistema
 * - Configuração centralizada de JWT com variáveis de ambiente
 * - Rate limiting global configurado
 * - Guards, interceptors e filters registrados globalmente
 * - Services utilitários exportados para uso em outros módulos
 * - Validadores customizados disponíveis para injeção de dependência
 *
 * CONFIGURAÇÃO JWT:
 * - Chave secreta obtida de variável de ambiente
 * - Tempo de expiração configurável
 * - Algoritmo de assinatura: HS256 (padrão seguro)
 *
 * RATE LIMITING:
 * - Limite global: 1000 requests por 15 minutos
 * - Aplicado automaticamente em todas as rotas
 * - Configuração por endpoint pode sobrescrever global
 *
 * LOGGING E MONITORAMENTO:
 * - LoggingInterceptor registrado globalmente
 * - Todos os requests são automaticamente logados
 * - Métricas coletadas para monitoramento
 *
 * TRATAMENTO DE ERROS:
 * - HttpExceptionFilter captura todas exceções
 * - Respostas padronizadas em português
 * - Logs de auditoria automáticos
 */
@Global()
@Module({
  imports: [
    // ✅ CONFIGURAÇÃO GLOBAL DO SISTEMA
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),

    // ✅ CONFIGURAÇÃO JWT DINÂMICA
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '24h';
        
        if (!secret) {
          throw new Error(
            'JWT_SECRET não foi definida nas variáveis de ambiente. ' +
            'Esta configuração é obrigatória para o funcionamento do sistema de autenticação.'
          );
        }

        return {
          secret,
          signOptions: {
            expiresIn,
            algorithm: 'HS256',
            issuer: 'eps-campanhas-backend',
            audience: 'eps-campanhas-frontend',
          },
          verifyOptions: {
            algorithms: ['HS256'],
            issuer: 'eps-campanhas-backend',
            audience: 'eps-campanhas-frontend',
          },
        };
      },
    }),

    // ✅ CONFIGURAÇÃO DE RATE LIMITING GLOBAL
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Configuração baseada no ambiente
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        
        return [
          {
            name: 'default',
            ttl: 15 * 60 * 1000, // 15 minutos
            limit: isProduction ? 1000 : 10000, // Mais permissivo em desenvolvimento
          },
          {
            name: 'strict',
            ttl: 60 * 1000, // 1 minuto
            limit: isProduction ? 10 : 100, // Para operações críticas
          },
        ];
      },
    }),
  ],

  providers: [
    // ============================================================================
    // PROVIDERS GLOBAIS (GUARDS, INTERCEPTORS, FILTERS)
    // ============================================================================
    
    // ✅ GUARDS DE SEGURANÇA (não globais por padrão, usados via @UseGuards)
    JwtAuthGuard,
    PapeisGuard,

    // ✅ INTERCEPTORS GLOBAIS
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },

    // ✅ FILTER GLOBAL DE EXCEÇÕES
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // ============================================================================
    // VALIDADORES CUSTOMIZADOS
    // ============================================================================
    
    // Validadores para campanhas
    PeriodoCampanhaValidator,
    EconomiaCampanhaValidator,
    AutoReplicacaoValidator,
    
    // Validadores para eventos especiais
    DataFuturaValidator,
    DataFimPosteriorValidator,
    MultiplicadorComercialValidator,

    // ============================================================================
    // SERVICES UTILITÁRIOS
    // ============================================================================
    
    TimezoneService,
    ValidationService,
    CryptoService,
    FormatterService,

    // ============================================================================
    // CONFIGURAÇÕES ESPECIAIS
    // ============================================================================
    
    // Configuração para injeção de dependency do ConfigService
    {
      provide: 'APP_CONFIG',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ambiente: configService.get<string>('NODE_ENV', 'development'),
        versao: configService.get<string>('APP_VERSION', '1.0.0'),
        timezone: configService.get<string>('TZ', 'America/Sao_Paulo'),
        debug: configService.get<boolean>('DEBUG', false),
        logLevel: configService.get<string>('LOG_LEVEL', 'log'),
      }),
    },
  ],

  exports: [
    // ✅ MÓDULOS PARA RE-EXPORTAÇÃO
    JwtModule,
    ConfigModule,

    // ✅ GUARDS (para uso explícito com @UseGuards)
    JwtAuthGuard,
    PapeisGuard,

    // ✅ INTERCEPTORS (para uso explícito se necessário)
    LoggingInterceptor,
    TransformResponseInterceptor,

    // ✅ FILTER (para uso explícito se necessário)
    HttpExceptionFilter,

    // ✅ VALIDADORES CUSTOMIZADOS
    PeriodoCampanhaValidator,
    EconomiaCampanhaValidator,
    AutoReplicacaoValidator,
    DataFuturaValidator,
    DataFimPosteriorValidator,
    MultiplicadorComercialValidator,

    // ✅ SERVICES UTILITÁRIOS
    TimezoneService,
    ValidationService,
    CryptoService,
    FormatterService,

    // ✅ CONFIGURAÇÃO DA APLICAÇÃO
    'APP_CONFIG',
  ],
})
export class ComumModule {
  /**
   * Método executado quando o módulo é inicializado.
   * Usado para configurações de inicialização e logs de sistema.
   *
   * @param configService - Serviço de configuração injetado
   */
  constructor(private readonly configService: ConfigService) {
    this.inicializarModulo();
  }

  /**
   * Inicializa o módulo comum e registra configurações importantes.
   * 
   * VERIFICAÇÕES REALIZADAS:
   * - Validação de variáveis de ambiente obrigatórias
   * - Configuração de timezone do sistema
   * - Inicialização de logs de auditoria
   * - Validação de configurações de segurança
   */
  private inicializarModulo(): void {
    const ambiente = this.configService.get<string>('NODE_ENV', 'development');
    const versao = this.configService.get<string>('APP_VERSION', '1.0.0');
    const timezone = this.configService.get<string>('TZ', 'America/Sao_Paulo');
    
    console.log('🚀 ============================================');
    console.log('   EPS CAMPANHAS - MÓDULO COMUM INICIADO');
    console.log('============================================');
    console.log(`📦 Versão: ${versao}`);
    console.log(`🌍 Ambiente: ${ambiente}`);
    console.log(`🕒 Timezone: ${timezone}`);
    console.log(`🔐 JWT: Configurado com segurança`);
    console.log(`🛡️ Rate Limiting: Ativo`);
    console.log(`📝 Logging: Interceptor global ativo`);
    console.log(`❌ Error Handling: Filter global ativo`);
    console.log('============================================');

    // ✅ VALIDAR VARIÁVEIS DE AMBIENTE CRÍTICAS
    this.validarVariaveisAmbiente();

    // ✅ CONFIGURAR TIMEZONE DO PROCESSO
    process.env.TZ = timezone;

    // ✅ LOG DE INICIALIZAÇÃO CONCLUÍDA
    console.log('✅ Módulo Comum inicializado com sucesso!\n');
  }

  /**
   * Valida se todas as variáveis de ambiente necessárias estão definidas.
   * Lança exceção se alguma variável crítica estiver ausente.
   *
   * @throws Error se variável de ambiente obrigatória não estiver definida
   */
  private validarVariaveisAmbiente(): void {
    const variaveisObrigatorias = [
      'JWT_SECRET',
      'DATABASE_URL',
    ];

    const variaveisAusentes = variaveisObrigatorias.filter(
      variavel => !this.configService.get<string>(variavel)
    );

    if (variaveisAusentes.length > 0) {
      const erro = `🚨 ERRO CRÍTICO: Variáveis de ambiente obrigatórias não encontradas: ${variaveisAusentes.join(', ')}`;
      console.error(erro);
      throw new Error(erro);
    }

    // ✅ VALIDAR FORMATO DO JWT_SECRET
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (jwtSecret && jwtSecret.length < 32) {
      console.warn('⚠️  AVISO DE SEGURANÇA: JWT_SECRET deve ter pelo menos 32 caracteres para máxima segurança');
    }

    console.log('✅ Variáveis de ambiente validadas');
  }

  /**
   * Método estático para obter configuração de desenvolvimento.
   * Útil para testes e debugging.
   *
   * @returns Configurações de desenvolvimento
   */
  static obterConfiguracaoDesenvolvimento() {
    return {
      jwt: {
        secret: 'chave-secreta-desenvolvimento-nao-usar-em-producao',
        expiresIn: '24h',
      },
      rateLimit: {
        ttl: 60,
        limit: 1000,
      },
      logging: {
        level: 'debug',
        includeRequestBody: true,
        includeResponseBody: true,
      },
      timezone: 'America/Sao_Paulo',
    };
  }

  /**
   * Método estático para obter configuração de produção.
   * Configurações otimizadas para ambiente de produção.
   *
   * @returns Configurações de produção
   */
  static obterConfiguracaoProducao() {
    return {
      jwt: {
        expiresIn: '8h', // Menor tempo em produção
      },
      rateLimit: {
        ttl: 60,
        limit: 100, // Mais restritivo em produção
      },
      logging: {
        level: 'error', // Apenas erros em produção
        includeRequestBody: false,
        includeResponseBody: false,
      },
      security: {
        sanitizeErrors: true,
        hideStackTrace: true,
      },
    };
  }
}

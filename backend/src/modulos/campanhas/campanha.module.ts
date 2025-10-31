/**
 * ============================================================================
 * CAMPANHA MODULE - Módulo do NestJS para Campanhas (REFATORADO v2.0)
 * ============================================================================
 *
 * Descrição:
 * Define o módulo de Campanhas, incluindo controllers, providers e imports
 * necessários para a orquestração completa do domínio "Campanhas".
 *
 * ALTERAÇÕES CRÍTICAS (Versão 2.0 - Correções Arquiteturais):
 * ✅ PROVIDERS: Registro explícito de validadores customizados
 * ✅ SWAGGER: Integração para documentação automática
 * ✅ THROTTLER: Rate limiting configurado para endpoints críticos
 * ✅ DEPENDÊNCIAS: PrismaService, Guards e Interceptadores comuns
 * ✅ EXPORTS: Exporta service para uso em outros módulos (ex: Vendas)
 *
 * @module CampanhasModule
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { CampanhaController } from './campanha.controller';
import { CampanhaService } from './campanha.service';
import { PrismaService } from '../../prisma/prisma.service';

// Validadores customizados e DTOs
import {
  PeriodoCampanhaValidator,
  EconomiaCampanhaValidator,
  AutoReplicacaoValidator,
} from './dto/criar-campanha.dto';
import {
  DataFuturaValidator,
  DataFimPosteriorValidator,
  MultiplicadorComercialValidator,
} from './dto/criar-evento-especial.dto';

// Guards / Decorators / Interceptors comuns
import { PapeisGuard } from '../comum/guards/papeis.guard';
import { JwtAuthGuard } from '../comum/guards/jwt-auth.guard';
import { LoggingInterceptor } from '../comum/interceptors/logging.interceptor';
import { TransformResponseInterceptor } from '../comum/interceptors/transform-response.interceptor';
import { HttpExceptionFilter } from '../comum/filters/http-exception.filter';

@Module({
  imports: [
    // ✅ Rate limiting padrão para o módulo de campanhas
    ThrottlerModule.forRoot([{
      ttl: 60, // janela de tempo em segundos
      limit: 100, // máximo de requisições por janela
    }]),
  ],
  controllers: [CampanhaController],
  providers: [
    CampanhaService,
    PrismaService,

    // ✅ Validadores customizados
    PeriodoCampanhaValidator,
    EconomiaCampanhaValidator,
    AutoReplicacaoValidator,
    DataFuturaValidator,
    DataFimPosteriorValidator,
    MultiplicadorComercialValidator,

    // ✅ Guards e Interceptadores (disponibilizados para DI)
    PapeisGuard,
    JwtAuthGuard,
    LoggingInterceptor,
    TransformResponseInterceptor,
    HttpExceptionFilter,
  ],
  exports: [
    // ✅ Exporta service para uso em outros módulos (ex: módulo de validação de vendas)
    CampanhaService,
  ],
})
export class CampanhaModule {}

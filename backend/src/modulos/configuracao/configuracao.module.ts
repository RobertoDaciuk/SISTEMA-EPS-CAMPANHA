import { Module } from '@nestjs/common';
import { ConfiguracaoController } from './configuracao.controller';
import { ConfiguracaoService } from './configuracao.service';

/**
 * Módulo das Configurações Globais - agrega controller e service.
 */
@Module({
  controllers: [ConfiguracaoController],
  providers: [ConfiguracaoService],
})
export class ConfiguracaoModule {}

import { Module } from '@nestjs/common';
import { RelatorioFinanceiroController } from './relatorio-financeiro.controller';
import { RelatorioFinanceiroService } from './relatorio-financeiro.service';

/**
 * Módulo de Relatório Financeiro (apenas Admin).
 */
@Module({
  controllers: [RelatorioFinanceiroController],
  providers: [RelatorioFinanceiroService],
})
export class RelatorioFinanceiroModule {}

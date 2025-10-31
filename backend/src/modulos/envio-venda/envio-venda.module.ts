/**
 * ============================================================================
 * ENVIO VENDA MODULE - Módulo de Envio de Vendas
 * ============================================================================
 * 
 * Descrição:
 * Módulo que encapsula toda a funcionalidade de submissão de vendas
 * pelos vendedores.
 * 
 * Componentes:
 * - EnvioVendaController: Rotas HTTP protegidas para vendedores
 * - EnvioVendaService: Lógica de negócio de criação de envios
 * 
 * Segurança:
 * - Controller protegido com @Papeis('VENDEDOR')
 * - Apenas vendedores podem submeter vendas
 * - Admin e Gerente recebem 403 Forbidden
 * 
 * Dependências:
 * - PrismaModule: Acesso ao banco de dados (importado globalmente no AppModule)
 * - Guards/Decorators: Usados diretamente (não precisam ser importados aqui)
 * 
 * @module EnvioVendaModule
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { EnvioVendaService } from './envio-venda.service';
import { EnvioVendaController } from './envio-venda.controller';
import { RecompensaModule } from '../recompensa/recompensa.module';

/**
 * Módulo responsável pela submissão e gestão dos envios de venda.
 * Importa o RecompensaModule para habilitar a injeção do serviço de recompensa.
 */
@Module({
  imports: [
    RecompensaModule,
  ],
  controllers: [EnvioVendaController],
  providers: [EnvioVendaService],
  exports: [],
})
export class EnvioVendaModule {}

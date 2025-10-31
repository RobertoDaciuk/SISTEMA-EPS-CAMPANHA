import { Module } from '@nestjs/common';
import { ValidacaoService } from './validacao.service';
import { ValidacaoController } from './validacao.controller';
import { RecompensaModule } from '../recompensa/recompensa.module';

/**
 * Módulo responsável pela validação em lote de envios.
 * Importa o RecompensaModule para habilitar a injeção do serviço de recompensa.
 */
@Module({
  imports: [
    RecompensaModule,
  ],
  controllers: [ValidacaoController],
  providers: [ValidacaoService],
  exports: [],
})
export class ValidacaoModule {}
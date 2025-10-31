import { Module } from '@nestjs/common';
import { RecompensaService } from './recompensa.service';

/**
 * Modulo de Recompensa
 * - Exporta o serviço para ser usado em outros módulos como plugin
 * - Não possui controlador HTTP
 */
@Module({
  providers: [RecompensaService],
  exports: [RecompensaService], // fundamental: habilita injeção cross-module
})
export class RecompensaModule {}

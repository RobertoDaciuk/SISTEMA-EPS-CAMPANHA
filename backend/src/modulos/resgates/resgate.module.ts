import { Module } from '@nestjs/common';
import { ResgateController } from './resgate.controller';
import { ResgateService } from './resgate.service';

/**
 * Módulo que encapsula o fluxo de solicitação de resgate de prêmios por vendedores.
 */
@Module({
  controllers: [ResgateController],
  providers: [ResgateService],
})
export class ResgateModule {}

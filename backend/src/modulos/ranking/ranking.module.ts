import { Module } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';

/**
 * Módulo dedicado ao ranking e suas APIs.
 * Exporta RankingService para ser usado em outros módulos.
 */
@Module({
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService],
})
export class RankingModule {}

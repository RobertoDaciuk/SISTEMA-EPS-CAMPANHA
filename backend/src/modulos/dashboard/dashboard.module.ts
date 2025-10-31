import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { RankingModule } from '../ranking/ranking.module';

/**
 * Declara o módulo de Dashboard, importando o RankingModule para acesso ao RankingService.
 */
@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
  imports: [RankingModule],
})
export class DashboardModule {}

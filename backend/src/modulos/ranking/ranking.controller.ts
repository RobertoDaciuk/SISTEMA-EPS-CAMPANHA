/**
 * ============================================================================
 * CONTROLADOR DE RANKING (REFATORADO)
 * ============================================================================
 * Endpoints para os novos rankings com segregação por papel.
 * 
 * Endpoints:
 * - GET /api/ranking: Endpoint unificado que retorna o ranking de vendedores
 *   correto com base no papel do usuário autenticado.
 * - GET /api/ranking/oticas: Novo endpoint para Admins que retorna o ranking
 *   de performance das óticas.
 * ============================================================================
 */

import { Controller, Get, Query, UseGuards, Req, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../comum/guards/jwt-auth.guard';
import { PapeisGuard } from '../comum/guards/papeis.guard';
import { Papeis } from '../comum/decorators/papeis.decorator';
import { RankingService } from './ranking.service';
import { FiltrosRankingVendedoresDto } from './dto/filtros-ranking-vendedores.dto';

@UseGuards(JwtAuthGuard)
@Controller('ranking')
export class RankingController {
  private readonly logger = new Logger(RankingController.name);

  constructor(private readonly rankingService: RankingService) {}

  /**
   * Endpoint unificado para rankings de vendedores.
   * A lógica de qual ranking retornar é tratada no RankingService
   * com base no papel do usuário autenticado.
   */
  @Get()
  async getRankingVendedores(
    @Req() req,
    @Query() filtros: FiltrosRankingVendedoresDto,
  ) {
    this.logger.log(
      `[GET /ranking] Solicitado por [${req.user.papel}] ${req.user.email}`,
    );
    return this.rankingService.getRankingVendedores(req.user, filtros);
  }

  /**
   * Endpoint para o novo ranking de performance de óticas.
   * Acessível apenas para Administradores.
   */
  @Get('oticas')
  @UseGuards(PapeisGuard)
  @Papeis('ADMIN')
  async getRankingOticas(@Req() req) {
    this.logger.log(
      `[GET /ranking/oticas] Solicitado por [ADMIN] ${req.user.email}`,
    );
    return this.rankingService.getRankingOticas(req.user);
  }
}
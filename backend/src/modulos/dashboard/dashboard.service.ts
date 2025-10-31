import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RankingService } from './../ranking/ranking.service';
import { StatusPagamento } from '@prisma/client';

/**
 * Serviço agregador dos KPIs/Dashboards por papel.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
  ) {}

  /**
   * KPIs do painel do Vendedor (inclui posição no ranking global).
   */
  async getVendedorKpis(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { saldoMoedinhas: true, rankingMoedinhas: true, nivel: true },
    });
    if (!usuario) throw new Error('Usuário não encontrado.');

    const { posicao } = await this.rankingService.getPosicaoUsuario(usuarioId);
    const campanhasAtivasCount = await this.prisma.campanha.count({
      where: { status: 'ATIVA' },
    });

    return {
      saldoMoedinhas: usuario.saldoMoedinhas,
      rankingMoedinhas: usuario.rankingMoedinhas,
      nivel: usuario.nivel,
      posicaoRanking: posicao,
      totalCampanhasAtivas: campanhasAtivasCount,
    };
  }

  /**
   * KPIs do painel do Gerente (ranking da equipe, melhor vendedor e ganhos pendentes).
   */
  async getGerenteKpis(usuarioId: string) {
    const rankingEquipe = await this.rankingService.getRankingEquipe(usuarioId);
    const melhorVendedor = rankingEquipe.length > 0 ? rankingEquipe[0] : null;
    const somaPendentes = await this.prisma.relatorioFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        usuarioId,
        tipo: 'GERENTE',
        status: StatusPagamento.PENDENTE,
      },
    });

    return {
      melhorVendedor,
      ganhosPendentesGerencia: somaPendentes._sum.valor ?? 0,
      rankingEquipe,
    };
  }

  /**
   * KPIs do painel do Admin (somatórios globais).
   */
  async getAdminKpis() {
    const totalUsuarios = await this.prisma.usuario.count();
    const totalCampanhasAtivas = await this.prisma.campanha.count({
      where: { status: 'ATIVA' },
    });
    const totalVendasValidadas = await this.prisma.envioVenda.count({
      where: { status: 'VALIDADO' },
    });
    const somaMoedinhas = await this.prisma.campanha.aggregate({
      _sum: { moedinhasPorCartela: true },
      where: { cartelasConcluidas: { some: {} } },
    });
    const somaFinanceiro = await this.prisma.relatorioFinanceiro.aggregate({
      _sum: { valor: true },
      where: { status: StatusPagamento.PENDENTE },
    });

    return {
      totalUsuarios,
      totalCampanhasAtivas,
      totalVendasValidadas,
      totalMoedinhasDistribuidas: somaMoedinhas._sum.moedinhasPorCartela ?? 0,
      totalFinanceiroPendente: somaFinanceiro._sum.valor ?? 0,
    };
  }
}

/**
 * ============================================================================
 * SERVIÇO DE RANKING (REFATORADO)
 * ============================================================================
 * Lógica de negócio para os novos rankings com segregação por papel e métrica.
 * 
 * Métodos Principais:
 * - getRankingVendedores: Unifica a busca por rankings de vendedores, aplicando
 *   as regras de negócio para cada papel (Vendedor, Gerente, Admin).
 * - getRankingOticas: Nova funcionalidade para Admins, gera um ranking
 *   hierárquico de performance das óticas (Matrizes e Filiais).
 * ============================================================================
 */

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Usuario, PapelUsuario, Optica } from '@prisma/client';
import { PaginacaoRankingDto } from './dto/paginacao-ranking.dto';

// Tipagem para o usuário autenticado (payload do JWT)
type UsuarioAutenticado = Pick<Usuario, 'id' | 'email' | 'papel' | 'opticaId'>;

// Tipagem para o resultado do ranking de óticas
export interface RankingOtica {
  id: string;
  nome: string;
  ehMatriz: boolean;
  totalPontos: number;
  vendedores: number;
  filiais?: RankingOtica[];
}

@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Método unificado para buscar o ranking de vendedores.
   * Aplica as regras de negócio corretas com base no papel do usuário.
   */
  async getRankingVendedores(
    usuario: UsuarioAutenticado,
    filtros: PaginacaoRankingDto & { opticaId?: string },
  ) {
    this.logger.log(
      `Buscando ranking de vendedores para [${usuario.papel}] ${usuario.email}`,
    );

    switch (usuario.papel) {
      case PapelUsuario.VENDEDOR:
        return this.getRankingParaVendedor(usuario, filtros);
      case PapelUsuario.GERENTE:
        return this.getRankingParaGerente(usuario, filtros);
      case PapelUsuario.ADMIN:
        return this.getRankingParaAdmin(filtros);
      default:
        throw new ForbiddenException('Papel de usuário inválido para esta operação.');
    }
  }

  /**
   * Retorna o ranking de performance das óticas (hierárquico).
   * Acessível apenas para ADMIN.
   */
  async getRankingOticas(usuario: UsuarioAutenticado): Promise<RankingOtica[]> {
    if (usuario.papel !== PapelUsuario.ADMIN) {
      throw new ForbiddenException('Acesso negado.');
    }
    this.logger.log(`[ADMIN] Gerando ranking de performance de óticas...`);

    // 1. Executa buscas em paralelo para otimização
    const [agregacaoPorOtica, todasOticas] = await Promise.all([
      this.prisma.usuario.groupBy({
        by: ['opticaId'],
        where: {
          papel: PapelUsuario.VENDEDOR,
          opticaId: { not: null },
        },
        _sum: { rankingPontosReais: true },
        _count: { id: true },
      }),
      this.prisma.optica.findMany(),
    ]);

    // 2. Mapeia agregações para busca rápida (O(1))
    const agregacaoMap = new Map(
      agregacaoPorOtica.map((a) => [
        a.opticaId,
        {
          totalPontos: a._sum.rankingPontosReais?.toNumber() ?? 0,
          vendedores: a._count.id ?? 0,
        },
      ]),
    );

    // 3. Estrutura os dados e a hierarquia em uma única passagem (O(n))
    const oticasMap = new Map<string, RankingOtica>();
    const rankingFinal: RankingOtica[] = [];

    // Primeira passagem: inicializa todas as óticas no mapa
    todasOticas.forEach((otica) => {
      const agregacao = agregacaoMap.get(otica.id) ?? { totalPontos: 0, vendedores: 0 };
      oticasMap.set(otica.id, {
        id: otica.id,
        nome: otica.nome,
        ehMatriz: otica.ehMatriz,
        totalPontos: agregacao.totalPontos,
        vendedores: agregacao.vendedores,
        filiais: [],
      });
    });

    // Segunda passagem: constrói a hierarquia
    todasOticas.forEach((otica) => {
      const oticaData = oticasMap.get(otica.id);
      if (!oticaData) return;

      if (otica.matrizId && oticasMap.has(otica.matrizId)) {
        // É uma filial, então adicione-a à sua matriz
        const matriz = oticasMap.get(otica.matrizId);
        if (matriz) {
          matriz.totalPontos += oticaData.totalPontos;
          matriz.vendedores += oticaData.vendedores;
          matriz.filiais.push(oticaData);
        }
      } else {
        // É uma matriz ou uma ótica independente
        rankingFinal.push(oticaData);
      }
    });
    
    // 4. Ordena as filiais dentro de cada matriz e o ranking final
    rankingFinal.forEach((otica) => {
      if (otica.filiais && otica.filiais.length > 0) {
        otica.filiais.sort((a, b) => b.totalPontos - a.totalPontos);
      }
    });
    rankingFinal.sort((a, b) => b.totalPontos - a.totalPontos);

    return rankingFinal;
  }

  // ================================================
  // MÉTODOS PRIVADOS POR PAPEL
  // ================================================

  private async getRankingParaVendedor(
    usuario: UsuarioAutenticado,
    filtros: PaginacaoRankingDto,
  ) {
    // Valida se o vendedor tem ótica associada
    if (!usuario.opticaId) {
      this.logger.warn(`Vendedor ${usuario.email} não possui ótica associada.`);
      return { rankingHabilitado: false, dados: [], totalRegistros: 0, paginaAtual: 1, totalPaginas: 0 };
    }

    const optica = await this.prisma.optica.findUnique({
      where: { id: usuario.opticaId },
      select: { rankingVisivelParaVendedores: true },
    });

    if (!optica?.rankingVisivelParaVendedores) {
      return { rankingHabilitado: false, dados: [], totalRegistros: 0, paginaAtual: 1, totalPaginas: 0 };
    }

    const where = { opticaId: usuario.opticaId, papel: PapelUsuario.VENDEDOR };
    const orderBy = { rankingMoedinhas: 'desc' as const };
    const select = {
      id: true,
      nome: true,
      avatarUrl: true,
      rankingMoedinhas: true,
    };

    return this.buscarRankingPaginado(where, orderBy, select, filtros);
  }

  private async getRankingParaGerente(
    usuario: UsuarioAutenticado,
    filtros: PaginacaoRankingDto,
  ) {
    if (!usuario.opticaId) {
      this.logger.warn(`Gerente ${usuario.email} não possui ótica associada.`);
      return { rankingHabilitado: true, dados: [], totalRegistros: 0, paginaAtual: 1, totalPaginas: 0 };
    }

    // Verifica se a ótica do gerente é uma matriz e busca suas filiais
    const opticaDoGerente = await this.prisma.optica.findUnique({
      where: { id: usuario.opticaId },
      include: { filiais: { select: { id: true } } },
    });

    let idsDeOticas: string[] = [usuario.opticaId];

    if (opticaDoGerente?.ehMatriz && opticaDoGerente.filiais.length > 0) {
      this.logger.log(`Gerente de matriz. Incluindo filiais no ranking.`);
      const idsFiliais = opticaDoGerente.filiais.map((f) => f.id);
      idsDeOticas = [...idsDeOticas, ...idsFiliais];
    }

    const where = {
      opticaId: { in: idsDeOticas },
      papel: PapelUsuario.VENDEDOR,
    };
    const orderBy = { rankingPontosReais: 'desc' as const };
    const select = {
      id: true,
      nome: true,
      avatarUrl: true,
      rankingPontosReais: true,
      optica: { select: { nome: true } }, // Adiciona a ótica para clareza
    };

    return this.buscarRankingPaginado(where, orderBy, select, filtros);
  }

  private async getRankingParaAdmin(filtros: PaginacaoRankingDto & { opticaId?: string }) {
    const where: any = { papel: PapelUsuario.VENDEDOR };
    if (filtros.opticaId) {
      where.opticaId = filtros.opticaId;
    }

    const orderBy = { rankingPontosReais: 'desc' as const };
    const select = {
      id: true,
      nome: true,
      avatarUrl: true,
      rankingPontosReais: true,
      optica: { select: { nome: true } }, // Inclui nome da ótica para admin
    };

    return this.buscarRankingPaginado(where, orderBy, select, filtros);
  }

  /**
   * Helper genérico para paginação de rankings.
   */
  private async buscarRankingPaginado(
    where: any,
    orderBy: any,
    select: any,
    filtros: PaginacaoRankingDto,
  ) {
    const pagina = filtros.pagina ?? 1;
    const porPagina = filtros.porPagina ?? 20;
    const skip = (pagina - 1) * porPagina;

    const [dados, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where,
        select,
        orderBy,
        skip,
        take: porPagina,
      }),
      this.prisma.usuario.count({ where }),
    ]);

    const dadosComPosicao = dados.map((item, index) => ({
      ...item,
      posicao: skip + index + 1,
    }));

    return {
      rankingHabilitado: true,
      dados: dadosComPosicao,
      paginaAtual: pagina,
      totalPaginas: Math.ceil(total / porPagina),
      totalRegistros: total,
    };
  }

  // ================================================
  // MÉTODOS DE COMPATIBILIDADE COM DASHBOARD
  // ================================================

  /**
   * Retorna a posição do vendedor no ranking global (baseado em Moedinhas).
   * Usado no dashboard do vendedor para exibir "Você está em X° lugar".
   */
  async getPosicaoUsuario(usuarioId: string): Promise<{ posicao: number }> {
    this.logger.log(`Calculando posição no ranking para usuário ${usuarioId}`);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { rankingMoedinhas: true, opticaId: true },
    });

    if (!usuario || !usuario.opticaId) {
      return { posicao: 0 };
    }

    // Conta quantos vendedores da mesma ótica têm mais Moedinhas
    const vendedoresAFrente = await this.prisma.usuario.count({
      where: {
        opticaId: usuario.opticaId,
        papel: PapelUsuario.VENDEDOR,
        rankingMoedinhas: { gt: usuario.rankingMoedinhas },
      },
    });

    // Posição = vendedores à frente + 1
    const posicao = vendedoresAFrente + 1;

    this.logger.log(`  → Posição do usuário: ${posicao}°`);

    return { posicao };
  }

  /**
   * Retorna o ranking completo da equipe do gerente (baseado em Pontos Reais).
   * Usado no dashboard do gerente para exibir o desempenho da equipe.
   */
  async getRankingEquipe(usuarioId: string) {
    this.logger.log(`Buscando ranking de equipe para gerente ${usuarioId}`);

    const gerente = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { opticaId: true },
    });

    if (!gerente || !gerente.opticaId) {
      this.logger.warn(`Gerente ${usuarioId} não tem ótica associada.`);
      return [];
    }

    // Busca todos os vendedores da mesma ótica, ordenados por Pontos Reais
    const ranking = await this.prisma.usuario.findMany({
      where: {
        opticaId: gerente.opticaId,
        papel: PapelUsuario.VENDEDOR,
      },
      select: {
        id: true,
        nome: true,
        avatarUrl: true,
        rankingPontosReais: true,
      },
      orderBy: {
        rankingPontosReais: 'desc',
      },
    });

    this.logger.log(`  → ${ranking.length} vendedor(es) encontrado(s)`);

    return ranking;
  }
}
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListarRelatoriosFiltroDto } from './dto/listar-relatorios.filtro.dto';
import { Prisma } from '@prisma/client';
import { MarcarEmMassaDto } from './dto/marcar-em-massa.dto'; // Importação Adicionada

/**
 * Serviço de lógica financeira para relatórios e pagamentos.
 */
@Injectable()
export class RelatorioFinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista relatórios financeiros com filtros avançados, incluindo conversão de fuso horário e ordenação dinâmica.
   */
  async listar(filtros: ListarRelatoriosFiltroDto) {
    const where: Prisma.RelatorioFinanceiroWhereInput = {};

    // Filtros básicos
    if (filtros.status) where.status = filtros.status;
    if (filtros.campanhaId) where.campanhaId = filtros.campanhaId;
    if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros.tipo) where.tipo = filtros.tipo;

    // Lógica de filtro por data com correção de fuso horário (Brasília UTC-3)
    if (filtros.dataInicio || filtros.dataFim) {
      where.dataGerado = {};
      if (filtros.dataInicio) {
        // Converte a data de início (ex: '2025-10-01') para o início do dia em Brasília (00:00 BRT -> 03:00 UTC)
        const data = new Date(filtros.dataInicio);
        data.setUTCHours(3, 0, 0, 0); // Ajusta para UTC-3
        where.dataGerado.gte = data;
      }
      if (filtros.dataFim) {
        // Converte a data de fim (ex: '2025-10-10') para o fim do dia em Brasília (23:59 BRT -> 02:59 UTC do dia seguinte)
        const data = new Date(filtros.dataFim);
        data.setUTCHours(23 + 3, 59, 59, 999); // Ajusta para UTC-3 e fim do dia
        where.dataGerado.lte = data;
      }
    }

    // Lógica de ordenação dinâmica
    const orderBy: Prisma.RelatorioFinanceiroOrderByWithRelationInput[] = [];
    if (filtros.agrupar) {
      orderBy.push({ usuario: { nome: 'asc' } });
    }
    orderBy.push({ dataGerado: 'desc' }); // Ordem cronológica como padrão ou secundária

    return this.prisma.relatorioFinanceiro.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            cpf: true,
            optica: { select: { nome: true, cnpj: true } },
          },
        },
        campanha: { select: { id: true, titulo: true } },
      },
      orderBy,
    });
  }

  /**
   * Busca relatório financeiro único por ID.
   */
  async buscarPorId(id: string) {
    return this.prisma.relatorioFinanceiro.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
        campanha: { select: { id: true, titulo: true } },
      },
    });
  }

  /**
   * Marca relatório financeiro como pago e dispara notificação transacional.
   */
  async marcarComoPago(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const relatorio = await tx.relatorioFinanceiro.findUnique({
        where: { id },
        include: {
          campanha: { select: { titulo: true } },
        },
      });
      if (!relatorio) throw new NotFoundException('Relatório não encontrado');
      if (relatorio.status === 'PAGO') throw new BadRequestException('Relatório já está pago');

      const relatorioAtualizado = await tx.relatorioFinanceiro.update({
        where: { id },
        data: { status: 'PAGO', dataPagamento: new Date() },
      });

      // Gatilho de notificação para o usuário
      const mensagem = `Seu pagamento de R$ ${relatorio.valor.toFixed(2)} referente à campanha '${relatorio.campanha.titulo}' foi processado!`;
      await tx.notificacao.create({
        data: {
          usuarioId: relatorio.usuarioId,
          mensagem,
          linkUrl: '/financeiro',
        },
      });

      return relatorioAtualizado;
    });
  }

  /**
   * NOVO: Calcula os KPIs financeiros para o dashboard do admin.
   */
  async getKpis() {
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    const [totalAPagar, totalPagoUltimos30d, pagamentosPendentes] = await this.prisma.$transaction([
      this.prisma.relatorioFinanceiro.aggregate({
        _sum: { valor: true },
        where: { status: 'PENDENTE' },
      }),
      this.prisma.relatorioFinanceiro.aggregate({
        _sum: { valor: true },
        where: {
          status: 'PAGO',
          dataPagamento: { gte: trintaDiasAtras },
        },
      }),
      this.prisma.relatorioFinanceiro.count({
        where: { status: 'PENDENTE' },
      }),
    ]);

    return {
      totalAPagar: totalAPagar._sum.valor || 0,
      totalPagoUltimos30dias: totalPagoUltimos30d._sum.valor || 0,
      pagamentosPendentes: pagamentosPendentes || 0,
    };
  }

  /**
   * NOVO: Gera uma string CSV a partir dos filtros fornecidos.
   */
  async exportarCsv(filtros: ListarRelatoriosFiltroDto): Promise<string> {
    const relatorios = await this.listar(filtros);

    if (relatorios.length === 0) {
      return 'Nenhum dado encontrado para os filtros selecionados.';
    }

    // Constrói o cabeçalho do CSV
    const cabecalho = [
      'ID Relatorio',
      'Data Conclusao',
      'Beneficiario',
      'CPF',
      'Otica',
      'CNPJ Otica',
      'Tipo',
      'Campanha',
      'Valor',
      'Status',
    ];
    const linhas = [cabecalho.join(',')];

    // Constrói cada linha do CSV
    relatorios.forEach(rel => {
      const linha = [
        rel.id,
        new Date(rel.dataGerado).toLocaleDateString('pt-BR'),
        `"${rel.usuario.nome}"`,
        rel.usuario.cpf || '',
        `"${rel.usuario.optica?.nome || 'N/A'}"`,
        rel.usuario.optica?.cnpj || '',
        rel.tipo,
        `"${rel.campanha.titulo}"`,
        rel.valor.toFixed(2).replace('.', ','), // Formato monetário brasileiro
        rel.status,
      ];
      linhas.push(linha.join(','));
    });

    return linhas.join('\n');
  }

  /**
   * NOVO: Marca múltiplos relatórios como pagos em uma única operação.
   */
  async marcarPagosEmMassa(dto: MarcarEmMassaDto) {
    return this.prisma.relatorioFinanceiro.updateMany({
      where: {
        id: { in: dto.ids },
        status: 'PENDENTE', // Garante que só atualizemos o que está pendente
      },
      data: {
        status: 'PAGO',
        dataPagamento: new Date(),
      },
    });
  }
}

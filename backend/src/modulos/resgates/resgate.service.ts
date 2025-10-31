import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SolicitarResgateDto } from './dto/solicitar-resgate.dto';
import { ListarResgatesFiltroDto } from './dto/listar-resgates.filtro.dto';
import { CancelarResgateDto } from './dto/cancelar-resgate.dto';
import { Prisma, StatusResgate } from '@prisma/client';

/**
 * Serviço responsável por toda a lógica de resgate de prêmios, incluindo rotas de Admin e Vendedor,
 * garantindo transações atômicas e consistência dos dados de saldo, estoque e ordens.
 */
@Injectable()
export class ResgateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Realiza a solicitação de resgate de um prêmio. (função Vendedor)
   * @param dto Dados do resgate
   * @param vendedorId Identificador do vendedor
   */
  async solicitar(dto: SolicitarResgateDto, vendedorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const premio = await tx.premio.findUnique({ where: { id: dto.premioId } });
      const vendedor = await tx.usuario.findUnique({ where: { id: vendedorId } });

      if (!premio) throw new NotFoundException('Prêmio não encontrado.');
      if (!vendedor) throw new NotFoundException('Vendedor não encontrado.');
      if (vendedor.saldoMoedinhas < premio.custoMoedinhas) {
        throw new BadRequestException('Saldo de moedinhas insuficiente.');
      }
      if (premio.estoque <= 0) {
        throw new BadRequestException('Prêmio fora de estoque.');
      }

      await tx.usuario.update({
        where: { id: vendedorId },
        data: { saldoMoedinhas: { decrement: premio.custoMoedinhas } }
      });

      await tx.premio.update({
        where: { id: dto.premioId },
        data: { estoque: { decrement: 1 } }
      });

      const resgate = await tx.resgatePremio.create({
        data: {
          vendedorId,
          premioId: dto.premioId,
          status: StatusResgate.SOLICITADO
        }
      });

      const mensagem = `Sua solicitação de resgate do prêmio '${premio.nome}' foi recebida!`;
      await tx.notificacao.create({
        data: {
          usuarioId: vendedorId,
          mensagem,
          linkUrl: '/premios/meus-resgates'
        }
      });

      return resgate;
    });
  }

  /**
   * ADMIN: Lista resgates com filtros opcionais (status, vendedor, prêmio).
   * @param filtros Filtros de busca
   */
  async listarAdmin(filtros: ListarResgatesFiltroDto) {
    const where: Prisma.ResgatePremioWhereInput = { ...filtros };
    return this.prisma.resgatePremio.findMany({
      where,
      include: {
        vendedor: { select: { id: true, nome: true, email: true } },
        premio: { select: { id: true, nome: true } }
      },
      orderBy: { dataSolicitacao: 'desc' }
    });
  }

  /**
   * VENDEDOR: Lista o histórico de resgates de um vendedor específico.
   * @param vendedorId ID do vendedor
   */
  async meusResgates(vendedorId: string) {
    return this.prisma.resgatePremio.findMany({
      where: { vendedorId },
      include: {
        premio: { select: { id: true, nome: true, imageUrl: true } }
      },
      orderBy: { dataSolicitacao: 'desc' }
    });
  }

  /**
   * ADMIN: Marca o resgate como enviado (atualiza status para ENVIADO).
   * @param resgateId ID do resgate
   */
  async marcarEnviado(resgateId: string) {
    return this.prisma.$transaction(async (tx) => {
      const resgate = await tx.resgatePremio.findUnique({
        where: { id: resgateId },
        include: { premio: true }
      });
      if (!resgate) throw new NotFoundException('Resgate não encontrado.');
      if (resgate.status !== StatusResgate.SOLICITADO) {
        throw new BadRequestException('Este resgate não pode ser marcado como enviado.');
      }

      const resgateAtualizado = await tx.resgatePremio.update({
        where: { id: resgateId },
        data: { status: StatusResgate.ENVIADO }
      });

      const mensagem = `Seu prêmio '${resgate.premio.nome}' foi enviado!`;
      await tx.notificacao.create({
        data: {
          usuarioId: resgate.vendedorId,
          mensagem,
          linkUrl: '/premios/meus-resgates'
        }
      });

      return resgateAtualizado;
    });
  }

  /**
   * ADMIN: Cancela (estorna) o resgate, devolvendo pontos e estoque, e notificando o usuário. Transação atômica.
   * @param resgateId ID do resgate
   * @param dto DTO com motivo do cancelamento
   */
  async cancelarEstorno(resgateId: string, dto: CancelarResgateDto) {
    return this.prisma.$transaction(async (tx) => {
      const resgate = await tx.resgatePremio.findUnique({
        where: { id: resgateId },
        include: { premio: true }
      });
      if (!resgate) throw new NotFoundException('Resgate não encontrado.');
      if (resgate.status !== StatusResgate.SOLICITADO) {
        throw new BadRequestException('Este resgate não pode ser cancelado.');
      }

      const premio = await tx.premio.findUnique({ where: { id: resgate.premioId } });
      if (!premio) throw new NotFoundException('Prêmio não encontrado para estorno.');

      await tx.usuario.update({
        where: { id: resgate.vendedorId },
        data: { saldoMoedinhas: { increment: premio.custoMoedinhas } }
      });

      await tx.premio.update({
        where: { id: resgate.premioId },
        data: { estoque: { increment: 1 } }
      });

      const resgateCancelado = await tx.resgatePremio.update({
        where: { id: resgateId },
        data: {
          status: StatusResgate.CANCELADO,
          motivoCancelamento: dto.motivoCancelamento
        }
      });

      const mensagem = `Seu resgate do prêmio '${premio.nome}' foi cancelado. ${premio.custoMoedinhas} moedinhas foram estornadas.`;
      await tx.notificacao.create({
        data: {
          usuarioId: resgate.vendedorId,
          mensagem,
          linkUrl: '/premios/meus-resgates'
        }
      });

      return resgateCancelado;
    });
  }
}

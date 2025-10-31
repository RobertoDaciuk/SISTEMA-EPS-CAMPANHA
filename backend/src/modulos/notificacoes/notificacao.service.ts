import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Serviço de Notificações com filtragem por Data Tenancy.
 * Todas as operações consultam/modificam apenas notificações do usuário autenticado.
 */
@Injectable()
export class NotificacaoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista até 20 notificações mais recentes do usuário.
   * @param usuarioId - ID do usuário logado (JWT)
   */
  async listar(usuarioId: string) {
    return this.prisma.notificacao.findMany({
      where: { usuarioId },
      orderBy: { dataCriacao: 'desc' },
      take: 20,
    });
  }

  /**
   * Retorna a contagem de notificações não lidas do usuário.
   * @param usuarioId - ID do usuário logado (JWT)
   */
  async contagemNaoLidas(usuarioId: string) {
    const contagem = await this.prisma.notificacao.count({
      where: { usuarioId, lida: false },
    });
    return { contagem };
  }

  /**
   * Marca uma única notificação como lida (apenas se pertence ao usuário).
   * @param notificacaoId - ID da notificação
   * @param usuarioId - ID do usuário logado (JWT)
   */
  async marcarComoLida(notificacaoId: string, usuarioId: string) {
    return this.prisma.notificacao.updateMany({
      where: { id: notificacaoId, usuarioId },
      data: { lida: true },
    });
  }

  /**
   * Marca todas as notificações não lidas do usuário como lidas.
   * @param usuarioId - ID do usuário logado (JWT)
   */
  async marcarTodasComoLidas(usuarioId: string) {
    return this.prisma.notificacao.updateMany({
      where: { usuarioId, lida: false },
      data: { lida: true },
    });
  }
}

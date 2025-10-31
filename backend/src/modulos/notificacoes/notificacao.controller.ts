import { Controller, UseGuards, Get, Patch, Req, Param } from '@nestjs/common';
import { JwtAuthGuard } from './../comum/guards/jwt-auth.guard';
import { NotificacaoService } from './notificacao.service';

/**
 * Controlador de Notificações — Acesso apenas para usuários autenticados.
 * Todas as operações são filtradas pelo usuário logado.
 */
@UseGuards(JwtAuthGuard)
@Controller('notificacoes')
export class NotificacaoController {
  constructor(private readonly notificacaoService: NotificacaoService) {}

  /**
   * Obtém o ID do usuário logado a partir do JWT (presente em req.user.id).
   * @param req Request
   */
  private getUsuarioId(req): string {
    return req.user.id;
  }

  /**
   * Lista até 20 notificações mais recentes do usuário logado.
   */
  @Get()
  async listar(@Req() req) {
    return this.notificacaoService.listar(this.getUsuarioId(req));
  }

  /**
   * Retorna a contagem de notificações não lidas do usuário logado.
   */
  @Get('contagem-nao-lidas')
  async contagemNaoLidas(@Req() req) {
    return this.notificacaoService.contagemNaoLidas(this.getUsuarioId(req));
  }

  /**
   * Marca uma notificação específica como lida, caso pertença ao usuário.
   */
  @Patch(':id/marcar-como-lida')
  async marcarComoLida(@Param('id') id: string, @Req() req) {
    return this.notificacaoService.marcarComoLida(id, this.getUsuarioId(req));
  }

  /**
   * Marca todas as notificações do usuário logado como lidas.
   */
  @Patch('marcar-todas-como-lidas')
  async marcarTodasComoLidas(@Req() req) {
    return this.notificacaoService.marcarTodasComoLidas(this.getUsuarioId(req));
  }
}

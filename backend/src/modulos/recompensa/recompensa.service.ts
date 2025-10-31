/**
 * ============================================================================
 * Serviço interno: RecompensaService (Gatilho de recompensas gamificadas)
 * ============================================================================
 * Este serviço opera dentro de transações Prisma para garantir atomicidade:
 * - Não possui controller/rota pública.
 * - Deve ser injetado e chamado de outros módulos internos (ex: ValidacaoService).
 * - Recebe obrigatoriamente o Prisma Transaction Client (tx: PrismaTx) para
 *   operar toda a lógica atômica (livro-razão, financeiro, pontos, notificação).
 * - Utiliza o modelo CartelaConcluida como "trava" para garantir idempotência
 *   do pagamento de cartelas (P2002 = já existe, sem duplicidade).
 * ============================================================================
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PrismaClient, Usuario, Campanha, EnvioVenda } from '@prisma/client';

// Tipo de client transacional para uso seguro do tx:
type PrismaTx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>;

@Injectable()
export class RecompensaService {
  private readonly logger = new Logger(RecompensaService.name);

  /**
   * Processa todos os gatilhos financeiros/pontuação de cartela completada.
   * IMPORTANTE: Recebe sempre o Prisma tx para atomicidade e rollback automático.
   */
  public async processarGatilhos(
    tx: Prisma.TransactionClient,
    envioValidado: EnvioVenda,
    campanha: Campanha,
    vendedor: Usuario & { gerente: Usuario | null }
  ): Promise<void> {
    // Gatilho 1 — Notificação simples (venda validada)
    await tx.notificacao.create({
      data: {
        mensagem: `Sua venda '${envioValidado.numeroPedido}' foi APROVADA.`,
        usuarioId: vendedor.id,
      },
    });

    // Gatilho 2 — Verificação de cartela completa (todas as regras atendidas)
    const estaCompleta = await this._verificarCartelaCompleta(
      tx,
      envioValidado.numeroCartelaAtendida!,
      envioValidado.vendedorId,
      campanha.id
    );

    // Gatilho 3 — "Trava": tenta criar registro no livro-razão
    if (estaCompleta) {
      try {
        await tx.cartelaConcluida.create({
          data: {
            vendedorId: vendedor.id,
            campanhaId: campanha.id,
            numeroCartela: envioValidado.numeroCartelaAtendida!,
          },
        });
        this.logger.log(
          `Cartela ${envioValidado.numeroCartelaAtendida} do vendedor ${vendedor.nome} COMPLETA. Prêmio financeiro e pontos aplicados.`
        );
        // Gatilho 4 — Pagamentos, pontos e notificações premium
        await this._aplicarRecompensas(tx, campanha, vendedor, envioValidado.numeroCartelaAtendida!);
      } catch (e: any) {
        // Previne duplicidade: código P2002 = unique violation
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          this.logger.warn(
            `Cartela ${envioValidado.numeroCartelaAtendida} do vendedor ${vendedor.nome} já paga (ledger pré-existente). Pulando recompensa.`
          );
          return; // Idempotência: já foi pago, ignora
        }
        throw e; // Falhas inesperadas interrompem a transação principal
      }
    }
  }

  /**
   * Verifica se uma cartela está completa: todos os requisitos válidos.
   * Busca as regras da cartela e verifica se os counts estão OK.
   */
  private async _verificarCartelaCompleta(
    tx: Prisma.TransactionClient,
    numeroCartela: number,
    vendedorId: string,
    campanhaId: string
  ): Promise<boolean> {
    const regraCartela = await tx.regraCartela.findFirst({
      where: { campanhaId, numeroCartela },
      include: { requisitos: true },
    });
    if (!regraCartela) return false;

    const resultados = await Promise.all(
      regraCartela.requisitos.map(async (req) => {
        const count = await tx.envioVenda.count({
          where: {
            vendedorId,
            requisitoId: req.id,
            status: 'VALIDADO',
          },
        });
        return count >= req.quantidade;
      })
    );
    return resultados.every((ok) => ok);
  }

  /**
   * Cria os lançamentos financeiros, adiciona pontos e envia notificações premium.
   */
  private async _aplicarRecompensas(
    tx: Prisma.TransactionClient,
    campanha: Campanha,
    vendedor: Usuario & { gerente: Usuario | null },
    numeroCartela: number,
  ) {
    // 1. RelatorioFinanceiro: Vendedor
    await tx.relatorioFinanceiro.create({
      data: {
        valor: campanha.pontosReaisPorCartela,
        tipo: 'VENDEDOR',
        usuarioId: vendedor.id,
        campanhaId: campanha.id,
        observacoes: `Pagamento automático por conclusão da Cartela ${numeroCartela}.`,
      },
    });

    // 2. RelatorioFinanceiro: Gerente (se houver)
    const percentual = campanha.percentualGerente?.toNumber ? campanha.percentualGerente.toNumber() : Number(campanha.percentualGerente);
    if (percentual > 0 && vendedor.gerente) {
      const valorCartela = campanha.pontosReaisPorCartela?.toNumber ? campanha.pontosReaisPorCartela.toNumber() : Number(campanha.pontosReaisPorCartela);
      const valorGerente = valorCartela * (percentual / 100);
      await tx.relatorioFinanceiro.create({
        data: {
          valor: valorGerente,
          tipo: 'GERENTE',
          usuarioId: vendedor.gerente.id,
          campanhaId: campanha.id,
          observacoes: `Comissão automática pela Cartela ${numeroCartela} do vendedor ${vendedor.nome}.`,
        },
      });
    }


    // 3. Moedinhas e Pontos do vendedor (saldo e ranking)
    await tx.usuario.update({
      where: { id: vendedor.id },
      data: {
        saldoMoedinhas: { increment: campanha.moedinhasPorCartela },
        rankingMoedinhas: { increment: campanha.moedinhasPorCartela },
        rankingPontosReais: { increment: campanha.pontosReaisPorCartela }, // NOVO
      },
    });

    // 4. Notificação Premium (cartela completada)
    await tx.notificacao.create({
      data: {
        mensagem: `Parabéns! Você completou a Cartela ${numeroCartela} da campanha '${campanha.titulo}'. Pontos e recompensas já lançados!`,
        usuarioId: vendedor.id,
      },
    });
  }
}

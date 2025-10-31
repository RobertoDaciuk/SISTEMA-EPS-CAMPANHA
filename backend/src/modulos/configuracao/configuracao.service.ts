import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AtualizarConfiguracoesDto } from './dto/atualizar-configuracoes.dto';

/**
 * Serviço para consulta e atualização transacional das configurações globais.
 */
@Injectable()
export class ConfiguracaoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todas as configurações globais, ordenando por chave.
   */
  async listar() {
    return this.prisma.configuracaoGlobal.findMany({
      orderBy: { chave: 'asc' },
    });
  }

  /**
   * Atualiza (ou cria) um lote de configurações usando upsert e transação.
   */
  async atualizarEmLote(dto: AtualizarConfiguracoesDto) {
    return this.prisma.$transaction(async (tx) => {
      const resultados = [];
      for (const item of dto.configuracoes) {
        const configAtualizada = await tx.configuracaoGlobal.upsert({
          where: { chave: item.chave },
          update: { valor: item.valor },
          create: {
            chave: item.chave,
            valor: item.valor,
            descricao: item.descricao ?? `Configuração '${item.chave}' criada via API.`,
          },
        });
        resultados.push(configAtualizada);
      }
      return resultados;
    });
  }
}

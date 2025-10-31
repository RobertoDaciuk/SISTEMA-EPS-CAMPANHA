import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarPremioDto } from './dto/criar-premio.dto';
import { AtualizarPremioDto } from './dto/atualizar-premio.dto';
import { ArmazenamentoService } from '../upload/armazenamento.service';

/**
 * Serviço de catálogo de prêmios com regras de acesso e validação.
 */
@Injectable()
export class PremioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly armazenamentoService: ArmazenamentoService,
  ) {}

  async criar(dto: CriarPremioDto) {
    return this.prisma.premio.create({ data: dto });
  }

  async listar() {
    // Vitrine: apenas prêmios ativos e com estoque > 0, ordenados por custoMoedinhas (menor primeiro)
    return this.prisma.premio.findMany({
      where: { ativo: true, estoque: { gt: 0 } },
      orderBy: { custoMoedinhas: 'asc' },
    });
  }

  async listarTodosAdmin() {
    // Para o Admin gerenciar: ver todos (inclusive sem estoque), alfabeticamente
    return this.prisma.premio.findMany({
      orderBy: { nome: 'asc' },
    });
  }

  /** Busca prêmio por ID, lançando erro se não existir */
  async buscarPorId(premioId: string) {
    const premio = await this.prisma.premio.findUnique({ where: { id: premioId } });
    if (!premio) throw new NotFoundException('Prêmio não encontrado.');
    return premio;
  }

    /** Realiza upload de imagem para um prêmio existente, salvando URL fake */
  async uploadImagem(premioId: string, file: Express.Multer.File) {
    await this.buscarPorId(premioId); // Validação de existência
    const imageUrl = await this.armazenamentoService.uploadArquivo(file.buffer, file.mimetype, 'premios', premioId);
    return this.prisma.premio.update({
      where: { id: premioId },
      data: { imageUrl },
    });
  }

  async atualizar(id: string, dto: AtualizarPremioDto) {
    return this.prisma.premio.update({
      where: { id },
      data: dto,
    });
  }

  async remover(id: string) {
    return this.prisma.premio.delete({ where: { id } });
  }
}

/**
 * ==========================================================================================
 * OTICA SERVICE - Lógica de Negócio do Módulo de Óticas (REFATORADO - Tarefa 44.1)
 * ==========================================================================================
 *
 * Descrição:
 * Serviço responsável por toda a lógica de negócio relacionada a óticas parceiras.
 * Gerencia operações CRUD e inclui lógica especial para validação de CNPJ no fluxo
 * de auto-registro de usuários.
 *
 * REFATORAÇÃO (Tarefa 44.1 - Sprint 18.1):
 * - Implementada hierarquia Matriz/Filial com validações robustas
 * - Adicionado filtro 'ehMatriz' no método listarAdmin
 * - Validação de hierarquia circular (A→B→A)
 * - Validação: Matriz não pode ter matrizId
 * - Validação: Filial deve ter matrizId válido apontando para Matriz
 * - Melhoradas mensagens de erro contextuais
 *
 * Responsabilidades:
 * - CRUD completo de óticas (criar, listar, buscar, atualizar, remover)
 * - Sanitização de CNPJ (remover pontuação)
 * - Validação de duplicatas (CNPJ único)
 * - Verificação pública de CNPJ (para fluxo de registro de vendedores)
 * - Validação de hierarquia Matriz/Filial
 *
 * Lógica de Sanitização:
 * CNPJs podem ser enviados com ou sem pontuação:
 * - "12.345.678/0001-90" → "12345678000190"
 * - "12345678000190" → "12345678000190"
 *
 * Método sanitizador remove todos os caracteres não numéricos antes de
 * salvar/buscar no banco, garantindo consistência.
 *
 * @module OticasModule
 * ==========================================================================================
 */

import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarOticaDto } from './dto/criar-otica.dto';
import { AtualizarOticaDto } from './dto/atualizar-otica.dto';
import { Optica, Prisma } from '@prisma/client';
import { ListarOticasFiltroDto } from './dto/listar-oticas.filtro.dto';

/**
 * Serviço de gerenciamento de óticas parceiras.
 *
 * Fornece métodos para CRUD completo, validação de CNPJ para registro
 * de usuários (fluxo "Jornada de João") e gestão de hierarquia Matriz/Filial.
 */
@Injectable()
export class OticaService {
  /**
   * Logger dedicado para rastrear operações do módulo de óticas.
   */
  private readonly logger = new Logger(OticaService.name);

  /**
   * Construtor do serviço.
   *
   * @param prisma - Serviço Prisma para acesso ao banco de dados
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Método privado para sanitizar CNPJ.
   *
   * Remove todos os caracteres não numéricos (pontos, traços, barras, espaços)
   * do CNPJ, deixando apenas os 14 dígitos.
   *
   * Exemplos:
   * - "12.345.678/0001-90" → "12345678000190"
   * - "12 345 678 0001 90" → "12345678000190"
   * - "12345678000190" → "12345678000190"
   *
   * @param cnpj - CNPJ com ou sem pontuação
   * @returns CNPJ limpo (apenas dígitos)
   *
   * @private
   */
  private _limparCnpj(cnpj: string): string {
    // Remove tudo que não for dígito (0-9)
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    // Valida que o CNPJ tem exatamente 14 dígitos após limpeza
    if (cnpjLimpo.length !== 14) {
      throw new BadRequestException(
        `CNPJ inválido. Deve conter exatamente 14 dígitos. Recebido: ${cnpjLimpo.length} dígitos.`,
      );
    }

    return cnpjLimpo;
  }

  /**
   * Método privado para validar hierarquia de óticas (Matriz/Filial).
   *
   * REGRAS DE NEGÓCIO:
   * 1. Se ehMatriz=true: matrizId DEVE ser null (matriz não pode ter matriz)
   * 2. Se ehMatriz=false e matrizId fornecido:
   *    a. A ótica matriz DEVE existir
   *    b. A ótica matriz DEVE ter ehMatriz=true
   *    c. Prevenir hierarquia circular (se estamos editando)
   *
   * @param ehMatriz - Se a ótica atual é uma matriz
   * @param matrizId - ID da matriz pai (se for filial)
   * @param oticaAtualId - ID da ótica atual (para prevenir circular, null se criando)
   * @throws {BadRequestException} Se hierarquia inválida
   * @private
   */
  private async _validarHierarquia(
    ehMatriz: boolean,
    matrizId: string | null | undefined,
    oticaAtualId: string | null = null,
  ): Promise<void> {
    // ========================================================================
    // REGRA 1: Matriz não pode ter matrizId
    // ========================================================================
    if (ehMatriz && matrizId) {
      throw new BadRequestException(
        'Uma ótica marcada como MATRIZ não pode ter uma matriz pai. Remova o vínculo com a matriz ou desmarque "É Matriz".',
      );
    }

    // ========================================================================
    // REGRA 2: Se matrizId fornecido, validar a matriz pai
    // ========================================================================
    if (matrizId) {
      // Busca a ótica matriz
      const matriz = await this.prisma.optica.findUnique({
        where: { id: matrizId },
      });

      // Verifica se existe
      if (!matriz) {
        throw new BadRequestException(
          `A ótica matriz informada (ID: ${matrizId}) não foi encontrada no sistema.`,
        );
      }

      // Verifica se é realmente uma matriz
      if (!matriz.ehMatriz) {
        throw new BadRequestException(
          `A ótica "${matriz.nome}" não está marcada como MATRIZ. Uma filial só pode ser vinculada a uma ótica que seja Matriz.`,
        );
      }

      // ======================================================================
      // REGRA 3: Prevenir referência circular (A→B→A)
      // ======================================================================
      // Cenário: Se estamos editando a ótica B para ter matriz A,
      // mas A já tem matriz B, teríamos um loop.
      if (oticaAtualId && matriz.matrizId === oticaAtualId) {
        throw new BadRequestException(
          `Hierarquia circular detectada! A ótica "${matriz.nome}" já é filial da ótica atual. Não é possível criar uma relação circular (A→B→A).`,
        );
      }
    }
  }

  /**
   * Lista todas as óticas cadastradas no sistema.
   *
   * Retorna óticas ativas e inativas. Para filtrar apenas ativas, use um
   * query parameter no controller (futura melhoria).
   *
   * @returns Array de óticas
   *
   * @example
   * ```
   * const oticas = await oticaService.listarTudo();
   * console.log(`Total de óticas: ${oticas.length}`);
   * ```
   */
  async listarTudo(): Promise<Optica[]> {
    this.logger.log('Listando todas as óticas');

    const oticas = await this.prisma.optica.findMany({
      orderBy: { nome: 'asc' }, // Ordena alfabeticamente por nome
      include: {
        matriz: { select: { id: true, nome: true, cnpj: true } }, // Inclui dados da matriz (se filial)
      },
    });

    this.logger.log(`📋 ${oticas.length} ótica(s) encontrada(s)`);

    return oticas;
  }

  /**
   * Busca uma ótica específica pelo ID.
   *
   * @param id - UUID da ótica
   * @returns Ótica encontrada
   *
   * @throws {NotFoundException} Se ótica não encontrada
   *
   * @example
   * ```
   * const optica = await oticaService.buscarPorId('uuid-da-optica');
   * ```
   */
  async buscarPorId(id: string): Promise<Optica> {
    this.logger.log(`Buscando ótica por ID: ${id}`);

    const optica = await this.prisma.optica.findUnique({
      where: { id },
      include: {
        matriz: { select: { id: true, nome: true, cnpj: true } },
        filiais: { select: { id: true, nome: true, cnpj: true } }, // Inclui filiais (se for matriz)
      },
    });

    if (!optica) {
      this.logger.warn(`Ótica não encontrada: ${id}`);
      throw new NotFoundException(`Ótica com ID ${id} não encontrada`);
    }

    return optica;
  }

  /**
   * Busca uma ótica pelo CNPJ (rota pública para fluxo de registro).
   *
   * Este método é usado na "Jornada de João" - quando um vendedor está se
   * auto-registrando e precisa validar se o CNPJ da ótica dele é parceira.
   *
   * Fluxo:
   * 1. Sanitiza o CNPJ enviado (remove pontuação)
   * 2. Busca no banco pelo CNPJ limpo
   * 3. Se não encontrar, lança erro amigável
   * 4. Se encontrar, retorna os dados da ótica (para exibir no frontend)
   *
   * @param cnpj - CNPJ com ou sem pontuação
   * @returns Ótica encontrada (apenas se ativa)
   *
   * @throws {BadRequestException} Se CNPJ inválido (não tem 14 dígitos)
   * @throws {NotFoundException} Se CNPJ não está cadastrado ou ótica inativa
   *
   * @example
   * ```
   * // Usuário digita CNPJ com pontuação
   * const optica = await oticaService.buscarPorCnpjPublico('12.345.678/0001-90');
   *
   * // Ou sem pontuação
   * const optica = await oticaService.buscarPorCnpjPublico('12345678000190');
   * ```
   */
  async buscarPorCnpjPublico(cnpj: string) {
    this.logger.log(`Verificando CNPJ público: ${cnpj}`);
    const cnpjLimpo = this._limparCnpj(cnpj);

    // Busca apenas óticas ativas
    const optica = await this.prisma.optica.findUnique({
      where: { cnpj: cnpjLimpo, ativa: true },
    });

    if (!optica) {
      this.logger.warn(`CNPJ não encontrado ou ótica inativa: ${cnpjLimpo}`);
      throw new NotFoundException(
        'Este CNPJ não pertence a uma ótica ativa parceira.',
      );
    }

    return optica;
  }

  /**
   * Remove uma ótica do sistema (soft delete).
   *
   * Em vez de deletar fisicamente, marca como inativa (ativa = false).
   * Isso preserva o histórico e evita quebrar relações com usuários.
   *
   * Para deleção física (hard delete), descomente a segunda implementação.
   *
   * @param id - UUID da ótica
   * @returns Ótica removida/desativada
   *
   * @throws {NotFoundException} Se ótica não encontrada
   *
   * @example
   * ```
   * await oticaService.remover('uuid-da-optica');
   * ```
   */
  async remover(id: string): Promise<Optica> {
    this.logger.log(`Removendo ótica: ${id}`);

    // Verifica se a ótica existe
    await this.buscarPorId(id);

    // Soft delete: marca como inativa em vez de deletar
    const optica = await this.prisma.optica.update({
      where: { id },
      data: { ativa: false },
    });

    this.logger.log(`✅ Ótica desativada com sucesso: ${optica.nome}`);

    return optica;

    // Hard delete (deletar fisicamente) - USE COM CUIDADO:
    // const optica = await this.prisma.optica.delete({
    //   where: { id },
    // });
    // this.logger.log(`✅ Ótica deletada permanentemente: ${optica.nome}`);
    // return optica;
  }

  /**
   * Listagem avançada do Admin, permite filtrar pelo nome, CNPJ, status e tipo (Matriz/Filial).
   *
   * REFATORAÇÃO (Tarefa 44.1):
   * - Adicionado filtro 'ehMatriz' para buscar apenas matrizes ou filiais
   *
   * @param filtros - Objeto com filtros opcionais
   * @returns Array de óticas filtradas
   */
  async listarAdmin(filtros: ListarOticasFiltroDto) {
    this.logger.log(
      `[ADMIN] Listando óticas com filtros: ${JSON.stringify(filtros)}`,
    );

    const where: Prisma.OpticaWhereInput = {};

    // Filtro: Nome (parcial, case-insensitive)
    if (filtros.nome) {
      where.nome = { contains: filtros.nome, mode: 'insensitive' };
    }

    // Filtro: CNPJ (parcial)
    if (filtros.cnpj) {
      where.cnpj = { contains: this._limparCnpj(filtros.cnpj) };
    }

    // Filtro: Ativa (string 'true' ou 'false')
    if (filtros.ativa !== undefined) {
      where.ativa = filtros.ativa === 'true';
    }

    // Filtro: ehMatriz (boolean) - NOVO (Tarefa 44.1)
    if (filtros.ehMatriz !== undefined) {
      where.ehMatriz = filtros.ehMatriz;
      this.logger.log(
        `  → Filtrando por tipo: ${filtros.ehMatriz ? 'MATRIZES' : 'FILIAIS'}`,
      );
    }

    const oticas = await this.prisma.optica.findMany({
      where,
      orderBy: { nome: 'asc' },
      include: {
        matriz: { select: { id: true, nome: true, cnpj: true } },
        filiais: { select: { id: true, nome: true, cnpj: true } },
      },
    });

    this.logger.log(`  → ${oticas.length} ótica(s) encontrada(s)`);

    return oticas;
  }

  /**
   * Busca os dados de uma ótica pelo ID (Admin, pode retornar ativa ou inativa).
   */
  async buscarPorIdAdmin(id: string) {
    this.logger.log(`Buscando ótica por ID (Admin): ${id}`);
    const optica = await this.prisma.optica.findUnique({
      where: { id },
      include: {
        matriz: { select: { id: true, nome: true, cnpj: true } },
        filiais: { select: { id: true, nome: true, cnpj: true } },
      },
    });
    if (!optica) {
      this.logger.warn(`Ótica não encontrada, ID: ${id}`);
      throw new NotFoundException(`Ótica com ID ${id} não encontrada.`);
    }
    return optica;
  }

  /**
   * Criação de ótica (Admin), sempre com ativa: true.
   *
   * REFATORAÇÃO (Tarefa 44.1):
   * - Implementadas validações de hierarquia Matriz/Filial
   * - Adicionados logs de auditoria detalhados
   *
   * @param dto - Dados da ótica a ser criada
   * @returns Ótica criada
   */
  async criar(dto: CriarOticaDto) {
    this.logger.log(`[ADMIN] Criando nova ótica: ${dto.nome}`);

    // ==========================================================================
    // SANITIZAÇÃO DO CNPJ
    // ==========================================================================
    const cnpjLimpo = this._limparCnpj(dto.cnpj);

    // ==========================================================================
    // VALIDAÇÃO DE DUPLICIDADE (CNPJ)
    // ==========================================================================
    const opticaExistente = await this.prisma.optica.findUnique({
      where: { cnpj: cnpjLimpo },
    });

    if (opticaExistente) {
      this.logger.warn(
        `Tentativa de cadastro duplicado: CNPJ ${cnpjLimpo} já pertence a "${opticaExistente.nome}"`,
      );
      throw new ConflictException(
        `Já existe uma ótica cadastrada com o CNPJ ${dto.cnpj}: "${opticaExistente.nome}".`,
      );
    }

    // ==========================================================================
    // VALIDAÇÃO DE HIERARQUIA (Tarefa 44.1)
    // ==========================================================================
    const ehMatriz = dto.ehMatriz ?? false; // Padrão: false
    const matrizId = dto.matrizId ?? null;

    await this._validarHierarquia(ehMatriz, matrizId, null);

    // ==========================================================================
    // CRIAÇÃO DA ÓTICA
    // ==========================================================================
    const optica = await this.prisma.optica.create({
      data: {
        cnpj: cnpjLimpo,
        nome: dto.nome,
        endereco: dto.endereco,
        cidade: dto.cidade,
        estado: dto.estado,
        telefone: dto.telefone,
        email: dto.email,
        ativa: true, // Sempre cria como ativa
        ehMatriz,
        matrizId,
      },
      include: {
        matriz: { select: { id: true, nome: true } },
      },
    });

    // ==========================================================================
    // LOGS DE AUDITORIA
    // ==========================================================================
    this.logger.log(`✅ Ótica criada com sucesso: ${optica.nome}`);
    this.logger.log(`  → ID: ${optica.id}`);
    this.logger.log(`  → CNPJ: ${cnpjLimpo}`);
    this.logger.log(`  → Tipo: ${ehMatriz ? 'MATRIZ' : 'FILIAL'}`);
    if (optica.matriz) {
      this.logger.log(`  → Matriz Pai: ${optica.matriz.nome}`);
    }

    return optica;
  }

  /**
   * Atualiza os dados de uma ótica existente.
   *
   * REFATORAÇÃO (Tarefa 44.1):
   * - Implementadas validações de hierarquia ao alterar ehMatriz/matrizId
   * - Prevenir alterar matriz para filial se tiver filiais vinculadas
   *
   * @param id - UUID da ótica
   * @param dto - Dados a serem atualizados
   * @returns Ótica atualizada
   */
  async atualizar(id: string, dto: AtualizarOticaDto) {
    this.logger.log(`[ADMIN] Atualizando ótica, ID: ${id}`);

    // Busca a ótica atual
    const oticaAtual = await this.buscarPorIdAdmin(id);

    // ==========================================================================
    // VALIDAÇÃO ESPECIAL: Não pode mudar Matriz para Filial se tiver filiais
    // ==========================================================================
    if (
      dto.ehMatriz === false &&
      oticaAtual.ehMatriz === true &&
      oticaAtual.filiais &&
      oticaAtual.filiais.length > 0
    ) {
      throw new BadRequestException(
        `Não é possível alterar esta ótica para FILIAL pois ela possui ${oticaAtual.filiais.length} filial(is) vinculada(s). Desvincule as filiais primeiro.`,
      );
    }

    // ==========================================================================
    // VALIDAÇÃO DE CNPJ (SE ALTERADO)
    // ==========================================================================
    if (dto.cnpj) {
      const cnpjLimpo = this._limparCnpj(dto.cnpj);
      const opticaComMesmoCnpj = await this.prisma.optica.findUnique({
        where: { cnpj: cnpjLimpo },
      });

      if (opticaComMesmoCnpj && opticaComMesmoCnpj.id !== id) {
        this.logger.warn(
          `Tentativa de atualizar para CNPJ duplicado: ${cnpjLimpo}`,
        );
        throw new ConflictException(
          `Já existe outra ótica cadastrada com o CNPJ ${dto.cnpj}: "${opticaComMesmoCnpj.nome}".`,
        );
      }

      dto.cnpj = cnpjLimpo;
    }

    // ==========================================================================
    // VALIDAÇÃO DE HIERARQUIA (SE ehMatriz OU matrizId ALTERADOS)
    // ==========================================================================
    if (dto.ehMatriz !== undefined || dto.matrizId !== undefined) {
      const novoEhMatriz = dto.ehMatriz ?? oticaAtual.ehMatriz;
      const novoMatrizId = dto.matrizId !== undefined ? dto.matrizId : oticaAtual.matrizId;

      await this._validarHierarquia(novoEhMatriz, novoMatrizId, id);
    }

    // ==========================================================================
    // ATUALIZAÇÃO
    // ==========================================================================
    const oticaAtualizada = await this.prisma.optica.update({
      where: { id },
      data: dto,
      include: {
        matriz: { select: { id: true, nome: true } },
        filiais: { select: { id: true, nome: true } },
      },
    });

    this.logger.log(`✅ Ótica atualizada: ${oticaAtualizada.nome}`);

    return oticaAtualizada;
  }

  /**
   * Marca ótica como inativa (soft delete).
   */
  async desativar(id: string) {
    this.logger.log(`[ADMIN] Desativando ótica: ${id}`);
    await this.buscarPorIdAdmin(id);
    const optica = await this.prisma.optica.update({
      where: { id },
      data: { ativa: false },
    });
    this.logger.log(`✅ Ótica desativada: ${optica.nome}`);
    return optica;
  }

  /**
   * Reativa uma ótica (ativa: true).
   */
  async reativar(id: string) {
    this.logger.log(`[ADMIN] Reativando ótica: ${id}`);
    await this.buscarPorIdAdmin(id);
    const optica = await this.prisma.optica.update({
      where: { id },
      data: { ativa: true },
    });
    this.logger.log(`✅ Ótica reativada: ${optica.nome}`);
    return optica;
  }

  /**
   * Atualiza a visibilidade do ranking para os vendedores de uma ótica.
   * Acessível por Gerentes para sua própria ótica.
   */
  async atualizarVisibilidadeRanking(opticaId: string, visivel: boolean): Promise<Optica> {
    this.logger.log(
      `[GERENTE] Alterando visibilidade do ranking para ${visivel} na ótica ${opticaId}`,
    );
    return this.prisma.optica.update({
      where: { id: opticaId },
      data: { rankingVisivelParaVendedores: visivel },
    });
  }

  /**
   * Retorna uma lista simplificada de óticas (id, nome).
   * Ideal para popular dropdowns no frontend.
   */
  async listarSimples() {
    this.logger.log('[ADMIN] Listando óticas (versão simples)');
    return this.prisma.optica.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
      },
    });
  }
}

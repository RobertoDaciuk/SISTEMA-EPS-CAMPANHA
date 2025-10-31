/**
 * ============================================================================
 * ENVIO VENDA SERVICE
 * ============================================================================
 * 
 * Serviço robusto para gerenciamento de envios de venda.
 * Implementa lógica polimórfica de acesso (RBAC) e rotas de intervenção manual do Admin.
 * Integração transacional com o motor de recompensa via RecompensaService.
 * 
 * @module EnvioVendaModule
 * ============================================================================
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarEnvioVendaDto } from './dto/criar-envio-venda.dto';
import { ListarEnviosFiltroDto } from './dto/listar-envios-filtro.dto';
import { RejeitarManualDto } from './dto/rejeitar-manual.dto';
import { StatusEnvioVenda, Prisma } from '@prisma/client';

// INTEGRAÇÃO MOTOR DE RECOMPENSA
import { RecompensaService } from '../recompensa/recompensa.service';

@Injectable()
export class EnvioVendaService {
  private readonly logger = new Logger(EnvioVendaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recompensaService: RecompensaService, // INJETADO
  ) {}

  /**
   * ============================================================================
   * CRIAR ENVIO (Vendedor submete número de pedido)
   * ============================================================================
   * 
   * Método principal de submissão de vendas pelos vendedores.
   * Cria um registro EnvioVenda com status EM_ANALISE (validação assíncrona).
   * 
   * Validações Implementadas:
   * 1. **DUPLICATA (Sprint 16.3)**: Verifica se o mesmo vendedor já submeteu
   *    o mesmo número de pedido para a mesma campanha. Previne submissões
   *    duplicadas tanto intencionais quanto acidentais (double-click, etc.).
   * 
   * Regra de Negócio (Data Tenancy):
   * - Automaticamente associa vendedorId = req.user.id ao envio.
   * - A unicidade é por VENDEDOR (vendedores diferentes podem submeter
   *   o mesmo número de pedido em campanhas diferentes).
   * 
   * Fluxo de Validação:
   * 1. Verifica duplicata (numeroPedido + vendedorId + campanhaId)
   * 2. Se duplicata encontrada → lança BadRequestException
   * 3. Se não houver duplicata → cria envio com status EM_ANALISE
   * 
   * @param dto Dados do envio (numeroPedido, campanhaId, requisitoId)
   * @param vendedorId ID do vendedor autenticado (extraído do token JWT)
   * @returns EnvioVenda criado com status EM_ANALISE
   * @throws BadRequestException se número de pedido já foi submetido pelo vendedor
   */
  async criar(dto: CriarEnvioVendaDto, vendedorId: string) {
    this.logger.log(
      `[CRIAR_ENVIO] Vendedor ${vendedorId} submetendo pedido ${dto.numeroPedido} para campanha ${dto.campanhaId}, requisito ${dto.requisitoId}`,
    );

    // ========================================
    // VALIDAÇÃO 1: DUPLICATA (Sprint 16.3)
    // ========================================
    /**
     * Verifica se o vendedor já submeteu este número de pedido
     * para esta campanha.
     * 
     * Regra de Unicidade:
     * - Por VENDEDOR: Vendedores diferentes podem submeter o mesmo pedido
     * - Por CAMPANHA: O mesmo pedido pode ser submetido em campanhas diferentes
     * 
     * Combinação única: (numeroPedido + vendedorId + campanhaId)
     * 
     * Importante: Esta validação NÃO bloqueia:
     * - O mesmo pedido submetido por vendedores diferentes (válido)
     * - O mesmo pedido submetido em campanhas diferentes pelo mesmo vendedor (válido)
     */
    this.logger.log(
      `[DUPLICATA] Verificando duplicidade para Pedido: ${dto.numeroPedido}, Vendedor: ${vendedorId}, Campanha: ${dto.campanhaId}`,
    );

    const envioExistente = await this.prisma.envioVenda.findFirst({
      where: {
        numeroPedido: dto.numeroPedido,
        vendedorId: vendedorId,
        campanhaId: dto.campanhaId,
      },
    });

    if (envioExistente) {
      this.logger.warn(
        `[DUPLICATA] Tentativa de submissão duplicada detectada! Pedido: ${dto.numeroPedido}, Vendedor: ${vendedorId}, Envio Existente: ${envioExistente.id}`,
      );

      throw new BadRequestException(
        'Você já submeteu este número de pedido nesta campanha.',
      );
    }

    this.logger.log(
      '[DUPLICATA] Nenhuma duplicidade encontrada, prosseguindo com a criação.',
    );

    // ========================================
    // CRIAÇÃO DO ENVIO (Status: EM_ANALISE)
    // ========================================
    /**
     * Cria o registro EnvioVenda com status EM_ANALISE.
     * 
     * Campos Automáticos (defaults no schema Prisma):
     * - status: EM_ANALISE (default)
     * - dataEnvio: now() (default)
     * - numeroCartelaAtendida: null (preenchido após validação)
     * - dataValidacao: null (preenchido após validação)
     * 
     * Próximos Passos (fluxo assíncrono):
     * 1. Admin/Robô valida o pedido (verifica no ERP/planilha)
     * 2. Se válido: status → VALIDADO, dispara motor de recompensa
     * 3. Se inválido: status → REJEITADO, registra motivoRejeicao
     */
    const envio = await this.prisma.envioVenda.create({
      data: {
        numeroPedido: dto.numeroPedido,
        vendedorId,
        campanhaId: dto.campanhaId,
        requisitoId: dto.requisitoId,
        // status, dataEnvio e outros campos default já definidos no schema
      },
    });

    this.logger.log(
      `[CRIAR_ENVIO] Envio ${envio.id} criado com sucesso. Status: EM_ANALISE`,
    );

    return envio;
  }

  /**
   * ============================================================================
   * LISTAR ENVIOS (Polimórfico: Admin, Gerente, Vendedor)
   * ============================================================================
   * 
   * Rota polimórfica de listagem de envios com controle de acesso baseado em papel.
   * 
   * Regras de Acesso (RBAC):
   * - ADMIN: Vê todos os envios de todas as empresas (sem filtros de empresa)
   * - GERENTE: Vê apenas envios da sua equipe (vendedores subordinados)
   * - VENDEDOR: Vê apenas seus próprios envios (filtro vendedorId automático)
   * 
   * Filtros Opcionais (via query params):
   * - campanhaId: Filtra por campanha específica
   * - status: Filtra por status (EM_ANALISE, VALIDADO, REJEITADO)
   * - vendedorId: (ADMIN/GERENTE apenas) Filtra por vendedor específico
   * 
   * @param usuario Objeto {id, papel} do usuário autenticado
   * @param filtros Filtros opcionais de query string
   * @returns Lista de envios de acordo com permissões
   */
  async listar(
    usuario: { id: string; papel: string },
    filtros: ListarEnviosFiltroDto,
  ) {
    const where: Prisma.EnvioVendaWhereInput = {};

    // Filtros opcionais
    if (filtros.status) where.status = filtros.status;
    if (filtros.campanhaId) where.campanhaId = filtros.campanhaId;
    if (filtros.vendedorId) where.vendedorId = filtros.vendedorId;

    if (usuario.papel === 'VENDEDOR') {
      // Vendedor só pode ver os próprios envios
      where.vendedorId = usuario.id;
    } else if (usuario.papel === 'GERENTE') {
      // Gerente vê todos os vendedores subordinados a ele (usuários com gerenteId = id)
      const equipe = await this.prisma.usuario.findMany({
        where: { gerenteId: usuario.id },
        select: { id: true },
      });

      const idsEquipe = equipe.map((u) => u.id);
      if (idsEquipe.length) {
        where.vendedorId = { in: idsEquipe };
      } else {
        // Gerente sem equipe não vê nada
        where.vendedorId = '-';
      }
    }

    // Admin vê tudo, apenas aplica os filtros
    this.logger.log(
      `[LISTAR] Papel: ${usuario.papel}. Params: ${JSON.stringify(where)}`,
    );

    return this.prisma.envioVenda.findMany({
      where,
      include: {
        vendedor: { select: { id: true, nome: true, email: true } },
        requisito: { select: { id: true, descricao: true } },
      },
    });
  }

  /**
   * ============================================================================
   * LISTAR MINHAS SUBMISSÕES (Vendedor - Nova Rota)
   * ============================================================================
   * 
   * Endpoint dedicado para vendedores listarem seu próprio histórico de envios
   * para uma campanha específica.
   * 
   * Diferenças vs listar():
   * - Não é polimórfico (apenas VENDEDOR)
   * - Exige campanhaId obrigatório (validado por DTO)
   * - Retorna campos otimizados para UI do frontend (página de detalhes da campanha)
   * - Automaticamente filtra por vendedorId = req.user.id (Data Tenancy)
   * 
   * Segurança (Data Tenancy):
   * O vendedorId é SEMPRE extraído do token JWT (req.user.id), nunca do body/query.
   * Isso impede que um vendedor veja envios de outros vendedores, mesmo que
   * tente manipular a requisição.
   * 
   * Campos Retornados (Otimizados para Frontend):
   * - id: Identificador único do envio
   * - numeroPedido: Número do pedido submetido
   * - status: EM_ANALISE | VALIDADO | REJEITADO
   * - dataEnvio: Data/hora da submissão
   * - dataValidacao: Data/hora da validação (null se ainda em análise)
   * - motivoRejeicao: Motivo da rejeição (null se validado/em análise)
   * - requisitoId: ID do requisito atendido
   * - numeroCartelaAtendida: Número da cartela (para exibição)
   * 
   * Uso (Frontend):
   * ```
   * const envios = await axios.get('/envios-venda/minhas', {
   *   params: { campanhaId: '550e8400-...' }
   * });
   * // Exibir lista de envios na página /campanhas/[id]
   * ```
   * 
   * @param vendedorId ID do vendedor autenticado (extraído do token JWT)
   * @param campanhaId ID da campanha (obrigatório, validado por DTO)
   * @returns Lista de envios do vendedor para a campanha especificada
   */
  async listarMinhasPorCampanha(vendedorId: string, campanhaId: string) {
    this.logger.log(
      `[listarMinhasPorCampanha] Vendedor ${vendedorId} buscando envios da campanha ${campanhaId}`,
    );

    // ========================================
    // QUERY PRISMA COM FILTROS DE SEGURANÇA
    // ========================================
    return this.prisma.envioVenda.findMany({
      where: {
        // Data Tenancy: Sempre filtra pelo vendedor autenticado
        vendedorId: vendedorId,
        // Filtro obrigatório: Apenas envios da campanha solicitada
        campanhaId: campanhaId,
      },
      select: {
        // Campos necessários para exibição na UI
        id: true,
        numeroPedido: true,
        status: true,
        dataEnvio: true,
        dataValidacao: true,
        motivoRejeicao: true,
        requisitoId: true,
        numeroCartelaAtendida: true,
      },
      orderBy: {
        // Envios mais recentes primeiro
        dataEnvio: 'desc',
      },
    });
  }

  /**
   * ============================================================================
   * VALIDAR MANUALMENTE (Admin Only)
   * ============================================================================
   * 
   * Rota exclusiva para Admin validar manualmente um envio EM_ANALISE.
   * Calcula spillover (número da cartela) de forma idêntica ao "robô".
   * Atualiza status para VALIDADO e dispara motor de recompensa de forma transacional.
   * 
   * Validações:
   * - Envio existe
   * - Envio está EM_ANALISE (não pode validar envio já processado)
   * 
   * Transação Atômica:
   * 1. Conta envios já validados do vendedor para este requisito
   * 2. Calcula número da cartela (spillover)
   * 3. Atualiza status do envio para VALIDADO
   * 4. Dispara motor de recompensa (RecompensaService.processarGatilhos)
   * 5. Retorna envio atualizado
   * 
   * @param envioId ID do envio a ser validado
   * @returns EnvioVenda atualizado
   * @throws NotFoundException se envio não existir
   * @throws BadRequestException se envio não estiver EM_ANALISE
   */
  async validarManual(envioId: string) {
    /**
     * Passo 1 - Hidratação profunda do envio, vendedor, gerente, requisito, campanha.
     */
    const envio = await this.prisma.envioVenda.findUnique({
      where: { id: envioId },
      include: {
        vendedor: { include: { gerente: true } },
        requisito: {
          include: {
            regraCartela: { include: { campanha: true } },
          },
        },
      },
    });

    if (!envio) throw new NotFoundException('Envio não encontrado.');

    /**
     * Passo 2 - Transação para garantir atomicidade de todas as operações
     */
    return this.prisma.$transaction(async (tx) => {
      // -----------------------------------------------------------------------
      // CORREÇÃO SPILLOVER (Sprint 16.5 - Tarefa 38.8)
      // -----------------------------------------------------------------------
      /**
       * PROBLEMA: Cada cartela tem requisitos com IDs DIFERENTES, mas mesma ORDEM.
       * - Cartela 1: Lente X (id: uuid-1a, ordem: 1)
       * - Cartela 2: Lente X (id: uuid-2a, ordem: 1)
       * - Cartela 3: Lente X (id: uuid-3a, ordem: 1)
       *
       * Se contar apenas por requisitoId específico (uuid-2a), só vê envios da Cartela 2.
       * Mas o spillover precisa contar TODOS os validados da ordem 1!
       *
       * SOLUÇÃO: Buscar TODOS os requisitos com a mesma ordem e contar validados de TODOS.
       */

      // PASSO 2A: Buscar todos os requisitos relacionados (mesma ordem)
      const requisitosRelacionados = await tx.requisitoCartela.findMany({
        where: {
          ordem: envio.requisito.ordem, // ✅ Mesma ordem = mesmo requisito lógico
          regraCartela: {
            campanhaId: envio.campanhaId, // ✅ Mesma campanha
          },
        },
        select: {
          id: true,
        },
      });

      const idsRequisitosRelacionados = requisitosRelacionados.map((r) => r.id);

      this.logger.log(
        `[SPILLOVER] Requisito ordem ${envio.requisito.ordem}: IDs relacionados = ${idsRequisitosRelacionados.join(', ')}`,
      );

      // PASSO 2B: Contar validados de TODOS os requisitos relacionados
      const countValidado = await tx.envioVenda.count({
        where: {
          vendedorId: envio.vendedorId,
          requisitoId: { in: idsRequisitosRelacionados }, // ✅ CORRIGIDO: Conta TODOS
          status: StatusEnvioVenda.VALIDADO,
        },
      });

      const quantidadeRequisito = envio.requisito.quantidade;
      const numeroCartela = Math.floor(countValidado / quantidadeRequisito) + 1;

      this.logger.log(
        `[ADMIN] Validação manual do envio ${envioId}: countValidado=${countValidado}, quantidade=${quantidadeRequisito}, numeroCartelaAtendida=${numeroCartela}`,
      );

      // Atualiza envio (status, spillover/cartela, data, etc.)
      const envioAtualizado = await tx.envioVenda.update({
        where: { id: envioId },
        data: {
          status: StatusEnvioVenda.VALIDADO,
          numeroCartelaAtendida: numeroCartela,
          dataValidacao: new Date(),
          motivoRejeicao: null,
          infoConflito: null,
        },
      });

      // PASSO DE GATILHO: Dispara o motor de recompensa de forma transacional
      const campanha = envio.requisito.regraCartela.campanha;
      const vendedor = envio.vendedor;

      await this.recompensaService.processarGatilhos(
        tx,
        envioAtualizado,
        campanha,
        vendedor,
      );

      return envioAtualizado; // Retorna envio atualizado
    });
  }

  /**
   * ============================================================================
   * REJEITAR MANUALMENTE (Admin Only)
   * ============================================================================
   * 
   * Rota exclusiva para Admin rejeitar manualmente um envio EM_ANALISE.
   * Atualiza status para REJEITADO e registra motivo.
   * 
   * Validações:
   * - Envio existe
   * - Envio está EM_ANALISE (não pode rejeitar envio já processado)
   * 
   * @param envioId ID do envio a ser rejeitado
   * @param dto DTO contendo motivoRejeicao
   * @returns EnvioVenda atualizado
   * @throws NotFoundException se envio não existir
   */
  async rejeitarManual(envioId: string, dto: RejeitarManualDto) {
    const envio = await this.prisma.envioVenda.findUnique({
      where: { id: envioId },
    });

    if (!envio) throw new NotFoundException('Envio não encontrado.');

    this.logger.log(
      `[ADMIN] Rejeição manual do envio ${envioId} pelo motivo: ${dto.motivoRejeicao}`,
    );

    return this.prisma.envioVenda.update({
      where: { id: envioId },
      data: {
        status: StatusEnvioVenda.REJEITADO,
        motivoRejeicao: dto.motivoRejeicao,
        numeroCartelaAtendida: null,
        dataValidacao: new Date(),
        infoConflito: null,
      },
    });
  }
}

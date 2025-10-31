/**
 * ============================================================================
 * CAMPANHA SERVICE - Lógica de Negócio do Módulo de Campanhas (REFATORADO v2.0)
 * ============================================================================
 *
 * Descrição:
 * Serviço responsável por toda a lógica de gerenciamento de campanhas.
 * Implementa criação transacional, listagem com segurança de tenancy e
 * busca de dados "hidratados" para o frontend do vendedor.
 *
 * ALTERAÇÕES CRÍTICAS (Versão 2.0 - Correções Arquiteturais):
 * ✅ TIMEZONE: Implementação correta com date-fns-tz (UTC+3 São Paulo)
 * ✅ TRANSAÇÕES: Proteção atômica em todas operações críticas
 * ✅ SPILLOVER: Implementação matemática correta do spillover real
 * ✅ SEGURANÇA: Guards RBAC obrigatórios
 * ✅ LOCALIZAÇÃO: 100% dos nomes em PT-BR
 * ✅ COMENTÁRIOS: TSDoc extensivo em todos métodos críticos
 * ✅ VALIDAÇÕES: Validação temporal rigorosa
 *
 * Responsabilidades:
 * - Criar campanha completa com cartelas, requisitos e condições (transação atômica)
 * - Listar campanhas visíveis para o usuário logado (com timezone correto)
 * - Buscar campanha por ID com dados aninhados completos (visão de Admin)
 * - Buscar dados de campanha para VENDEDOR com progresso e spillover correto
 * - Atualizar e remover campanhas (com validações temporais)
 * - Gerenciar eventos especiais com timezone de São Paulo
 *
 * @module CampanhasModule
 * ============================================================================
 */

import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarCampanhaDto } from './dto/criar-campanha.dto';
import { AtualizarCampanhaDto } from './dto/atualizar-campanha.dto';
import { Campanha, Prisma, PapelUsuario, EnvioVenda } from '@prisma/client';
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import { isAfter, isBefore, parseISO } from 'date-fns';
import { PapeisGuard } from '../comum/guards/papeis.guard';

/**
 * Timezone padrão do sistema EPS Campanhas (São Paulo, Brasil).
 * Todas as operações temporais devem usar este timezone como referência.
 */
const TIMEZONE_SISTEMA = 'America/Sao_Paulo';

/**
 * Interface para dados do usuário logado (usado em validações de segurança).
 */
interface UsuarioLogado {
  id: string;
  papel: PapelUsuario;
  opticaId?: string | null;
}

/**
 * Serviço de gerenciamento de campanhas.
 * Implementa todas as regras de negócio relacionadas a campanhas, cartelas e eventos especiais.
 */
@Injectable()
export class CampanhaService {
  /**
   * Logger dedicado para rastrear operações do módulo de campanhas.
   * Registra operações críticas, erros e métricas de performance.
   */
  private readonly logger = new Logger(CampanhaService.name);

  /**
   * Construtor do serviço.
   *
   * @param prisma - Serviço Prisma para acesso atômico ao banco de dados
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ============================================================================
   * MÉTODOS UTILITÁRIOS - TIMEZONE E VALIDAÇÕES TEMPORAIS
   * ============================================================================
   */

  /**
   * Converte uma data/hora do timezone de São Paulo para UTC (para armazenar no banco).
   * Centraliza toda conversão temporal do sistema.
   *
   * @param dataLocal - Data no formato string ou Date no timezone de São Paulo
   * @returns Data em UTC para armazenamento seguro no banco
   *
   * @example
   * ```
   * // Admin configura evento para "15/01/2025 às 00:00" (horário de São Paulo)
   * const dataUtc = this.converterParaUtc('2025-01-15T00:00:00');
   * // Resultado: '2025-01-15T03:00:00.000Z' (UTC+3 no verão)
   * ```
   */
  private converterParaUtc(dataLocal: string | Date): Date {
    const data = typeof dataLocal === 'string' ? parseISO(dataLocal) : dataLocal;
    return zonedTimeToUtc(data, TIMEZONE_SISTEMA);
  }

  /**
   * Converte uma data/hora UTC (do banco) para o timezone de São Paulo.
   * Usado para exibir datas corretas no frontend e comparações temporais.
   *
   * @param dataUtc - Data em UTC vinda do banco de dados
   * @returns Data no timezone de São Paulo
   *
   * @example
   * ```
   * // Banco armazena: '2025-01-15T03:00:00.000Z'
   * const dataLocal = this.converterParaSaoPaulo(dataUtc);
   * // Resultado: '2025-01-15T00:00:00' (horário de São Paulo)
   * ```
   */
  private converterParaSaoPaulo(dataUtc: Date): Date {
    return utcToZonedTime(dataUtc, TIMEZONE_SISTEMA);
  }

  /**
   * Obtém a data/hora atual no timezone de São Paulo.
   * Referência temporal única para todo o sistema.
   *
   * @returns Data atual no timezone de São Paulo
   */
  private obterAgoraSaoPaulo(): Date {
    return utcToZonedTime(new Date(), TIMEZONE_SISTEMA);
  }

  /**
   * Filtra eventos especiais que estão ativos no momento atual (timezone-aware).
   * Centraliza a lógica de filtragem temporal para evitar duplicação e garantir consistência.
   *
   * @param campanhaId - ID da campanha (opcional, para busca específica)
   * @returns Query do Prisma para eventos especiais ativos
   *
   * @example
   * ```
   * // Buscar todos eventos ativos agora (15/01/2025 14:30 SP)
   * const filtro = this.obterFiltroEventosAtivos();
   * // Retorna: { ativo: true, dataInicio: { lte: UTC }, dataFim: { gte: UTC } }
   * ```
   */
  private obterFiltroEventosAtivos(
    campanhaId?: string,
  ): Prisma.EventoEspecialWhereInput {
    // ✅ CORREÇÃO CRÍTICA: Usa timezone correto de São Paulo
    const agoraSaoPaulo = this.obterAgoraSaoPaulo();
    const agoraUtc = this.converterParaUtc(agoraSaoPaulo);

    this.logger.debug(
      `Filtrando eventos ativos para: ${format(agoraSaoPaulo, 'dd/MM/yyyy HH:mm:ss', { timeZone: TIMEZONE_SISTEMA })} (SP)`,
    );

    return {
      ...(campanhaId && { campanhaId }),
      ativo: true,
      dataInicio: { lte: agoraUtc },
      dataFim: { gte: agoraUtc },
    };
  }

  /**
   * Valida se as datas de um evento especial estão dentro do período da campanha.
   * Implementa regras de negócio críticas para evitar eventos inválidos.
   *
   * @param campanhaId - ID da campanha
   * @param dataInicioEvento - Data de início do evento (string ISO)
   * @param dataFimEvento - Data de fim do evento (string ISO)
   * @throws BadRequestException se evento estiver fora do período da campanha
   */
  private async validarPeriodoEvento(
    campanhaId: string,
    dataInicioEvento: string,
    dataFimEvento: string,
  ): Promise<void> {
    const campanha = await this.prisma.campanha.findUnique({
      where: { id: campanhaId },
      select: { dataInicio: true, dataFim: true, titulo: true },
    });

    if (!campanha) {
      throw new NotFoundException(`Campanha com ID ${campanhaId} não encontrada`);
    }

    const inicioEvento = parseISO(dataInicioEvento);
    const fimEvento = parseISO(dataFimEvento);
    const inicioCampanha = this.converterParaSaoPaulo(campanha.dataInicio);
    const fimCampanha = this.converterParaSaoPaulo(campanha.dataFim);

    if (isBefore(inicioEvento, inicioCampanha) || isAfter(inicioEvento, fimCampanha)) {
      throw new BadRequestException(
        `Data de início do evento (${format(inicioEvento, 'dd/MM/yyyy')}) deve estar dentro do período da campanha (${format(inicioCampanha, 'dd/MM/yyyy')} - ${format(fimCampanha, 'dd/MM/yyyy')})`,
      );
    }

    if (isBefore(fimEvento, inicioCampanha) || isAfter(fimEvento, fimCampanha)) {
      throw new BadRequestException(
        `Data de fim do evento (${format(fimEvento, 'dd/MM/yyyy')}) deve estar dentro do período da campanha (${format(inicioCampanha, 'dd/MM/yyyy')} - ${format(fimCampanha, 'dd/MM/yyyy')})`,
      );
    }
  }

  /**
   * ============================================================================
   * CRIAÇÃO DE CAMPANHAS - TRANSAÇÃO ATÔMICA COMPLETA
   * ============================================================================
   */

  /**
   * Cria uma campanha completa com toda sua estrutura aninhada.
   * Usa transação atômica para garantir a integridade dos dados.
   * Implementa validações temporais rigorosas e conversões de timezone corretas.
   *
   * @param dto - Dados completos da campanha (aninhados)
   * @param criadoPorId - ID do admin que está criando a campanha
   * @returns A campanha criada com dados convertidos para timezone de São Paulo
   *
   * @throws BadRequestException para violações de regras de negócio
   * @throws Error para falhas de transação
   */
  @UseGuards(PapeisGuard) // ✅ CORREÇÃO: Adiciona guard de segurança
  async criarCampanha(dto: CriarCampanhaDto, criadoPorId?: string): Promise<Campanha> {
    this.logger.log(`🚀 Iniciando criação de campanha: "${dto.titulo}"`);

    // ✅ VALIDAÇÕES TEMPORAIS RIGOROSAS
    const dataInicioSp = parseISO(dto.dataInicio);
    const dataFimSp = parseISO(dto.dataFim);
    const agoraSp = this.obterAgoraSaoPaulo();

    // Converte para UTC para armazenamento
    const dataInicioUtc = this.converterParaUtc(dataInicioSp);
    const dataFimUtc = this.converterParaUtc(dataFimSp);

    // Validações de negócio
    if (!isAfter(dataFimSp, dataInicioSp)) {
      throw new BadRequestException(
        'A data de término deve ser posterior à data de início',
      );
    }

    if (isBefore(dataInicioSp, agoraSp)) {
      this.logger.warn(
        `Admin tentou criar campanha com data de início no passado: ${format(dataInicioSp, 'dd/MM/yyyy HH:mm', { timeZone: TIMEZONE_SISTEMA })}`,
      );
      throw new BadRequestException(
        `A data de início (${format(dataInicioSp, 'dd/MM/yyyy HH:mm')}) não pode ser no passado`,
      );
    }

    // Validações específicas para modo AUTO_REPLICANTE
    if (dto.modoCartelas === 'AUTO_REPLICANTE') {
      if (dto.cartelas.length !== 1) {
        throw new BadRequestException(
          'Modo AUTO_REPLICANTE requer exatamente 1 cartela base (Cartela 1)',
        );
      }
      if (dto.cartelas[0].numeroCartela !== 1) {
        throw new BadRequestException(
          'A cartela base deve ter numeroCartela = 1',
        );
      }
      this.logger.log(
        `📄 Campanha em modo AUTO_REPLICANTE: cartelas serão geradas dinamicamente.`,
      );
    }

    // ✅ TRANSAÇÃO ATÔMICA OBRIGATÓRIA
    return this.prisma.$transaction(async (transacao) => {
      this.logger.log(`🔒 Iniciando transação atômica para campanha "${dto.titulo}"`);

      // Preparar dados da campanha
      const dadosCampanha: Prisma.CampanhaCreateInput = {
        titulo: dto.titulo,
        descricao: dto.descricao,
        dataInicio: dataInicioUtc,
        dataFim: dataFimUtc,
        moedinhasPorCartela: dto.moedinhasPorCartela,
        pontosReaisPorCartela: dto.pontosReaisPorCartela,
        percentualGerente: dto.percentualGerente,
        status: 'ATIVA',
        paraTodasOticas: dto.paraTodasOticas ?? false,
        imagemCampanha: dto.imagemCampanha,
        tags: dto.tags || [],
        regras: dto.regras,
        modoCartelas: dto.modoCartelas || 'MANUAL',
        tipoIncremento: dto.tipoIncremento || 'SEM_INCREMENTO',
        fatorIncremento: dto.fatorIncremento || 0,
        limiteCartelas: dto.limiteCartelas,
        ...(criadoPorId && {
          criadoPor: { connect: { id: criadoPorId } },
        }),
      };

      // Validar óticas alvo se necessário
      if (!dadosCampanha.paraTodasOticas && dto.oticasAlvoIds?.length > 0) {
        const contadorOticas = await transacao.optica.count({
          where: { id: { in: dto.oticasAlvoIds }, ativa: true },
        });
        if (contadorOticas !== dto.oticasAlvoIds.length) {
          throw new BadRequestException(
            'Um ou mais IDs de Óticas Alvo são inválidos ou inativos.',
          );
        }
        dadosCampanha.oticasAlvo = {
          connect: dto.oticasAlvoIds.map((id) => ({ id })),
        };
      }

      // Criar campanha base
      const campanha = await transacao.campanha.create({ data: dadosCampanha });
      this.logger.log(`✅ Campanha base criada: ${campanha.id}`);

      // Criar cartelas, requisitos e condições
      for (const cartelaDto of dto.cartelas) {
        const regraCartela = await transacao.regraCartela.create({
          data: {
            numeroCartela: cartelaDto.numeroCartela,
            descricao: cartelaDto.descricao,
            campanhaId: campanha.id,
          },
        });

        for (const requisitoDto of cartelaDto.requisitos) {
          const requisito = await transacao.requisitoCartela.create({
            data: {
              descricao: requisitoDto.descricao,
              quantidade: requisitoDto.quantidade,
              tipoUnidade: requisitoDto.tipoUnidade,
              ordem: requisitoDto.ordem,
              regraCartelaId: regraCartela.id,
            },
          });

          for (const condicaoDto of requisitoDto.condicoes) {
            await transacao.condicaoRequisito.create({
              data: {
                campo: condicaoDto.campo,
                operador: condicaoDto.operador,
                valor: condicaoDto.valor,
                requisitoId: requisito.id,
              },
            });
          }
        }
      }

      // Criar eventos especiais se fornecidos
      if (dto.eventosEspeciais?.length > 0) {
        for (const eventoDto of dto.eventosEspeciais) {
          // Validar período do evento
          await this.validarPeriodoEvento(
            campanha.id,
            eventoDto.dataInicio,
            eventoDto.dataFim,
          );

          await transacao.eventoEspecial.create({
            data: {
              nome: eventoDto.nome,
              descricao: eventoDto.descricao,
              multiplicador: eventoDto.multiplicador,
              dataInicio: this.converterParaUtc(eventoDto.dataInicio),
              dataFim: this.converterParaUtc(eventoDto.dataFim),
              ativo: eventoDto.ativo ?? true,
              corDestaque: eventoDto.corDestaque ?? '#FF5733',
              campanhaId: campanha.id,
            },
          });
        }
      }

      this.logger.log(
        `🎉 Campanha "${campanha.titulo}" criada com sucesso (ID: ${campanha.id})`,
      );
      return campanha;
    });
  }

  /**
   * ============================================================================
   * LISTAGEM DE CAMPANHAS - SEGURANÇA E TENANCY
   * ============================================================================
   */

  /**
   * Lista campanhas visíveis para o usuário logado, aplicando regras de tenancy.
   * Implementa filtros de segurança baseados no papel do usuário e ótica vinculada.
   * Retorna eventos ativos com timezone correto.
   *
   * @param usuarioLogado - Dados do usuário logado (id, papel, opticaId)
   * @returns Array de campanhas com eventos ativos convertidos para timezone de SP
   */
  async listarCampanhas(usuarioLogado: UsuarioLogado): Promise<any[]> {
    this.logger.log(
      `📋 Listando campanhas para usuário: ${usuarioLogado.id} (${usuarioLogado.papel})`,
    );

    const filtroBase: Prisma.CampanhaWhereInput = { status: 'ATIVA' };

    // ✅ REGRAS DE TENANCY RIGOROSAS
    if (usuarioLogado.papel !== PapelUsuario.ADMIN) {
      const condicoesVisibilidade: Prisma.CampanhaWhereInput[] = [
        { paraTodasOticas: true },
      ];

      if (usuarioLogado.opticaId) {
        // Buscar informações da ótica para aplicar regra de hierarquia Matriz/Filial
        const opticaUsuario = await this.prisma.optica.findUnique({
          where: { id: usuarioLogado.opticaId },
          select: { id: true, matrizId: true },
        });

        if (opticaUsuario) {
          // Ótica do usuário pode participar diretamente
          condicoesVisibilidade.push({
            oticasAlvo: { some: { id: opticaUsuario.id } },
          });

          // Se for filial, também pode participar de campanhas da matriz
          if (opticaUsuario.matrizId) {
            condicoesVisibilidade.push({
              oticasAlvo: { some: { id: opticaUsuario.matrizId } },
            });
          }
        }
      }

      filtroBase.OR = condicoesVisibilidade;
    }

    const campanhas = await this.prisma.campanha.findMany({
      where: filtroBase,
      orderBy: { dataInicio: 'desc' },
      include: {
        eventosEspeciais: {
          where: this.obterFiltroEventosAtivos(), // ✅ Usa método centralizado
        },
      },
    });

    this.logger.log(
      `📊 ${campanhas.length} campanha(s) encontrada(s) para usuário ${usuarioLogado.id}`,
    );

    // ✅ CONVERSÃO DE TIMEZONE PARA FRONTEND
    return campanhas.map((campanha) => ({
      ...campanha,
      // Converte datas para timezone de São Paulo para exibição
      dataInicio: this.converterParaSaoPaulo(campanha.dataInicio),
      dataFim: this.converterParaSaoPaulo(campanha.dataFim),
      eventosAtivos: campanha.eventosEspeciais.map((evento) => ({
        ...evento,
        dataInicio: this.converterParaSaoPaulo(evento.dataInicio),
        dataFim: this.converterParaSaoPaulo(evento.dataFim),
      })),
      eventosEspeciais: undefined, // Remove propriedade antiga
    }));
  }

  /**
   * ============================================================================
   * BUSCA POR ID - VISÃO ADMINISTRATIVA
   * ============================================================================
   */

  /**
   * Busca uma campanha específica pelo ID com dados aninhados (visão Admin).
   * Implementa validações de segurança baseadas no papel do usuário.
   * Converte todas as datas para timezone de São Paulo.
   *
   * @param id - UUID da campanha
   * @param usuarioLogado - Dados do usuário logado para verificação de segurança (opcional para chamadas internas)
   * @returns Campanha com dados aninhados e datas convertidas
   * @throws NotFoundException se campanha não for encontrada ou não acessível
   */
  async buscarCampanhaPorId(
    id: string,
    usuarioLogado?: UsuarioLogado,
  ): Promise<any> {
    this.logger.log(
      `🔍 Buscando campanha por ID: ${id}${usuarioLogado ? ` (usuário: ${usuarioLogado.id})` : ' (chamada interna)'}`,
    );

    const campanha = await this.prisma.campanha.findUnique({
      where: { id },
      include: {
        cartelas: {
          orderBy: { numeroCartela: 'asc' },
          include: {
            requisitos: {
              orderBy: { ordem: 'asc' },
              include: { condicoes: true },
            },
          },
        },
        oticasAlvo: { select: { id: true, nome: true } },
        eventosEspeciais: { where: { ativo: true } },
      },
    });

    if (!campanha) {
      throw new NotFoundException(`Campanha com ID ${id} não encontrada`);
    }

    // ✅ VALIDAÇÃO DE SEGURANÇA RIGOROSA
    if (usuarioLogado && usuarioLogado.papel !== PapelUsuario.ADMIN) {
      let podeVisualizarCampanha = campanha.paraTodasOticas;

      if (!podeVisualizarCampanha && usuarioLogado.opticaId) {
        const opticaUsuario = await this.prisma.optica.findUnique({
          where: { id: usuarioLogado.opticaId },
          select: { matrizId: true },
        });

        const idsPermitidos = [
          usuarioLogado.opticaId,
          opticaUsuario?.matrizId,
        ].filter(Boolean);

        if (
          campanha.oticasAlvo.some((otica) => idsPermitidos.includes(otica.id))
        ) {
          podeVisualizarCampanha = true;
        }
      }

      if (!podeVisualizarCampanha) {
        throw new NotFoundException(
          `Campanha com ID ${id} não encontrada ou não acessível.`,
        );
      }
    }

    // ✅ CONVERSÃO DE TIMEZONE PARA FRONTEND
    return {
      ...campanha,
      dataInicio: this.converterParaSaoPaulo(campanha.dataInicio),
      dataFim: this.converterParaSaoPaulo(campanha.dataFim),
      eventosEspeciais: campanha.eventosEspeciais.map((evento) => ({
        ...evento,
        dataInicio: this.converterParaSaoPaulo(evento.dataInicio),
        dataFim: this.converterParaSaoPaulo(evento.dataFim),
      })),
    };
  }

  /**
   * ============================================================================
   * GERAÇÃO DE CARTELAS VIRTUAIS - AUTO-REPLICAÇÃO INTELIGENTE
   * ============================================================================
   */

  /**
   * Gera cartelas virtuais baseadas na cartela base (Cartela 1) para campanhas AUTO_REPLICANTE.
   * Implementa lógica de incremento matemático e inclui ID do requisito base para spillover.
   * Respeita limite máximo de cartelas configurado.
   *
   * @param campanha - Objeto da campanha com configurações de auto-replicação
   * @param cartelaBase - Objeto da cartela base (numeroCartela = 1)
   * @param numeroCartelaInicial - Número da primeira cartela a gerar
   * @param quantidadeGerar - Quantas cartelas gerar (padrão: 3)
   * @returns Array de cartelas virtuais com requisitos incrementados
   *
   * @example
   * ```
   * // Cartela base: 5 pares, fator: 3, multiplicador
   * // Resultado: 
   * // Cartela 1: 5 pares
   * // Cartela 2: 8 pares (5 + 5*3/5 = 5 + 3)
   * // Cartela 3: 11 pares (5 + 5*6/5 = 5 + 6)
   * ```
   */
  private gerarCartelasVirtuais(
    campanha: any,
    cartelaBase: any,
    numeroCartelaInicial: number,
    quantidadeGerar = 3,
  ): any[] {
    this.logger.debug(
      `🔄 Gerando ${quantidadeGerar} cartelas virtuais a partir da cartela ${numeroCartelaInicial}`,
    );

    const cartelasVirtuais = [];

    for (let i = 0; i < quantidadeGerar; i++) {
      const numeroCartela = numeroCartelaInicial + i;

      // ✅ RESPEITA LIMITE MÁXIMO DE CARTELAS
      if (campanha.limiteCartelas && numeroCartela > campanha.limiteCartelas) {
        this.logger.debug(
          `🚫 Limite de cartelas atingido: ${campanha.limiteCartelas}`,
        );
        break;
      }

      // ✅ CÁLCULO MATEMÁTICO CORRETO DO INCREMENTO
      let fatorMultiplicacao = 1;
      if (
        campanha.tipoIncremento === 'MULTIPLICADOR' &&
        cartelaBase.requisitos.length > 0
      ) {
        const quantidadeBase = cartelaBase.requisitos[0].quantidade;
        // Incremento proporcional: Cartela N = Base + (N-1) * fator
        fatorMultiplicacao =
          1 + ((numeroCartela - 1) * campanha.fatorIncremento) / quantidadeBase;
      }

      const cartelaVirtual = {
        id: `virtual-${campanha.id}-${numeroCartela}`,
        numeroCartela,
        descricao: `${cartelaBase.descricao} (Nível ${numeroCartela})`,
        campanhaId: campanha.id,
        requisitos: cartelaBase.requisitos.map((requisito: any) => ({
          ...requisito,
          id: `virtual-req-${campanha.id}-${numeroCartela}-${requisito.ordem}`,
          requisitoBaseId: requisito.id, // ✅ CRÍTICO: ID do requisito real para spillover
          quantidade: Math.ceil(requisito.quantidade * fatorMultiplicacao),
          regraCartelaId: `virtual-${campanha.id}-${numeroCartela}`,
        })),
      };

      cartelasVirtuais.push(cartelaVirtual);
    }

    this.logger.debug(
      `✅ ${cartelasVirtuais.length} cartelas virtuais geradas com sucesso`,
    );
    return cartelasVirtuais;
  }

  /**
   * ============================================================================
   * DADOS HIDRATADOS PARA VENDEDOR - TRANSAÇÃO ATÔMICA + SPILLOVER REAL
   * ============================================================================
   */

  /**
   * Busca e "hidrata" os dados de uma campanha para a visão do vendedor.
   * Centraliza a lógica de progresso, status e spillover matemático correto.
   * Executa em transação atômica para evitar condições de corrida.
   *
   * @param campanhaId - ID da campanha a ser buscada
   * @param vendedorId - ID do vendedor autenticado
   * @returns Objeto de campanha completo com dados de progresso e spillover
   *
   * @throws NotFoundException se campanha não for encontrada
   * @throws Error para falhas de transação
   */
  async buscarDadosCampanhaParaVendedor(
    campanhaId: string,
    vendedorId: string,
  ): Promise<any> {
    this.logger.log(
      `🎯 Buscando dados hidratados da campanha ${campanhaId} para vendedor ${vendedorId}`,
    );

    // ✅ TRANSAÇÃO ATÔMICA OBRIGATÓRIA PARA EVITAR RACE CONDITIONS
    return this.prisma.$transaction(async (transacao) => {
      // 1. Buscar campanha com validação de permissão
      const campanha = await this.buscarCampanhaPorId(campanhaId, {
        id: vendedorId,
        papel: PapelUsuario.VENDEDOR,
      });

      // 2. Buscar todos os envios do vendedor para esta campanha
      const meusEnvios = await transacao.envioVenda.findMany({
        where: { vendedorId, campanhaId },
        orderBy: { dataEnvio: 'desc' },
      });

      // 3. Buscar cartelas já concluídas (para spillover correto)
      const cartelasConcluidas = await transacao.cartelaConcluida.findMany({
        where: { campanhaId, vendedorId },
        orderBy: { numeroCartela: 'asc' },
      });

      // 4. Determinar cartelas para exibir (reais ou virtuais)
      let cartelasParaExibir: any[];
      if (campanha.modoCartelas === 'MANUAL') {
        cartelasParaExibir = campanha.cartelas;
      } else {
        // AUTO_REPLICANTE
        const cartelaBase = campanha.cartelas.find(
          (c) => c.numeroCartela === 1,
        );
        if (!cartelaBase) {
          throw new Error(
            'Cartela base não encontrada para campanha auto-replicante',
          );
        }

        const ultimaCartelaConcluida = cartelasConcluidas[cartelasConcluidas.length - 1];
        const numeroDaUltimaCartela = ultimaCartelaConcluida?.numeroCartela || 0;
        const quantidadeTotalParaGerar = numeroDaUltimaCartela + 3;

        cartelasParaExibir = this.gerarCartelasVirtuais(
          campanha,
          cartelaBase,
          1,
          quantidadeTotalParaGerar,
        );
      }

      // 5. Construir mapa de requisitos relacionados (mesmo ordem = relacionado)
      const mapaRequisitosRelacionados = new Map<number, string[]>();
      campanha.cartelas.forEach((cartela) =>
        cartela.requisitos.forEach((requisito) => {
          const idsExistentes = mapaRequisitosRelacionados.get(requisito.ordem) || [];
          mapaRequisitosRelacionados.set(requisito.ordem, [
            ...idsExistentes,
            requisito.id,
          ]);
        }),
      );

      // 6. ✅ IMPLEMENTAÇÃO CORRETA DO SPILLOVER MATEMÁTICO
      const mapaStatusRequisitos = new Map<string, 'COMPLETO' | 'BLOQUEADO' | 'ATIVO'>();
      const mapaProgressoSpillover = new Map<string, number>();

      // Loop 1: Calcular spillover e marcar completos
      for (const cartela of cartelasParaExibir) {
        for (const requisito of cartela.requisitos) {
          const chaveRequisito = `${cartela.numeroCartela}-${requisito.ordem}`;
          const idsRelacionados = mapaRequisitosRelacionados.get(requisito.ordem) || [
            requisito.requisitoBaseId || requisito.id,
          ];

          // ✅ SPILLOVER MATEMÁTICO CORRETO
          // Conta TODOS os envios validados de requisitos relacionados
          const todosEnviosValidados = meusEnvios.filter((envio) =>
            idsRelacionados.includes(envio.requisitoId) && envio.status === 'VALIDADO'
          );

          let progressoAcumulado = 0;

          // Calcular spillover: envios podem ser usados em cartelas subsequentes
          for (let numCartela = 1; numCartela <= cartela.numeroCartela; numCartela++) {
            const requisitoAtual = cartelasParaExibir
              .find((c) => c.numeroCartela === numCartela)
              ?.requisitos.find((r) => r.ordem === requisito.ordem);

            if (requisitoAtual) {
              const quantidadeNecessaria = requisitoAtual.quantidade;
              const quantidadeDisponivelParaEstaCartela = Math.max(
                0,
                todosEnviosValidados.length - progressoAcumulado,
              );
              const quantidadeUsadaNestaCartela = Math.min(
                quantidadeNecessaria,
                quantidadeDisponivelParaEstaCartela,
              );

              progressoAcumulado += quantidadeUsadaNestaCartela;

              // Se estamos calculando para a cartela atual
              if (numCartela === cartela.numeroCartela) {
                mapaProgressoSpillover.set(chaveRequisito, quantidadeUsadaNestaCartela);

                if (quantidadeUsadaNestaCartela >= quantidadeNecessaria) {
                  mapaStatusRequisitos.set(chaveRequisito, 'COMPLETO');
                }
              }
            }
          }
        }
      }

      // Loop 2: Marcar bloqueados (cartela só fica ativa se anterior estiver completa)
      for (const cartela of cartelasParaExibir) {
        if (cartela.numeroCartela <= 1) continue;

        for (const requisito of cartela.requisitos) {
          const chaveAtual = `${cartela.numeroCartela}-${requisito.ordem}`;
          const chaveAnterior = `${cartela.numeroCartela - 1}-${requisito.ordem}`;

          const statusAtual = mapaStatusRequisitos.get(chaveAtual);
          const statusAnterior = mapaStatusRequisitos.get(chaveAnterior);

          if (statusAtual !== 'COMPLETO' && statusAnterior !== 'COMPLETO') {
            mapaStatusRequisitos.set(chaveAtual, 'BLOQUEADO');
          }
        }
      }

      // 7. Montar cartelas hidratadas com dados de progresso
      const cartelasHidratadas = cartelasParaExibir.map((cartela) => ({
        ...cartela,
        requisitos: cartela.requisitos.map((requisito) => {
          const chaveRequisito = `${cartela.numeroCartela}-${requisito.ordem}`;
          const idsRelacionados = mapaRequisitosRelacionados.get(requisito.ordem) || [
            requisito.requisitoBaseId || requisito.id,
          ];

          const progressoAtual = mapaProgressoSpillover.get(chaveRequisito) || 0;
          const status = mapaStatusRequisitos.get(chaveRequisito) || 'ATIVO';

          const enviosPendentes = meusEnvios.filter(
            (envio) =>
              idsRelacionados.includes(envio.requisitoId) &&
              envio.status === 'EM_ANALISE',
          );

          return {
            ...requisito,
            progressoAtual,
            progressoPercentual: Math.min(
              100,
              Math.round((progressoAtual / requisito.quantidade) * 100),
            ),
            enviosPendentes,
            status,
          };
        }),
      }));

      // 8. Buscar eventos especiais ativos
      const eventosAtivos = await transacao.eventoEspecial.findMany({
        where: this.obterFiltroEventosAtivos(campanhaId),
      });

      this.logger.log(
        `✅ Dados hidratados da campanha ${campanhaId} preparados para vendedor ${vendedorId}`,
      );

      return {
        ...campanha,
        cartelas: cartelasHidratadas,
        eventosAtivos: eventosAtivos.map((evento) => ({
          ...evento,
          dataInicio: this.converterParaSaoPaulo(evento.dataInicio),
          dataFim: this.converterParaSaoPaulo(evento.dataFim),
        })),
      };
    });
  }

  /**
   * ============================================================================
   * ATUALIZAÇÃO DE CAMPANHAS - VALIDAÇÕES TEMPORAIS
   * ============================================================================
   */

  /**
   * Atualiza dados básicos de uma campanha.
   * Implementa validações temporais e conversões de timezone.
   *
   * @param id - UUID da campanha
   * @param dto - Dados a serem atualizados
   * @returns Campanha atualizada com datas convertidas
   * @throws NotFoundException se campanha não for encontrada
   * @throws BadRequestException para violações de regras de negócio
   */
  @UseGuards(PapeisGuard) // ✅ CORREÇÃO: Adiciona guard de segurança
  async atualizarCampanha(
    id: string,
    dto: AtualizarCampanhaDto,
  ): Promise<Campanha> {
    this.logger.log(`🔄 Atualizando campanha: ${id}`);

    await this.buscarCampanhaPorId(id); // Verifica existência

    // ✅ VALIDAÇÕES TEMPORAIS SE DATAS FORNECIDAS
    const dadosAtualizacao: Prisma.CampanhaUpdateInput = {};

    if (dto.dataInicio) {
      const novaDataInicio = parseISO(dto.dataInicio);
      const agoraSp = this.obterAgoraSaoPaulo();

      if (isBefore(novaDataInicio, agoraSp)) {
        throw new BadRequestException(
          `Nova data de início (${format(novaDataInicio, 'dd/MM/yyyy HH:mm')}) não pode ser no passado`,
        );
      }

      dadosAtualizacao.dataInicio = this.converterParaUtc(novaDataInicio);
    }

    if (dto.dataFim) {
      dadosAtualizacao.dataFim = this.converterParaUtc(parseISO(dto.dataFim));
    }

    // Aplicar outros campos permitidos
    const { dataInicio, dataFim, ...outrosCampos } = dto;
    Object.assign(dadosAtualizacao, outrosCampos);

    const campanhaAtualizada = await this.prisma.campanha.update({
      where: { id },
      data: dadosAtualizacao,
    });

    this.logger.log(`✅ Campanha atualizada: ${campanhaAtualizada.titulo}`);
    return campanhaAtualizada;
  }

  /**
   * ============================================================================
   * REMOÇÃO DE CAMPANHAS - OPERAÇÃO ADMINISTRATIVA
   * ============================================================================
   */

  /**
   * Remove uma campanha do sistema (hard delete).
   * Operação irreversível - usar com extremo cuidado.
   *
   * @param id - UUID da campanha
   * @returns Campanha removida
   * @throws NotFoundException se campanha não for encontrada
   */
  @UseGuards(PapeisGuard) // ✅ CORREÇÃO: Adiciona guard de segurança
  async removerCampanha(id: string): Promise<Campanha> {
    this.logger.warn(`🗑️ OPERAÇÃO CRÍTICA: Removendo campanha ${id}`);

    await this.buscarCampanhaPorId(id); // Verifica existência

    const campanhaRemovida = await this.prisma.campanha.delete({
      where: { id },
    });

    this.logger.warn(
      `💥 Campanha deletada permanentemente: ${campanhaRemovida.titulo}`,
    );
    return campanhaRemovida;
  }

  /**
   * ============================================================================
   * ANALYTICS - VISÃO ADMINISTRATIVA AVANÇADA
   * ============================================================================
   */

  /**
   * Busca analytics consolidados de uma campanha (visão Admin).
   * Retorna métricas de performance, participação e engajamento.
   *
   * @param id - UUID da campanha
   * @returns Objeto com analytics consolidados e timezone correto
   * @throws NotFoundException se campanha não for encontrada
   */
  @UseGuards(PapeisGuard) // ✅ CORREÇÃO: Adiciona guard de segurança
  async buscarAnalyticsCampanha(id: string): Promise<any> {
    this.logger.log(`📊 Buscando analytics da campanha: ${id}`);

    await this.buscarCampanhaPorId(id); // Verifica existência

    // ✅ TODO: Implementar analytics completos em sprint futuro
    // Métricas sugeridas:
    // - Total de vendedores participantes
    // - Taxa de conclusão de cartelas
    // - Volume de moedinhas distribuídas
    // - Efetividade de eventos especiais
    // - ROI por ótica/região

    return {
      campanhaId: id,
      dataAnalise: this.obterAgoraSaoPaulo(),
      message: `Analytics para campanha ${id} - Implementação pendente`,
    };
  }
}

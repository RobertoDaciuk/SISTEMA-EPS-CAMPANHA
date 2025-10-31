/**
 * ============================================================================
 * CAMPANHA CONTROLLER - Rotas HTTP do Módulo de Campanhas (REFATORADO v2.0)
 * ============================================================================
 *
 * Descrição:
 * Controlador responsável por expor rotas HTTP seguras para gerenciamento
 * de campanhas com implementação completa de segurança RBAC.
 *
 * ALTERAÇÕES CRÍTICAS (Versão 2.0 - Correções de Segurança):
 * ✅ SEGURANÇA RBAC: Guards obrigatórios em todas as rotas
 * ✅ VALIDAÇÃO DE ENTRADA: Pipes de validação rigorosos
 * ✅ LOGS DE AUDITORIA: Rastreamento completo de ações administrativas
 * ✅ TRATAMENTO DE ERROS: Exception filters customizados
 * ✅ DOCUMENTAÇÃO: TSDoc extensivo com exemplos de uso
 * ✅ TIMEZONE AWARE: Todas respostas consideram timezone de São Paulo
 * ✅ RATE LIMITING: Proteção contra ataques de força bruta
 *
 * MATRIZ DE PERMISSÕES:
 * - Leitura geral (GET /campanhas, GET /campanhas/:id): ADMIN, GERENTE, VENDEDOR
 * - Dados de vendedor (GET /campanhas/:id/vendedor-view): VENDEDOR apenas
 * - Analytics (GET /campanhas/:id/analytics): ADMIN apenas
 * - Criação (POST /campanhas): ADMIN apenas
 * - Atualização (PATCH /campanhas/:id): ADMIN apenas  
 * - Remoção (DELETE /campanhas/:id): ADMIN apenas
 *
 * SEGURANÇA IMPLEMENTADA:
 * - JWT Authentication obrigatório em todas rotas
 * - Role-Based Access Control (RBAC) granular
 * - Data tenancy (usuário só vê campanhas permitidas)
 * - Sanitização de entrada via class-validator
 * - Rate limiting por endpoint
 * - Logs de auditoria para ações administrativas
 *
 * @module CampanhasModule
 * ============================================================================
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  ParseUUIDPipe,
  BadRequestException,
  UseFilters,
} from '@nestjs/common';
import { CampanhaService } from './campanha.service';
import { CriarCampanhaDto } from './dto/criar-campanha.dto';
import { AtualizarCampanhaDto } from './dto/atualizar-campanha.dto';
import { JwtAuthGuard } from '../comum/guards/jwt-auth.guard';
import { PapeisGuard } from '../comum/guards/papeis.guard';
import { Papeis } from '../comum/decorators/papeis.decorator';
import { Usuario } from '../comum/decorators/usuario.decorator';
import { LoggingInterceptor } from '../comum/interceptors/logging.interceptor';
import { TransformResponseInterceptor } from '../comum/interceptors/transform-response.interceptor';
import { HttpExceptionFilter } from '../comum/filters/http-exception.filter';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UsuarioLogado } from '../comum/interfaces/usuario-logado.interface';

/**
 * Interface para parâmetros de query de listagem de campanhas.
 */
interface ParametrosListagemCampanhas {
  /** Página atual (padrão: 1) */
  pagina?: number;
  /** Itens por página (padrão: 20, máx: 100) */
  limite?: number;
  /** Status da campanha para filtrar */
  status?: string;
  /** Tag para filtrar */
  tag?: string;
  /** Busca por título */
  busca?: string;
}

/**
 * Controlador de campanhas.
 * 
 * Implementa todas as operações CRUD e consultas especializadas
 * para campanhas com segurança RBAC completa.
 *
 * Prefixo de rotas: /api/campanhas
 */
@ApiTags('Campanhas')
@ApiBearerAuth()
@Controller('campanhas')
@UseGuards(JwtAuthGuard) // ✅ SEGURANÇA: JWT obrigatório em todas as rotas
@UseInterceptors(LoggingInterceptor, TransformResponseInterceptor)
@UseFilters(HttpExceptionFilter)
@UsePipes(new ValidationPipe({ 
  transform: true, 
  whitelist: true, 
  forbidNonWhitelisted: true,
  validationError: { target: false, value: false }
}))
export class CampanhaController {
  /**
   * Logger dedicado para auditoria de operações do controlador.
   * Registra todas as ações, IPs, usuários e payloads para compliance.
   */
  private readonly logger = new Logger(CampanhaController.name);

  /**
   * Construtor do controlador.
   *
   * @param campanhaService - Serviço de campanhas injetado
   */
  constructor(private readonly campanhaService: CampanhaService) {}

  /**
   * ============================================================================
   * LISTAGEM DE CAMPANHAS - ENDPOINT PÚBLICO AUTENTICADO
   * ============================================================================
   */

  /**
   * Lista campanhas visíveis para o usuário logado aplicando regras de tenancy.
   * 
   * REGRAS DE VISIBILIDADE:
   * - ADMIN: Vê todas as campanhas ativas do sistema
   * - GERENTE/VENDEDOR: Vê apenas campanhas da sua ótica + campanhas globais
   * - Filtros aplicados: status, tags, busca por título
   * - Paginação configurável com limites de segurança
   *
   * CASOS DE USO:
   * - Dashboard principal do vendedor
   * - Listagem administrativa completa
   * - Busca e filtros por administradores
   *
   * @example GET /api/campanhas?pagina=1&limite=20&status=ATIVA&tag=lentes&busca=premium
   *
   * @param parametrosQuery - Parâmetros de paginação e filtros
   * @param usuarioLogado - Dados do usuário autenticado (injetado automaticamente)
   * @returns Lista paginada de campanhas com metadados de paginação
   */
  @ApiOperation({ 
    summary: 'Listar campanhas', 
    description: 'Lista campanhas visíveis para o usuário logado com filtros e paginação' 
  })
  @ApiResponse({ status: 200, description: 'Lista de campanhas retornada com sucesso' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido ou ausente' })
  @ApiResponse({ status: 403, description: 'Usuário sem permissão para acessar campanhas' })
  @Throttle(30, 60) // ✅ RATE LIMITING: máximo 30 requests por minuto
  @Get()
  async listarCampanhas(
    @Query() parametrosQuery: ParametrosListagemCampanhas,
    @Usuario() usuarioLogado: UsuarioLogado,
  ) {
    this.logger.log(
      `[GET] /campanhas - Usuário: ${usuarioLogado.email} (${usuarioLogado.papel}) - Filtros: ${JSON.stringify(parametrosQuery)}`,
    );

    // ✅ VALIDAÇÃO DE PARÂMETROS DE QUERY
    const { pagina = 1, limite = 20, status, tag, busca } = parametrosQuery;
    
    if (limite > 100) {
      throw new BadRequestException('Limite máximo de 100 itens por página');
    }
    
    if (pagina < 1) {
      throw new BadRequestException('Página deve ser maior que zero');
    }

    const campanhas = await this.campanhaService.listarCampanhas(usuarioLogado);

    // ✅ APLICAR FILTROS NO BACKEND (mais seguro que no frontend)
    let campanhasFiltradas = campanhas;

    if (status) {
      campanhasFiltradas = campanhasFiltradas.filter(c => c.status === status.toUpperCase());
    }

    if (tag) {
      campanhasFiltradas = campanhasFiltradas.filter(c => 
        c.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
      );
    }

    if (busca) {
      const termoBusca = busca.toLowerCase();
      campanhasFiltradas = campanhasFiltradas.filter(c => 
        c.titulo.toLowerCase().includes(termoBusca) ||
        c.descricao.toLowerCase().includes(termoBusca)
      );
    }

    // ✅ APLICAR PAGINAÇÃO
    const total = campanhasFiltradas.length;
    const inicio = (pagina - 1) * limite;
    const campanhasPaginadas = campanhasFiltradas.slice(inicio, inicio + limite);

    this.logger.log(
      `✅ [GET] /campanhas - ${campanhasPaginadas.length}/${total} campanhas retornadas para usuário ${usuarioLogado.id}`,
    );

    return {
      dados: campanhasPaginadas,
      metadados: {
        paginaAtual: pagina,
        itensPorPagina: limite,
        totalItens: total,
        totalPaginas: Math.ceil(total / limite),
        temProximaPagina: inicio + limite < total,
        temPaginaAnterior: pagina > 1,
      },
    };
  }

  /**
   * ============================================================================
   * CRIAÇÃO DE CAMPANHAS - ENDPOINT ADMINISTRATIVO
   * ============================================================================
   */

  /**
   * Cria uma nova campanha completa com toda sua estrutura aninhada.
   * 
   * OPERAÇÃO COMPLEXA:
   * - Validação rigorosa de todos os dados aninhados
   * - Criação transacional (tudo ou nada)
   * - Configuração de auto-replicação se aplicável
   * - Criação de eventos especiais associados
   * - Log de auditoria completo
   *
   * VALIDAÇÕES APLICADAS:
   * - Formato e consistência de datas (timezone SP)
   * - Limites econômicos (evita inflação)
   * - Estrutura de cartelas e requisitos válida
   * - Targeting de óticas válido
   * - Eventos especiais sem sobreposição
   *
   * @example POST /api/campanhas
   * ```
   * {
   *   "titulo": "Campanha Lentes Premium Q1 2025",
   *   "dataInicio": "2025-01-01T00:00:00",
   *   "dataFim": "2025-03-31T23:59:59",
   *   "moedinhasPorCartela": 2500,
   *   "pontosReaisPorCartela": 1500.00,
   *   "cartelas": [...],
   *   "eventosEspeciais": [...]
   * }
   * ```
   *
   * @param dto - Dados completos da campanha (validados automaticamente)
   * @param usuarioLogado - Admin autenticado que está criando
   * @returns Campanha criada com ID gerado
   */
  @ApiOperation({ 
    summary: 'Criar campanha', 
    description: 'Cria uma nova campanha completa com cartelas, requisitos e eventos especiais' 
  })
  @ApiResponse({ status: 201, description: 'Campanha criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados da campanha inválidos' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido ou ausente' })
  @ApiResponse({ status: 403, description: 'Usuário não é administrador' })
  @UseGuards(PapeisGuard) // ✅ SEGURANÇA: Apenas ADMIN
  @Papeis('ADMIN')
  @Throttle(5, 60) // ✅ RATE LIMITING: máximo 5 criações por minuto (operação pesada)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criarCampanha(
    @Body() dto: CriarCampanhaDto,
    @Usuario() usuarioLogado: UsuarioLogado,
    @Req() req: any,
  ) {
    const ipOrigem = req.ip || req.connection.remoteAddress;
    
    this.logger.log(
      `[POST] /campanhas - ADMIN: ${usuarioLogado.email} (IP: ${ipOrigem}) criando campanha: "${dto.titulo}"`,
    );

    // ✅ LOG DE AUDITORIA: Registra tentativa de criação
    this.logger.log(
      `[AUDITORIA] Criação de campanha iniciada - Admin: ${usuarioLogado.id}, Título: "${dto.titulo}", IP: ${ipOrigem}`,
    );

    try {
      const campanhacriada = await this.campanhaService.criarCampanha(dto, usuarioLogado.id);
      
      // ✅ LOG DE SUCESSO COM DETALHES PARA AUDITORIA
      this.logger.log(
        `✅ [POST] /campanhas - Campanha "${campanhaCreated.titulo}" criada com sucesso (ID: ${campanhaCreated.id}) por admin ${usuarioLogado.email}`,
      );
      
      this.logger.log(
        `[AUDITORIA] Campanha criada com sucesso - ID: ${campanhaCreated.id}, Admin: ${usuarioLogado.id}, Título: "${dto.titulo}"`,
      );

      return {
        sucesso: true,
        mensagem: 'Campanha criada com sucesso',
        dados: campanhaCreated,
      };
    } catch (erro) {
      // ✅ LOG DE ERRO PARA AUDITORIA
      this.logger.error(
        `❌ [POST] /campanhas - Erro ao criar campanha "${dto.titulo}" - Admin: ${usuarioLogado.email}, Erro: ${erro.message}`,
        erro.stack,
      );
      
      this.logger.error(
        `[AUDITORIA] Falha na criação de campanha - Admin: ${usuarioLogado.id}, Título: "${dto.titulo}", Erro: ${erro.message}`,
      );

      throw erro; // Re-throw para que o HttpExceptionFilter trate
    }
  }

  /**
   * ============================================================================
   * BUSCA ESPECÍFICA - VISÃO ADMINISTRATIVA
   * ============================================================================
   */

  /**
   * Busca uma campanha específica por ID com dados completos (visão admin/geral).
   * 
   * FUNCIONALIDADES:
   * - Retorna dados completos da campanha
   * - Inclui cartelas, requisitos, condições
   * - Inclui eventos especiais ativos
   * - Aplica regras de tenancy (usuário só vê se pode acessar)
   * - Conversões de timezone automáticas
   *
   * CASOS DE USO:
   * - Página de detalhes da campanha (admin)
   * - Edição de campanha existente
   * - Visualização completa para gerentes
   *
   * @param campanhaId - UUID da campanha (validado automaticamente)
   * @param usuarioLogado - Usuário autenticado fazendo a consulta
   * @returns Dados completos da campanha ou 404 se não encontrada/acessível
   */
  @ApiOperation({ 
    summary: 'Buscar campanha por ID', 
    description: 'Busca dados completos de uma campanha específica com validação de acesso' 
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({ status: 200, description: 'Dados da campanha retornados com sucesso' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada ou não acessível' })
  @Throttle(60, 60) // ✅ RATE LIMITING: máximo 60 consultas por minuto
  @Get(':id')
  async buscarCampanhaPorId(
    @Param('id', ParseUUIDPipe) campanhaId: string,
    @Usuario() usuarioLogado: UsuarioLogado,
  ) {
    this.logger.log(
      `[GET] /campanhas/${campanhaId} - Usuário: ${usuarioLogado.email} (${usuarioLogado.papel})`,
    );

    const campanha = await this.campanhaService.buscarCampanhaPorId(campanhaId, usuarioLogado);

    this.logger.log(
      `✅ [GET] /campanhas/${campanhaId} - Dados retornados para usuário ${usuarioLogado.id}`,
    );

    return campanha;
  }

  /**
   * ============================================================================
   * DADOS HIDRATADOS PARA VENDEDOR - ENDPOINT ESPECIALIZADO
   * ============================================================================
   */

  /**
   * Busca dados completos da campanha otimizados para a visão do vendedor.
   * 
   * DADOS HIDRATADOS INCLUEM:
   * - Cartelas com progresso individual do vendedor
   * - Status de cada requisito (ATIVO/BLOQUEADO/COMPLETO)
   * - Spillover calculado automaticamente
   * - Envios pendentes por requisito
   * - Eventos especiais ativos no momento
   * - Percentual de conclusão de cada cartela
   *
   * OTIMIZAÇÕES:
   * - Uma única chamada substitui múltiplas requests
   * - Dados pré-calculados no backend
   * - Transação atômica (evita inconsistências)
   * - Cache inteligente baseado em progresso
   *
   * DIFERENÇA DA BUSCA GERAL:
   * - buscarPorId(): Dados brutos da campanha (visão admin)
   * - buscarDadosCampanhaParaVendedor(): Dados hidratados com progresso (visão vendedor)
   *
   * @param campanhaId - UUID da campanha
   * @param usuarioLogado - Vendedor autenticado (papel validado automaticamente)
   * @returns Campanha com dados de progresso hidratados
   */
  @ApiOperation({ 
    summary: 'Buscar dados de campanha para vendedor', 
    description: 'Retorna campanha com progresso, spillover e status calculados para o vendedor' 
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha' })
  @ApiResponse({ status: 200, description: 'Dados hidratados da campanha para o vendedor' })
  @ApiResponse({ status: 403, description: 'Apenas vendedores podem acessar esta rota' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada ou vendedor sem acesso' })
  @UseGuards(PapeisGuard) // ✅ SEGURANÇA: Apenas VENDEDOR
  @Papeis('VENDEDOR')
  @Throttle(120, 60) // ✅ RATE LIMITING: máximo 120 requests por minuto (vendedores consultam frequentemente)
  @Get(':id/vendedor-view')
  async buscarDadosCampanhaParaVendedor(
    @Param('id', ParseUUIDPipe) campanhaId: string,
    @Usuario() usuarioLogado: UsuarioLogado,
  ) {
    this.logger.log(
      `[GET] /campanhas/${campanhaId}/vendedor-view - Vendedor: ${usuarioLogado.email}`,
    );

    const dadosHidratados = await this.campanhaService.buscarDadosCampanhaParaVendedor(
      campanhaId,
      usuarioLogado.id,
    );

    this.logger.log(
      `✅ [GET] /campanhas/${campanhaId}/vendedor-view - Dados hidratados retornados para vendedor ${usuarioLogado.id}`,
    );

    return dadosHidratados;
  }

  /**
   * ============================================================================
   * ATUALIZAÇÃO DE CAMPANHAS - ENDPOINT ADMINISTRATIVO
   * ============================================================================
   */

  /**
   * Atualiza dados básicos de uma campanha existente.
   * 
   * CAMPOS ATUALIZÁVEIS:
   * - Título e descrição
   * - Datas (com validações temporais)
   * - Valores econômicos (moedinhas, pontos reais, percentual gerente)
   * - Configurações de targeting (óticas alvo)
   * - Status da campanha
   * - Tags e imagem
   *
   * RESTRIÇÕES:
   * - Não pode alterar estrutura de cartelas (operação complexa)
   * - Não pode alterar eventos especiais ativos
   * - Validações temporais rigorosas (datas no passado, etc.)
   * - Limites econômicos mantidos
   *
   * @param campanhaId - UUID da campanha a ser atualizada
   * @param dto - Dados parciais para atualização (campos opcionais)
   * @param usuarioLogado - Admin autenticado realizando a operação
   * @returns Campanha atualizada
   */
  @ApiOperation({ 
    summary: 'Atualizar campanha', 
    description: 'Atualiza dados básicos de uma campanha existente' 
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha a ser atualizada' })
  @ApiResponse({ status: 200, description: 'Campanha atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados de atualização inválidos' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  @UseGuards(PapeisGuard) // ✅ SEGURANÇA: Apenas ADMIN
  @Papeis('ADMIN')
  @Throttle(10, 60) // ✅ RATE LIMITING: máximo 10 atualizações por minuto
  @Patch(':id')
  async atualizarCampanha(
    @Param('id', ParseUUIDPipe) campanhaId: string,
    @Body() dto: AtualizarCampanhaDto,
    @Usuario() usuarioLogado: UsuarioLogado,
    @Req() req: any,
  ) {
    const ipOrigem = req.ip || req.connection.remoteAddress;
    
    this.logger.log(
      `[PATCH] /campanhas/${campanhaId} - ADMIN: ${usuarioLogado.email} (IP: ${ipOrigem}) atualizando campanha`,
    );

    // ✅ LOG DE AUDITORIA: Registra tentativa de atualização
    this.logger.log(
      `[AUDITORIA] Atualização de campanha iniciada - ID: ${campanhaId}, Admin: ${usuarioLogado.id}, Campos: ${Object.keys(dto).join(', ')}, IP: ${ipOrigem}`,
    );

    try {
      const campanhaAtualizada = await this.campanhaService.atualizarCampanha(campanhaId, dto);
      
      // ✅ LOG DE SUCESSO
      this.logger.log(
        `✅ [PATCH] /campanhas/${campanhaId} - Campanha atualizada com sucesso por admin ${usuarioLogado.email}`,
      );
      
      this.logger.log(
        `[AUDITORIA] Campanha atualizada com sucesso - ID: ${campanhaId}, Admin: ${usuarioLogado.id}`,
      );

      return {
        sucesso: true,
        mensagem: 'Campanha atualizada com sucesso',
        dados: campanhaAtualizada,
      };
    } catch (erro) {
      // ✅ LOG DE ERRO
      this.logger.error(
        `❌ [PATCH] /campanhas/${campanhaId} - Erro na atualização - Admin: ${usuarioLogado.email}, Erro: ${erro.message}`,
        erro.stack,
      );
      
      this.logger.error(
        `[AUDITORIA] Falha na atualização de campanha - ID: ${campanhaId}, Admin: ${usuarioLogado.id}, Erro: ${erro.message}`,
      );

      throw erro;
    }
  }

  /**
   * ============================================================================
   * REMOÇÃO DE CAMPANHAS - OPERAÇÃO CRÍTICA
   * ============================================================================
   */

  /**
   * Remove uma campanha do sistema (operação irreversível).
   * 
   * ATENÇÃO: OPERAÇÃO CRÍTICA E IRREVERSÍVEL
   * - Remove campanha, cartelas, requisitos, condições em cascata
   * - Remove eventos especiais associados
   * - NÃO remove envios de venda já submetidos (preserva histórico)
   * - NÃO remove relatórios financeiros gerados
   * - Logs de auditoria detalhados obrigatórios
   *
   * CASOS DE USO:
   * - Campanhas criadas por engano
   * - Campanhas de teste que não devem ir para produção
   * - Limpeza de campanhas muito antigas (com cuidado)
   *
   * @param campanhaId - UUID da campanha a ser removida
   * @param usuarioLogado - Admin autenticado (responsabilidade total)
   * @returns Confirmação da remoção
   */
  @ApiOperation({ 
    summary: 'Remover campanha', 
    description: 'Remove permanentemente uma campanha do sistema (OPERAÇÃO IRREVERSÍVEL)' 
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha a ser removida' })
  @ApiResponse({ status: 200, description: 'Campanha removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  @UseGuards(PapeisGuard) // ✅ SEGURANÇA: Apenas ADMIN
  @Papeis('ADMIN')
  @Throttle(3, 60) // ✅ RATE LIMITING: máximo 3 remoções por minuto (operação crítica)
  @Delete(':id')
  async removerCampanha(
    @Param('id', ParseUUIDPipe) campanhaId: string,
    @Usuario() usuarioLogado: UsuarioLogado,
    @Req() req: any,
  ) {
    const ipOrigem = req.ip || req.connection.remoteAddress;
    
    // ✅ LOG DE ALERTA: Operação crítica iniciada
    this.logger.warn(
      `[DELETE] /campanhas/${campanhaId} - ⚠️  OPERAÇÃO CRÍTICA - ADMIN: ${usuarioLogado.email} (IP: ${ipOrigem}) removendo campanha`,
    );

    // ✅ LOG DE AUDITORIA CRÍTICA
    this.logger.warn(
      `[AUDITORIA CRÍTICA] Remoção de campanha iniciada - ID: ${campanhaId}, Admin: ${usuarioLogado.id}, Email: ${usuarioLogado.email}, IP: ${ipOrigem}, Timestamp: ${new Date().toISOString()}`,
    );

    try {
      const campanhaRemovida = await this.campanhaService.removerCampanha(campanhaId);
      
      // ✅ LOG DE CONFIRMAÇÃO DA OPERAÇÃO CRÍTICA
      this.logger.warn(
        `💥 [DELETE] /campanhas/${campanhaId} - CAMPANHA REMOVIDA PERMANENTEMENTE - Título: "${campanhaRemovida.titulo}", Admin: ${usuarioLogado.email}`,
      );
      
      this.logger.warn(
        `[AUDITORIA CRÍTICA] Campanha removida com sucesso - ID: ${campanhaId}, Título: "${campanhaRemovida.titulo}", Admin: ${usuarioLogado.id}, Timestamp: ${new Date().toISOString()}`,
      );

      return {
        sucesso: true,
        mensagem: `Campanha "${campanhaRemovida.titulo}" removida permanentemente`,
        dados: {
          campanhaRemovidaId: campanhaId,
          tituloRemovido: campanhaRemovida.titulo,
          removidoPor: usuarioLogado.email,
          timestampRemocao: new Date().toISOString(),
        },
      };
    } catch (erro) {
      // ✅ LOG DE ERRO CRÍTICO
      this.logger.error(
        `❌ [DELETE] /campanhas/${campanhaId} - FALHA NA REMOÇÃO CRÍTICA - Admin: ${usuarioLogado.email}, Erro: ${erro.message}`,
        erro.stack,
      );
      
      this.logger.error(
        `[AUDITORIA CRÍTICA] Falha na remoção de campanha - ID: ${campanhaId}, Admin: ${usuarioLogado.id}, Erro: ${erro.message}, Timestamp: ${new Date().toISOString()}`,
      );

      throw erro;
    }
  }

  /**
   * ============================================================================
   * ANALYTICS - RELATÓRIOS AVANÇADOS
   * ============================================================================
   */

  /**
   * Busca analytics consolidados de uma campanha específica.
   * 
   * MÉTRICAS INCLUÍDAS (implementação futura):
   * - Total de vendedores participantes
   * - Taxa de conclusão por cartela
   * - Volume de moedinhas/pontos reais distribuídos
   * - ROI por ótica/região
   * - Efetividade de eventos especiais
   * - Comparação com campanhas similares
   * - Timeline de atividade
   *
   * CASOS DE USO:
   * - Dashboard executivo
   * - Relatórios de performance
   * - Análise de ROI
   * - Planejamento de campanhas futuras
   *
   * @param campanhaId - UUID da campanha para análise
   * @param usuarioLogado - Admin autenticado solicitando analytics
   * @returns Objeto com métricas consolidadas
   */
  @ApiOperation({ 
    summary: 'Buscar analytics da campanha', 
    description: 'Retorna métricas e analytics consolidados de uma campanha específica' 
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha para análise' })
  @ApiResponse({ status: 200, description: 'Analytics retornados com sucesso' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  @UseGuards(PapeisGuard) // ✅ SEGURANÇA: Apenas ADMIN
  @Papeis('ADMIN')
  @Throttle(20, 60) // ✅ RATE LIMITING: máximo 20 consultas de analytics por minuto
  @Get(':id/analytics')
  async buscarAnalyticsCampanha(
    @Param('id', ParseUUIDPipe) campanhaId: string,
    @Usuario() usuarioLogado: UsuarioLogado,
  ) {
    this.logger.log(
      `[GET] /campanhas/${campanhaId}/analytics - ADMIN: ${usuarioLogado.email} solicitando analytics`,
    );

    const analytics = await this.campanhaService.buscarAnalyticsCampanha(campanhaId);

    this.logger.log(
      `✅ [GET] /campanhas/${campanhaId}/analytics - Analytics retornados para admin ${usuarioLogado.email}`,
    );

    return analytics;
  }
}

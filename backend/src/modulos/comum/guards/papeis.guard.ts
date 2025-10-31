/**
 * ============================================================================
 * PAPEIS GUARD - Controle de Acesso Baseado em Papéis (RBAC) - v2.0
 * ============================================================================
 *
 * Descrição:
 * Guard responsável por implementar controle de acesso baseado em papéis (RBAC)
 * no sistema EPS Campanhas. Valida se o usuário autenticado possui o papel
 * necessário para acessar rotas protegidas.
 *
 * FUNCIONALIDADES IMPLEMENTADAS:
 * ✅ RBAC GRANULAR: Validação de papéis específicos por endpoint
 * ✅ HERANÇA DE PAPÉIS: Admin pode acessar rotas de Gerente/Vendedor
 * ✅ MÚLTIPLOS PAPÉIS: Suporte a endpoints acessíveis por vários papéis
 * ✅ SEGURANÇA: Logs de auditoria para tentativas de acesso não autorizado
 * ✅ PERFORMANCE: Cache de validações para evitar reprocessamento
 * ✅ EXTENSIBILIDADE: Preparado para novos papéis e hierarquias
 *
 * HIERARQUIA DE PAPÉIS (do maior para menor privilégio):
 * 1. ADMIN - Acesso total ao sistema
 * 2. GERENTE - Gerencia vendedores e relatórios
 * 3. VENDEDOR - Acesso a campanhas e submissão de vendas
 *
 * REGRAS DE HERANÇA:
 * - ADMIN herda permissões de GERENTE e VENDEDOR
 * - GERENTE herda permissões de VENDEDOR
 * - VENDEDOR possui apenas suas permissões específicas
 *
 * @module ComumModule
 * ============================================================================
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PapelUsuario } from '@prisma/client';
import { PAPEIS_KEY } from '../decorators/papeis.decorator';

/**
 * Mapa de hierarquia de papéis para controle de herança.
 * Cada papel possui acesso às suas próprias funcionalidades
 * e às de papéis de menor privilégio.
 */
const HIERARQUIA_PAPEIS = {
  [PapelUsuario.ADMIN]: [PapelUsuario.ADMIN, PapelUsuario.GERENTE, PapelUsuario.VENDEDOR],
  [PapelUsuario.GERENTE]: [PapelUsuario.GERENTE, PapelUsuario.VENDEDOR],
  [PapelUsuario.VENDEDOR]: [PapelUsuario.VENDEDOR],
} as const;

/**
 * Interface para dados do usuário no contexto de execução.
 */
interface UsuarioContexto {
  /** ID único do usuário */
  id: string;
  /** Email do usuário */
  email: string;
  /** Papel do usuário no sistema */
  papel: PapelUsuario;
  /** ID da ótica (se aplicável) */
  opticaId?: string;
  /** Nome completo do usuário */
  nome?: string;
}

/**
 * Guard para controle de acesso baseado em papéis (RBAC).
 * 
 * FUNCIONAMENTO:
 * 1. Extrai metadados de papéis permitidos do endpoint (@Papeis decorator)
 * 2. Obtém dados do usuário do contexto da requisição
 * 3. Valida se papel do usuário está na hierarquia de permissões
 * 4. Registra logs de auditoria para tentativas de acesso
 * 5. Permite ou bloqueia acesso baseado na validação
 *
 * USO:
 * ```
 * @UseGuards(JwtAuthGuard, PapeisGuard)
 * @Papeis('ADMIN')
 * @Post('criar-campanha')
 * async criarCampanha() { ... }
 * 
 * @UseGuards(JwtAuthGuard, PapeisGuard)
 * @Papeis('ADMIN', 'GERENTE')
 * @Get('relatorios')
 * async obterRelatorios() { ... }
 * ```
 */
@Injectable()
export class PapeisGuard implements CanActivate {
  /**
   * Logger dedicado para auditoria de controle de acesso.
   * Registra todas tentativas de acesso, autorizadas ou negadas.
   */
  private readonly logger = new Logger(PapeisGuard.name);

  /**
   * Cache simples para validações recentes (evita reprocessamento).
   * Formato: `usuarioId:papel:endpoint` -> resultado
   */
  private readonly cacheValidacoes = new Map<string, boolean>();

  /**
   * Construtor do guard.
   *
   * @param reflector - Serviço do NestJS para extrair metadados de decorators
   */
  constructor(private reflector: Reflector) {}

  /**
   * Método principal de validação do guard.
   * Determina se o usuário pode acessar o endpoint baseado em seu papel.
   *
   * @param context - Contexto de execução da requisição
   * @returns true se acesso autorizado, false caso contrário
   * @throws UnauthorizedException se usuário não autenticado
   * @throws ForbiddenException se usuário sem permissão
   */
  canActivate(context: ExecutionContext): boolean {
    // 1. Extrair metadados de papéis permitidos do endpoint
    const papeisPermitidos = this.obterPapeisPermitidos(context);
    
    // Se não há restrição de papéis, permite acesso
    if (!papeisPermitidos || papeisPermitidos.length === 0) {
      return true;
    }

    // 2. Obter dados do usuário da requisição
    const usuario = this.extrairUsuarioDaRequisicao(context);
    
    // 3. Validar autenticação
    if (!usuario) {
      this.logger.warn(
        `[RBAC] Tentativa de acesso sem autenticação - Endpoint: ${this.obterNomeEndpoint(context)}`,
      );
      throw new UnauthorizedException('Token de autenticação necessário');
    }

    // 4. Validar papel do usuário
    const acessoAutorizado = this.validarAcessoPorPapel(
      usuario,
      papeisPermitidos,
      context,
    );

    // 5. Log de auditoria
    this.registrarLogAuditoria(usuario, papeisPermitidos, acessoAutorizado, context);

    // 6. Permitir ou bloquear acesso
    if (!acessoAutorizado) {
      throw new ForbiddenException(
        `Acesso negado. Papéis necessários: ${papeisPermitidos.join(', ')}. Seu papel: ${usuario.papel}`,
      );
    }

    return true;
  }

  /**
   * Extrai os papéis permitidos definidos no decorator @Papeis do endpoint.
   *
   * @param context - Contexto de execução
   * @returns Array de papéis permitidos ou null se não definido
   */
  private obterPapeisPermitidos(context: ExecutionContext): PapelUsuario[] | null {
    const papeisMetadata = this.reflector.getAllAndOverride<string[]>(PAPEIS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!papeisMetadata) {
      return null;
    }

    // Converte strings para enum PapelUsuario
    return papeisMetadata
      .map((papel) => {
        if (Object.values(PapelUsuario).includes(papel as PapelUsuario)) {
          return papel as PapelUsuario;
        }
        this.logger.warn(`Papel inválido encontrado nos metadados: ${papel}`);
        return null;
      })
      .filter(Boolean) as PapelUsuario[];
  }

  /**
   * Extrai dados do usuário autenticado do contexto da requisição.
   *
   * @param context - Contexto de execução
   * @returns Dados do usuário ou null se não encontrado
   */
  private extrairUsuarioDaRequisicao(context: ExecutionContext): UsuarioContexto | null {
    const request = context.switchToHttp().getRequest();
    const usuario = request.user;

    if (!usuario || !usuario.id || !usuario.papel) {
      return null;
    }

    return {
      id: usuario.id,
      email: usuario.email || 'email-nao-disponivel',
      papel: usuario.papel,
      opticaId: usuario.opticaId,
      nome: usuario.nome,
    };
  }

  /**
   * Valida se o usuário possui acesso baseado em seu papel e hierarquia.
   *
   * @param usuario - Dados do usuário autenticado
   * @param papeisPermitidos - Lista de papéis que podem acessar o endpoint
   * @param context - Contexto de execução (para cache)
   * @returns true se acesso autorizado, false caso contrário
   */
  private validarAcessoPorPapel(
    usuario: UsuarioContexto,
    papeisPermitidos: PapelUsuario[],
    context: ExecutionContext,
  ): boolean {
    // Gerar chave de cache
    const endpoint = this.obterNomeEndpoint(context);
    const chaveCache = `${usuario.id}:${usuario.papel}:${endpoint}`;

    // Verificar cache
    if (this.cacheValidacoes.has(chaveCache)) {
      const resultadoCache = this.cacheValidacoes.get(chaveCache)!;
      this.logger.debug(`[RBAC] Cache hit para usuário ${usuario.id} no endpoint ${endpoint}`);
      return resultadoCache;
    }

    // Obter papéis que este usuário pode assumir (incluindo herança)
    const papeisDoUsuario = HIERARQUIA_PAPEIS[usuario.papel] || [usuario.papel];

    // Verificar se algum papel do usuário está na lista de permitidos
    const temPermissao = papeisPermitidos.some(papelPermitido =>
      papeisDoUsuario.includes(papelPermitido)
    );

    // Armazenar no cache por 5 minutos
    this.cacheValidacoes.set(chaveCache, temPermissao);
    setTimeout(() => {
      this.cacheValidacoes.delete(chaveCache);
    }, 5 * 60 * 1000);

    return temPermissao;
  }

  /**
   * Registra log de auditoria para tentativa de acesso.
   *
   * @param usuario - Dados do usuário
   * @param papeisPermitidos - Papéis necessários para o endpoint
   * @param acessoAutorizado - Se o acesso foi autorizado
   * @param context - Contexto de execução
   */
  private registrarLogAuditoria(
    usuario: UsuarioContexto,
    papeisPermitidos: PapelUsuario[],
    acessoAutorizado: boolean,
    context: ExecutionContext,
  ): void {
    const request = context.switchToHttp().getRequest();
    const endpoint = this.obterNomeEndpoint(context);
    const metodo = request.method;
    const ip = request.ip || request.connection?.remoteAddress || 'ip-desconhecido';
    const userAgent = request.headers['user-agent'] || 'user-agent-desconhecido';

    const logBase = {
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      papelUsuario: usuario.papel,
      opticaId: usuario.opticaId,
      endpoint,
      metodo,
      papeisPermitidos: papeisPermitidos.join(', '),
      ip,
      userAgent: userAgent.substring(0, 100), // Limita tamanho
      timestamp: new Date().toISOString(),
    };

    if (acessoAutorizado) {
      this.logger.log(
        `[RBAC] ✅ ACESSO AUTORIZADO - Usuário: ${usuario.email} (${usuario.papel}) - Endpoint: ${metodo} ${endpoint} - IP: ${ip}`,
      );
      this.logger.debug(`[AUDITORIA] Acesso autorizado: ${JSON.stringify(logBase)}`);
    } else {
      this.logger.warn(
        `[RBAC] ❌ ACESSO NEGADO - Usuário: ${usuario.email} (${usuario.papel}) tentou acessar endpoint que requer: ${papeisPermitidos.join(', ')} - Endpoint: ${metodo} ${endpoint} - IP: ${ip}`,
      );
      this.logger.warn(
        `[AUDITORIA] Acesso negado: ${JSON.stringify({ ...logBase, motivoNegacao: 'papel-insuficiente' })}`,
      );
    }
  }

  /**
   * Obtém nome do endpoint para logs e cache.
   *
   * @param context - Contexto de execução
   * @returns Nome do endpoint no formato "Controller.método"
   */
  private obterNomeEndpoint(context: ExecutionContext): string {
    const controllerClass = context.getClass();
    const handlerName = context.getHandler();
    
    return `${controllerClass.name}.${handlerName.name}`;
  }

  /**
   * ============================================================================
   * MÉTODOS UTILITÁRIOS ESTÁTICOS
   * ============================================================================
   */

  /**
   * Verifica se um papel tem permissão para acessar funcionalidades de outro papel.
   * Método utilitário para uso em outras partes do sistema.
   *
   * @param papelUsuario - Papel do usuário
   * @param papelNecessario - Papel necessário para a ação
   * @returns true se usuário tem permissão, false caso contrário
   *
   * @example
   * ```
   * // Admin pode fazer ações de vendedor?
   * PapeisGuard.temPermissaoParaPapel(PapelUsuario.ADMIN, PapelUsuario.VENDEDOR); // true
   * 
   * // Vendedor pode fazer ações de admin?
   * PapeisGuard.temPermissaoParaPapel(PapelUsuario.VENDEDOR, PapelUsuario.ADMIN); // false
   * ```
   */
  static temPermissaoParaPapel(papelUsuario: PapelUsuario, papelNecessario: PapelUsuario): boolean {
    const papeisPermitidos = HIERARQUIA_PAPEIS[papelUsuario] || [papelUsuario];
    return papeisPermitidos.includes(papelNecessario);
  }

  /**
   * Obtém todos os papéis que um usuário pode assumir (incluindo herança).
   *
   * @param papelUsuario - Papel base do usuário
   * @returns Array de papéis que o usuário pode assumir
   *
   * @example
   * ```
   * PapeisGuard.obterPapeisHerdados(PapelUsuario.ADMIN); 
   * // Retorna: [PapelUsuario.ADMIN, PapelUsuario.GERENTE, PapelUsuario.VENDEDOR]
   * 
   * PapeisGuard.obterPapeisHerdados(PapelUsuario.VENDEDOR);
   * // Retorna: [PapelUsuario.VENDEDOR]
   * ```
   */
  static obterPapeisHerdados(papelUsuario: PapelUsuario): PapelUsuario[] {
    return HIERARQUIA_PAPEIS[papelUsuario] || [papelUsuario];
  }

  /**
   * Valida se uma lista de papéis é válida no sistema.
   *
   * @param papeis - Lista de strings representando papéis
   * @returns Array de papéis válidos (enum)
   */
  static validarPapeis(papeis: string[]): PapelUsuario[] {
    return papeis
      .filter(papel => Object.values(PapelUsuario).includes(papel as PapelUsuario))
      .map(papel => papel as PapelUsuario);
  }

  /**
   * Obtém informações sobre a hierarquia completa de papéis do sistema.
   * Útil para documentação e interfaces administrativas.
   *
   * @returns Objeto com informações da hierarquia
   */
  static obterInformacoesHierarquia() {
    return {
      hierarquia: HIERARQUIA_PAPEIS,
      papeis: Object.values(PapelUsuario),
      descricoes: {
        [PapelUsuario.ADMIN]: 'Administrador com acesso total ao sistema',
        [PapelUsuario.GERENTE]: 'Gerente que administra vendedores e visualiza relatórios',
        [PapelUsuario.VENDEDOR]: 'Vendedor que participa de campanhas e submete vendas',
      },
      privilegios: {
        [PapelUsuario.ADMIN]: ['Criar campanhas', 'Gerenciar usuários', 'Visualizar relatórios', 'Configurar sistema'],
        [PapelUsuario.GERENTE]: ['Gerenciar vendedores', 'Visualizar relatórios', 'Participar de campanhas'],
        [PapelUsuario.VENDEDOR]: ['Participar de campanhas', 'Submeter vendas', 'Resgatar prêmios'],
      },
    };
  }
}

/**
 * ============================================================================
 * USUARIO DECORATOR - Extração de Dados do Usuário Autenticado - v2.0
 * ============================================================================
 *
 * Descrição:
 * Decorator de parâmetro customizado para extrair dados do usuário autenticado
 * do contexto da requisição. Simplifica acesso aos dados do usuário em controllers,
 * eliminando necessidade de acessar diretamente o objeto request.
 *
 * FUNCIONALIDADES IMPLEMENTADAS:
 * ✅ EXTRAÇÃO AUTOMÁTICA: Dados do usuário disponíveis via decorator
 * ✅ TYPE SAFETY: Interface tipada para dados do usuário
 * ✅ SELETIVIDADE: Extração de campos específicos quando necessário
 * ✅ VALIDAÇÃO: Verifica se usuário está autenticado
 * ✅ FLEXIBILIDADE: Suporte a diferentes formatos de dados
 * ✅ PERFORMANCE: Extração otimizada sem overhead
 *
 * INTEGRAÇÃO:
 * - Funciona após JwtAuthGuard anexar dados do usuário ao request
 * - Compatível com todos os guards de autorização
 * - Suporte completo ao sistema de papéis (RBAC)
 *
 * @module ComumModule
 * ============================================================================
 */

import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';

/**
 * Interface completa para dados do usuário autenticado.
 * Representa todos os dados disponíveis após autenticação JWT.
 */
export interface UsuarioLogado {
  /** ID único do usuário (UUID v4) */
  id: string;
  
  /** Email do usuário (usado como identificador único) */
  email: string;
  
  /** Papel do usuário no sistema (ADMIN, GERENTE, VENDEDOR) */
  papel: PapelUsuario;
  
  /** ID da ótica vinculada (null para ADMIN, obrigatório para GERENTE/VENDEDOR) */
  opticaId?: string | null;
  
  /** Nome completo do usuário */
  nome?: string;
  
  /** Timestamp de expiração do token JWT atual */
  tokenExp?: number;
  
  /** ID único do token (para auditoria e revogação) */
  tokenId?: string;
  
  /** Data da última atualização dos dados do usuário */
  ultimaAtualizacao?: Date;
}

/**
 * Interface para extração seletiva de campos do usuário.
 * Permite especificar quais campos devem ser extraídos.
 */
export interface OpcoesSeletorUsuario {
  /** Lista de campos específicos a serem extraídos */
  campos?: (keyof UsuarioLogado)[];
  
  /** Se deve validar se usuário está autenticado (padrão: true) */
  validarAutenticacao?: boolean;
  
  /** Se deve validar se usuário tem papel específico */
  validarPapel?: PapelUsuario | PapelUsuario[];
  
  /** Se deve incluir dados estendidos (metadados do token, etc.) */
  incluirDadosEstendidos?: boolean;
}

/**
 * Decorator de parâmetro para extrair dados do usuário autenticado.
 *
 * FUNCIONAMENTO:
 * 1. Extrai dados do usuário do contexto da requisição (request.user)
 * 2. Valida se usuário está autenticado (se solicitado)
 * 3. Aplica filtros e seleções específicas
 * 4. Retorna dados formatados conforme interface tipada
 *
 * CASOS DE USO:
 * ```
 * // Extração completa dos dados do usuário
 * @Get('perfil')
 * obterPerfil(@Usuario() usuario: UsuarioLogado) {
 *   return { id: usuario.id, email: usuario.email };
 * }
 *
 * // Extração apenas do ID do usuário
 * @Get('minhas-vendas')
 * listarMinhasVendas(@Usuario('id') usuarioId: string) {
 *   return this.vendasService.buscarPorVendedor(usuarioId);
 * }
 *
 * // Extração com validação de papel
 * @Post('admin-only')
 * acaoAdmin(@Usuario({ validarPapel: 'ADMIN' }) admin: UsuarioLogado) {
 *   return this.adminService.executarAcao(admin.id);
 * }
 *
 * // Extração de campos específicos
 * @Get('dashboard')
 * obterDashboard(@Usuario({ campos: ['id', 'papel', 'opticaId'] }) usuario) {
 *   return this.dashboardService.gerarDados(usuario);
 * }
 * ```
 *
 * @param opcoes - Configurações para extração (string para campo único ou objeto para opções avançadas)
 * @returns Decorator que extrai dados do usuário do contexto
 */
export const Usuario = createParamDecorator(
  (opcoes: keyof UsuarioLogado | OpcoesSeletorUsuario | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const usuarioBruto = request.user;

    // ✅ VALIDAÇÃO BÁSICA: Verifica se usuário está presente
    if (!usuarioBruto) {
      throw new UnauthorizedException(
        'Usuário não autenticado. Certifique-se de usar @UseGuards(JwtAuthGuard) antes do decorator @Usuario()'
      );
    }

    // ✅ NORMALIZAÇÃO: Cria objeto usuário padronizado
    const usuario: UsuarioLogado = {
      id: usuarioBruto.id,
      email: usuarioBruto.email,
      papel: usuarioBruto.papel,
      opticaId: usuarioBruto.opticaId,
      nome: usuarioBruto.nome,
      tokenExp: usuarioBruto.tokenExp,
      tokenId: usuarioBruto.tokenId,
      ultimaAtualizacao: usuarioBruto.ultimaAtualizacao ? new Date(usuarioBruto.ultimaAtualizacao) : undefined,
    };

    // ✅ CASO 1: Extração de campo único (string)
    if (typeof opcoes === 'string') {
      return extrairCampoUnico(usuario, opcoes);
    }

    // ✅ CASO 2: Extração com opções avançadas (objeto)
    if (typeof opcoes === 'object' && opcoes !== null) {
      return extrairComOpcoes(usuario, opcoes, ctx);
    }

    // ✅ CASO 3: Extração completa (sem parâmetros)
    return usuario;
  },
);

/**
 * ============================================================================
 * FUNÇÕES AUXILIARES DE EXTRAÇÃO
 * ============================================================================
 */

/**
 * Extrai um campo único do usuário.
 *
 * @param usuario - Dados completos do usuário
 * @param campo - Nome do campo a ser extraído
 * @returns Valor do campo solicitado
 */
function extrairCampoUnico(usuario: UsuarioLogado, campo: keyof UsuarioLogado): any {
  const valor = usuario[campo];
  
  if (valor === undefined && campo !== 'opticaId' && campo !== 'nome') {
    throw new UnauthorizedException(`Campo '${campo}' não disponível nos dados do usuário autenticado`);
  }
  
  return valor;
}

/**
 * Extrai dados do usuário com opções avançadas.
 *
 * @param usuario - Dados completos do usuário
 * @param opcoes - Opções de extração
 * @param ctx - Contexto de execução (para validações adicionais)
 * @returns Dados do usuário conforme opções
 */
function extrairComOpcoes(
  usuario: UsuarioLogado, 
  opcoes: OpcoesSeletorUsuario, 
  ctx: ExecutionContext
): Partial<UsuarioLogado> | UsuarioLogado {
  // ✅ VALIDAÇÃO DE AUTENTICAÇÃO
  if (opcoes.validarAutenticacao !== false) {
    validarUsuarioAutenticado(usuario);
  }

  // ✅ VALIDAÇÃO DE PAPEL
  if (opcoes.validarPapel) {
    validarPapelUsuario(usuario, opcoes.validarPapel, ctx);
  }

  // ✅ EXTRAÇÃO SELETIVA DE CAMPOS
  if (opcoes.campos && opcoes.campos.length > 0) {
    return extrairCamposEspecificos(usuario, opcoes.campos);
  }

  // ✅ INCLUSÃO DE DADOS ESTENDIDOS
  if (opcoes.incluirDadosEstendidos) {
    return adicionarDadosEstendidos(usuario, ctx);
  }

  return usuario;
}

/**
 * Valida se usuário está completamente autenticado.
 *
 * @param usuario - Dados do usuário
 * @throws UnauthorizedException se validação falhar
 */
function validarUsuarioAutenticado(usuario: UsuarioLogado): void {
  if (!usuario.id || !usuario.email || !usuario.papel) {
    throw new UnauthorizedException('Dados de autenticação incompletos');
  }

  // Validação específica por papel
  if ((usuario.papel === 'GERENTE' || usuario.papel === 'VENDEDOR') && !usuario.opticaId) {
    throw new UnauthorizedException('Usuário não possui ótica vinculada');
  }
}

/**
 * Valida se usuário possui papel necessário.
 *
 * @param usuario - Dados do usuário
 * @param papeisNecessarios - Papel ou papéis necessários
 * @param ctx - Contexto de execução
 * @throws UnauthorizedException se usuário não tiver papel necessário
 */
function validarPapelUsuario(
  usuario: UsuarioLogado, 
  papeisNecessarios: PapelUsuario | PapelUsuario[],
  ctx: ExecutionContext
): void {
  const papeis = Array.isArray(papeisNecessarios) ? papeisNecessarios : [papeisNecessarios];
  
  if (!papeis.includes(usuario.papel)) {
    const endpoint = `${ctx.getClass().name}.${ctx.getHandler().name}`;
    throw new UnauthorizedException(
      `Acesso negado ao endpoint ${endpoint}. ` +
      `Papéis necessários: [${papeis.join(', ')}]. ` +
      `Seu papel: ${usuario.papel}`
    );
  }
}

/**
 * Extrai apenas campos específicos do usuário.
 *
 * @param usuario - Dados completos do usuário
 * @param campos - Lista de campos a serem extraídos
 * @returns Objeto com apenas os campos solicitados
 */
function extrairCamposEspecificos(
  usuario: UsuarioLogado, 
  campos: (keyof UsuarioLogado)[]
): Partial<UsuarioLogado> {
  const resultado: Partial<UsuarioLogado> = {};
  
  campos.forEach(campo => {
    if (usuario[campo] !== undefined) {
      (resultado as any)[campo] = usuario[campo];
    }
  });

  return resultado;
}

/**
 * Adiciona dados estendidos ao usuário (metadados, contexto, etc.).
 *
 * @param usuario - Dados básicos do usuário
 * @param ctx - Contexto de execução
 * @returns Usuário com dados estendidos
 */
function adicionarDadosEstendidos(usuario: UsuarioLogado, ctx: ExecutionContext): UsuarioLogado & {
  contexto: {
    endpoint: string;
    metodo: string;
    timestamp: string;
    ip?: string;
  };
} {
  const request = ctx.switchToHttp().getRequest();
  
  return {
    ...usuario,
    contexto: {
      endpoint: `${ctx.getClass().name}.${ctx.getHandler().name}`,
      metodo: request.method,
      timestamp: new Date().toISOString(),
      ip: request.ip || request.connection?.remoteAddress,
    },
  };
}

/**
 * ============================================================================
 * DECORATORS PRÉ-CONFIGURADOS PARA CASOS COMUNS
 * ============================================================================
 */

/**
 * Decorator pré-configurado para extrair apenas o ID do usuário.
 * Equivalente a @Usuario('id')
 *
 * @example
 * ```
 * @Get('minhas-vendas')
 * listarVendas(@UsuarioId() vendedorId: string) {
 *   return this.vendasService.buscarPorVendedor(vendedorId);
 * }
 * ```
 */
export const UsuarioId = () => Usuario('id');

/**
 * Decorator pré-configurado para extrair apenas o email do usuário.
 * Equivalente a @Usuario('email')
 *
 * @example
 * ```
 * @Get('perfil-basico')
 * obterPerfilBasico(@UsuarioEmail() email: string) {
 *   return { usuario: email };
 * }
 * ```
 */
export const UsuarioEmail = () => Usuario('email');

/**
 * Decorator pré-configurado para extrair apenas o papel do usuário.
 * Equivalente a @Usuario('papel')
 *
 * @example
 * ```
 * @Get('permissoes')
 * listarPermissoes(@UsuarioPapel() papel: PapelUsuario) {
 *   return this.authService.obterPermissoesPorPapel(papel);
 * }
 * ```
 */
export const UsuarioPapel = () => Usuario('papel');

/**
 * Decorator pré-configurado para extrair dados básicos do usuário.
 * Inclui apenas: id, email, papel, opticaId
 *
 * @example
 * ```
 * @Get('dashboard')
 * obterDashboard(@UsuarioBasico() usuario: Partial<UsuarioLogado>) {
 *   return this.dashboardService.gerar(usuario);
 * }
 * ```
 */
export const UsuarioBasico = () => Usuario({
  campos: ['id', 'email', 'papel', 'opticaId'],
});

/**
 * Decorator pré-configurado para extrair dados administrativos.
 * Valida se usuário é ADMIN e inclui dados estendidos.
 *
 * @example
 * ```
 * @Post('configurar-sistema')
 * configurarSistema(@UsuarioAdmin() admin: UsuarioLogado) {
 *   return this.configService.atualizar(admin.id);
 * }
 * ```
 */
export const UsuarioAdmin = () => Usuario({
  validarPapel: PapelUsuario.ADMIN,
  incluirDadosEstendidos: true,
});

/**
 * Decorator pré-configurado para vendedores com validação.
 * Valida se usuário é VENDEDOR e garante que possui opticaId.
 *
 * @example
 * ```
 * @Post('enviar-venda')
 * enviarVenda(@UsuarioVendedor() vendedor: UsuarioLogado) {
 *   return this.vendasService.processar(vendedor.id, vendedor.opticaId);
 * }
 * ```
 */
export const UsuarioVendedor = () => Usuario({
  validarPapel: PapelUsuario.VENDEDOR,
  validarAutenticacao: true,
});

/**
 * ============================================================================
 * UTILITÁRIOS E HELPERS
 * ============================================================================
 */

/**
 * Verifica se dados do usuário são válidos para um papel específico.
 *
 * @param usuario - Dados do usuário
 * @param papel - Papel a ser validado
 * @returns true se usuário é válido para o papel, false caso contrário
 */
export function validarUsuarioParaPapel(usuario: UsuarioLogado, papel: PapelUsuario): boolean {
  if (usuario.papel !== papel) {
    return false;
  }

  // Validações específicas por papel
  switch (papel) {
    case PapelUsuario.VENDEDOR:
    case PapelUsuario.GERENTE:
      return !!usuario.opticaId;
    
    case PapelUsuario.ADMIN:
      return true;
    
    default:
      return false;
  }
}

/**
 * Obtém informações resumidas do usuário para logs e auditoria.
 *
 * @param usuario - Dados completos do usuário
 * @returns Informações resumidas seguras para logs
 */
export function obterInfoResumo(usuario: UsuarioLogado): {
  id: string;
  email: string;
  papel: PapelUsuario;
  optica?: string;
} {
  return {
    id: usuario.id,
    email: usuario.email.replace(/(.{3}).*(@.*)/, '$1***$2'), // Ofusca email parcialmente
    papel: usuario.papel,
    optica: usuario.opticaId || undefined,
  };
}

/**
 * Verifica se token do usuário está próximo da expiração.
 *
 * @param usuario - Dados do usuário com token
 * @param margemSeguranca - Margem em segundos (padrão: 300 = 5 minutos)
 * @returns true se token está próximo da expiração
 */
export function tokenProximoDaExpiracao(usuario: UsuarioLogado, margemSeguranca = 300): boolean {
  if (!usuario.tokenExp) {
    return false;
  }

  const agora = Math.floor(Date.now() / 1000);
  const tempoRestante = usuario.tokenExp - agora;
  
  return tempoRestante <= margemSeguranca;
}

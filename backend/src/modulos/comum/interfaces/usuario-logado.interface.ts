/**
 * ============================================================================
 * USUARIO LOGADO INTERFACE - Definições de Tipos para Usuário Autenticado - v2.0
 * ============================================================================
 *
 * Descrição:
 * Interface central que define a estrutura de dados do usuário autenticado
 * em todo o sistema EPS Campanhas. Garante consistência de tipos entre
 * guards, decorators, services e controllers.
 *
 * FUNCIONALIDADES IMPLEMENTADAS:
 * ✅ TYPE SAFETY: Tipagem forte para dados do usuário
 * ✅ EXTENSIBILIDADE: Preparado para novos campos e funcionalidades
 * ✅ COMPATIBILIDADE: Compatível com JWT payloads e dados do Prisma
 * ✅ DOCUMENTAÇÃO: TSDoc completo para todos os campos
 * ✅ VALIDAÇÃO: Interfaces auxiliares para validações específicas
 * ✅ FLEXIBILIDADE: Suporte a dados opcionais e contextuais
 *
 * INTEGRAÇÃO:
 * - Usado pelo JwtAuthGuard para estruturar dados do token
 * - Usado pelo decorator @Usuario para tipagem de parâmetros
 * - Usado pelos services para operações com usuário autenticado
 * - Compatível com sistema de papéis (RBAC) do PapeisGuard
 *
 * @module ComumModule
 * ============================================================================
 */

import { PapelUsuario } from '@prisma/client';

/**
 * Interface principal para dados do usuário autenticado no sistema.
 * 
 * Esta interface representa o usuário após autenticação JWT bem-sucedida,
 * contendo todos os dados necessários para autorização, auditoria e
 * funcionalidades específicas por papel.
 *
 * ORIGEM DOS DADOS:
 * - Campos básicos: Extraídos do token JWT durante autenticação
 * - Campos contextuais: Adicionados pelos guards durante processamento
 * - Campos estendidos: Opcionalmente carregados conforme necessidade
 *
 * CICLO DE VIDA:
 * 1. JwtAuthGuard valida token e cria objeto UsuarioLogado básico
 * 2. PapeisGuard usa dados para validação de autorização
 * 3. Controllers acessam dados via decorator @Usuario
 * 4. Services recebem dados tipados para operações seguras
 */
export interface UsuarioLogado {
  /**
   * Identificador único do usuário no sistema (UUID v4).
   * 
   * Este ID é imutável e usado como chave primária em todas
   * as relações e operações do sistema. Extraído do campo 'sub'
   * do token JWT conforme padrão RFC 7519.
   *
   * CARACTERÍSTICAS:
   * - Formato: UUID v4 (ex: 550e8400-e29b-41d4-a716-446655440000)
   * - Imutável: Nunca muda durante vida útil do usuário
   * - Único: Garantia de unicidade global no sistema
   * - Indexado: Otimizado para consultas de performance
   *
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  id: string;

  /**
   * Endereço de email do usuário, usado como identificador único para login.
   * 
   * Campo obrigatório que serve como username no sistema de autenticação.
   * Validado quanto ao formato e unicidade durante registro.
   *
   * CARACTERÍSTICAS:
   * - Formato: Email válido conforme RFC 5322
   * - Único: Um email por usuário, um usuário por email
   * - Case-insensitive: Normalizado para lowercase no banco
   * - Imutável: Alterações requerem processo específico de verificação
   *
   * SEGURANÇA:
   * - Usado para recuperação de senha
   * - Logs de auditoria identificam usuário por email
   * - Verificação obrigatória em operações sensíveis
   *
   * @example "joao.silva@oticavision.com.br"
   */
  email: string;

  /**
   * Papel do usuário no sistema, define permissões e funcionalidades acessíveis.
   * 
   * Campo central do sistema RBAC (Role-Based Access Control) que determina
   * quais endpoints, recursos e operações o usuário pode acessar.
   *
   * PAPÉIS DISPONÍVEIS:
   * - ADMIN: Acesso total, gerenciamento de campanhas e usuários
   * - GERENTE: Gestão de equipe, relatórios da ótica, comissões
   * - VENDEDOR: Participação em campanhas, submissão de vendas, resgates
   *
   * HIERARQUIA:
   * - ADMIN pode assumir funções de GERENTE e VENDEDOR
   * - GERENTE pode assumir funções de VENDEDOR
   * - VENDEDOR possui apenas suas próprias permissões
   *
   * IMUTABILIDADE:
   * - Alterações de papel requerem novo login (invalidação de token)
   * - Logs de auditoria registram mudanças de papel
   * - Validação contínua durante cada requisição
   */
  papel: PapelUsuario;

  /**
   * Identificador da ótica à qual o usuário está vinculado.
   * 
   * OBRIGATORIEDADE POR PAPEL:
   * - ADMIN: null (não vinculado a ótica específica)
   * - GERENTE: obrigatório (gerencia vendedores desta ótica)
   * - VENDEDOR: obrigatório (submete vendas para esta ótica)
   *
   * FUNCIONALIDADES:
   * - Data tenancy: Usuários só veem dados da sua ótica
   * - Targeting: Campanhas podem ser direcionadas por ótica
   * - Hierarquia: Filiais podem herdar campanhas da matriz
   * - Analytics: Relatórios segmentados por ótica
   *
   * SEGURANÇA:
   * - Validação obrigatória em operações de dados
   * - Filtros automáticos em consultas sensíveis
   * - Auditoria de acesso cross-ótica
   *
   * @example "uuid-da-optica-abc-123" // UUID da ótica
   * @example null // Para usuários ADMIN
   */
  opticaId?: string | null;

  /**
   * Nome completo do usuário para exibição e identificação.
   * 
   * Campo opcional usado em interfaces, relatórios e comunicações.
   * Não é usado para autenticação, apenas para apresentação.
   *
   * CARACTERÍSTICAS:
   * - Formato livre: Aceita caracteres especiais e acentos
   * - Editável: Usuário pode alterar quando necessário
   * - Não-único: Múltiplos usuários podem ter mesmo nome
   * - Opcional: Sistema funciona mesmo sem este campo
   *
   * USO:
   * - Headers de relatórios ("Relatório de João Silva")
   * - Notificações personalizadas
   * - Interfaces de usuário amigáveis
   * - Assinaturas em documentos digitais
   *
   * @example "João Silva Santos"
   * @example "Maria Fernanda Oliveira"
   */
  nome?: string;

  /**
   * Timestamp Unix de expiração do token JWT atual.
   * 
   * Usado para validações de expiração e renovação automática de tokens.
   * Baseado no claim 'exp' do token JWT conforme RFC 7519.
   *
   * FUNCIONALIDADES:
   * - Validação contínua de validade do token
   * - Renovação automática quando próximo da expiração
   * - Logs de auditoria com informações temporais
   * - Invalidação de sessões expiradas
   *
   * FORMATO:
   * - Seconds since Unix Epoch (1970-01-01 00:00:00 UTC)
   * - Exemplo: 1735689600 representa 01/01/2025 00:00:00 UTC
   *
   * @example 1735689600 // 01/01/2025 00:00:00 UTC
   */
  tokenExp?: number;

  /**
   * Identificador único do token JWT (claim 'jti').
   * 
   * Usado para rastreamento, auditoria e revogação específica de tokens.
   * Permite invalidar tokens individuais sem afetar outros tokens do usuário.
   *
   * FUNCIONALIDADES:
   * - Blacklist de tokens: Revogação seletiva
   * - Auditoria detalhada: Rastreamento por token específico
   * - Detecção de reutilização: Prevenção de replay attacks
   * - Logs forenses: Identificação precisa de sessões
   *
   * CARACTERÍSTICAS:
   * - Formato: UUID v4 gerado na criação do token
   * - Único: Cada token tem ID diferente, mesmo para mesmo usuário
   * - Imutável: ID não muda durante vida útil do token
   * - Opcional: Presente apenas em tokens com suporte a revogação
   *
   * @example "token-uuid-abc-def-123-456"
   */
  tokenId?: string;

  /**
   * Data da última atualização dos dados do usuário no banco.
   * 
   * Campo opcional usado para invalidação de cache e sincronização
   * de dados entre token JWT e banco de dados.
   *
   * FUNCIONALIDADES:
   * - Cache invalidation: Detecta quando dados estão desatualizados
   * - Sincronização: Força reload de dados quando necessário
   * - Auditoria: Rastreamento de mudanças nos dados do usuário
   * - Debugging: Troubleshooting de inconsistências
   *
   * CASOS DE USO:
   * - Usuário mudou papel: Token deve ser invalidado
   * - Dados da ótica foram alterados: Recarregar informações
   * - Nome ou email foi atualizado: Atualizar interfaces
   *
   * @example new Date('2025-01-01T10:30:00Z')
   */
  ultimaAtualizacao?: Date;
}

/**
 * ============================================================================
 * INTERFACES AUXILIARES E ESPECIALIZADAS
 * ============================================================================
 */

/**
 * Interface para dados básicos do usuário (campos essenciais apenas).
 * Usada em operações que não requerem dados completos.
 *
 * CASOS DE USO:
 * - Logs de auditoria simplificados
 * - Operações de validação básica
 * - Cache de dados essenciais
 * - APIs externas com dados limitados
 */
export interface UsuarioBasico {
  /** ID único do usuário */
  id: string;
  /** Email do usuário */
  email: string;
  /** Papel no sistema */
  papel: PapelUsuario;
  /** ID da ótica vinculada (se aplicável) */
  opticaId?: string | null;
}

/**
 * Interface para contexto estendido do usuário com informações da requisição.
 * Usada em operações que requerem rastreamento detalhado.
 *
 * CASOS DE USO:
 * - Auditoria de segurança avançada
 * - Detecção de anomalias de acesso
 * - Logs forenses detalhados
 * - Monitoramento de sessões
 */
export interface UsuarioComContexto extends UsuarioLogado {
  /** Informações contextuais da requisição */
  contexto: {
    /** Nome completo do endpoint acessado */
    endpoint: string;
    /** Método HTTP da requisição */
    metodo: string;
    /** Timestamp da requisição */
    timestamp: string;
    /** Endereço IP de origem */
    ip?: string;
    /** User-Agent do navegador/cliente */
    userAgent?: string;
    /** Headers personalizados relevantes */
    headersCustomizados?: Record<string, string>;
  };
}

/**
 * Interface para dados do usuário otimizados para cache.
 * Remove campos sensíveis e inclui informações de controle.
 *
 * CASOS DE USO:
 * - Cache Redis/Memcached
 * - Sessões distribuídas
 * - Dados para frontend (sem informações sensíveis)
 * - Sincronização entre microservices
 */
export interface UsuarioCacheavel {
  /** Dados básicos do usuário */
  usuario: UsuarioBasico;
  /** Timestamp de criação do cache */
  cacheTimestamp: number;
  /** TTL (Time To Live) do cache em segundos */
  cacheTTL: number;
  /** Hash dos dados para verificação de integridade */
  hashIntegridade: string;
}

/**
 * Interface para validação de permissões específicas.
 * Usada em operações que requerem verificações granulares.
 */
export interface ValidacaoPermissao {
  /** Usuário a ser validado */
  usuario: UsuarioLogado;
  /** Recurso que está sendo acessado */
  recurso: string;
  /** Ação que está sendo executada */
  acao: string;
  /** Contexto adicional para validação */
  contexto?: Record<string, any>;
}

/**
 * Interface para dados de auditoria de acesso.
 * Usada em logs de segurança e compliance.
 */
export interface LogAuditoriaUsuario {
  /** Dados básicos do usuário */
  usuario: UsuarioBasico;
  /** Resultado da operação */
  resultado: 'AUTORIZADO' | 'NEGADO' | 'ERRO';
  /** Razão do resultado */
  razao?: string;
  /** Timestamp da operação */
  timestamp: string;
  /** Dados contextuais */
  contexto: {
    endpoint: string;
    metodo: string;
    ip: string;
    userAgent?: string;
  };
  /** Metadados adicionais */
  metadados?: Record<string, any>;
}

/**
 * ============================================================================
 * TYPE GUARDS E UTILITÁRIOS DE VALIDAÇÃO
 * ============================================================================
 */

/**
 * Type guard para verificar se objeto é um UsuarioLogado válido.
 *
 * @param obj - Objeto a ser verificado
 * @returns true se objeto é UsuarioLogado válido
 */
export function isUsuarioLogado(obj: any): obj is UsuarioLogado {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.papel === 'string' &&
    Object.values(PapelUsuario).includes(obj.papel) &&
    (obj.opticaId === null || obj.opticaId === undefined || typeof obj.opticaId === 'string')
  );
}

/**
 * Type guard para verificar se usuário tem papel específico.
 *
 * @param usuario - Usuário a ser verificado
 * @param papel - Papel necessário
 * @returns true se usuário tem o papel especificado
 */
export function isUsuarioComPapel(usuario: UsuarioLogado, papel: PapelUsuario): boolean {
  return usuario.papel === papel;
}

/**
 * Type guard para verificar se usuário é administrador.
 *
 * @param usuario - Usuário a ser verificado
 * @returns true se usuário é ADMIN
 */
export function isAdmin(usuario: UsuarioLogado): boolean {
  return usuario.papel === PapelUsuario.ADMIN;
}

/**
 * Type guard para verificar se usuário é gerente.
 *
 * @param usuario - Usuário a ser verificado
 * @returns true se usuário é GERENTE
 */
export function isGerente(usuario: UsuarioLogado): boolean {
  return usuario.papel === PapelUsuario.GERENTE;
}

/**
 * Type guard para verificar se usuário é vendedor.
 *
 * @param usuario - Usuário a ser verificado
 * @returns true se usuário é VENDEDOR
 */
export function isVendedor(usuario: UsuarioLogado): boolean {
  return usuario.papel === PapelUsuario.VENDEDOR;
}

/**
 * Verifica se usuário tem ótica vinculada (obrigatório para GERENTE/VENDEDOR).
 *
 * @param usuario - Usuário a ser verificado
 * @returns true se usuário tem ótica vinculada ou é ADMIN
 */
export function hasOpticaVinculada(usuario: UsuarioLogado): boolean {
  return usuario.papel === PapelUsuario.ADMIN || !!usuario.opticaId;
}

/**
 * ============================================================================
 * CONSTANTES E ENUMS RELACIONADOS
 * ============================================================================
 */

/**
 * Enum com campos obrigatórios por papel de usuário.
 */
export enum CamposObrigatoriosPorPapel {
  ADMIN = 'id,email,papel',
  GERENTE = 'id,email,papel,opticaId',
  VENDEDOR = 'id,email,papel,opticaId',
}

/**
 * Mapeamento de papéis para campos obrigatórios.
 */
export const CAMPOS_OBRIGATORIOS_POR_PAPEL = {
  [PapelUsuario.ADMIN]: ['id', 'email', 'papel'] as const,
  [PapelUsuario.GERENTE]: ['id', 'email', 'papel', 'opticaId'] as const,
  [PapelUsuario.VENDEDOR]: ['id', 'email', 'papel', 'opticaId'] as const,
} as const;

/**
 * Interface para configurações de sessão por papel.
 */
export interface ConfiguracaoSessaoPorPapel {
  /** Duração padrão do token em segundos */
  duracaoToken: number;
  /** Permite múltiplas sessões simultâneas */
  multiplasSessiones: boolean;
  /** Renovação automática de token */
  renovacaoAutomatica: boolean;
  /** Campos obrigatórios para este papel */
  camposObrigatorios: readonly string[];
}

/**
 * Configurações de sessão padrão por papel.
 */
export const CONFIGURACAO_SESSAO_POR_PAPEL: Record<PapelUsuario, ConfiguracaoSessaoPorPapel> = {
  [PapelUsuario.ADMIN]: {
    duracaoToken: 8 * 60 * 60, // 8 horas
    multiplasSessiones: true,
    renovacaoAutomatica: true,
    camposObrigatorios: CAMPOS_OBRIGATORIOS_POR_PAPEL[PapelUsuario.ADMIN],
  },
  [PapelUsuario.GERENTE]: {
    duracaoToken: 12 * 60 * 60, // 12 horas
    multiplasSessiones: true,
    renovacaoAutomatica: true,
    camposObrigatorios: CAMPOS_OBRIGATORIOS_POR_PAPEL[PapelUsuario.GERENTE],
  },
  [PapelUsuario.VENDEDOR]: {
    duracaoToken: 24 * 60 * 60, // 24 horas
    multiplasSessiones: false,
    renovacaoAutomatica: true,
    camposObrigatorios: CAMPOS_OBRIGATORIOS_POR_PAPEL[PapelUsuario.VENDEDOR],
  },
} as const;

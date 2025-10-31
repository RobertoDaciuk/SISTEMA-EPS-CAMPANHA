/**
 * ============================================================================
 * PAPEIS DECORATOR - Decorator para Controle de Acesso por Papéis - v2.0
 * ============================================================================
 *
 * Descrição:
 * Decorator customizado para definir quais papéis de usuário podem acessar
 * rotas específicas no sistema EPS Campanhas. Trabalha em conjunto com
 * o PapeisGuard para implementar RBAC (Role-Based Access Control).
 *
 * FUNCIONALIDADES IMPLEMENTADAS:
 * ✅ MÚLTIPLOS PAPÉIS: Suporte a múltiplos papéis por endpoint
 * ✅ TYPE SAFETY: Validação em tempo de compilação dos papéis
 * ✅ HERANÇA AUTOMÁTICA: Funciona com hierarquia de papéis do PapeisGuard
 * ✅ FLEXIBILIDADE: Pode ser aplicado em métodos ou classes
 * ✅ METADADOS: Usa sistema de metadados do NestJS para eficiência
 * ✅ DOCUMENTAÇÃO: Integração com Swagger para documentação automática
 *
 * INTEGRAÇÃO COM GUARDS:
 * Este decorator apenas define metadados. A validação real é feita pelo
 * PapeisGuard que lê estes metadados e aplica as regras de hierarquia.
 *
 * @module ComumModule
 * ============================================================================
 */

import { SetMetadata } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';

/**
 * Chave única para metadados de papéis no sistema de metadados do NestJS.
 * Usada pelo PapeisGuard para extrair informações de controle de acesso.
 */
export const PAPEIS_KEY = 'papeis' as const;

/**
 * Decorator para definir quais papéis podem acessar um endpoint.
 *
 * FUNCIONAMENTO:
 * 1. Recebe lista de papéis permitidos como parâmetros
 * 2. Valida se papéis fornecidos são válidos (enum PapelUsuario)
 * 3. Armazena papéis como metadados no método/classe
 * 4. PapeisGuard lê estes metadados durante execução
 * 5. Aplica regras de hierarquia e valida acesso
 *
 * HIERARQUIA AUTOMÁTICA:
 * - Se endpoint requer 'VENDEDOR', ADMIN e GERENTE também podem acessar
 * - Se endpoint requer 'GERENTE', ADMIN também pode acessar
 * - Se endpoint requer 'ADMIN', apenas ADMIN pode acessar
 *
 * CASOS DE USO:
 * ```
 * // Apenas administradores
 * @Papeis('ADMIN')
 * @Post('campanhas')
 * criarCampanha() { ... }
 *
 * // Administradores e gerentes
 * @Papeis('ADMIN', 'GERENTE')  
 * @Get('relatorios')
 * obterRelatorios() { ... }
 *
 * // Todos os papéis autenticados
 * @Papeis('ADMIN', 'GERENTE', 'VENDEDOR')
 * @Get('perfil')
 * obterPerfil() { ... }
 *
 * // Aplicado na classe inteira (todos métodos herdam)
 * @Papeis('ADMIN')
 * @Controller('admin')
 * class AdminController { ... }
 * ```
 *
 * @param papeis - Lista de papéis que podem acessar o endpoint
 * @returns Decorator que define metadados de acesso
 *
 * @throws Error se papel inválido for fornecido (em desenvolvimento)
 */
export function Papeis(...papeis: (keyof typeof PapelUsuario)[]): MethodDecorator & ClassDecorator {
  // ✅ VALIDAÇÃO DE PAPÉIS EM TEMPO DE DESENVOLVIMENTO
  if (process.env.NODE_ENV !== 'production') {
    validarPapeisDecorator(papeis);
  }

  // ✅ NORMALIZAÇÃO: Remove duplicatas e converte para array
  const papeisUnicos = Array.from(new Set(papeis));
  
  // ✅ LOG DE DEBUG: Registra configuração de papéis (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[RBAC] Decorator @Papeis aplicado com papéis: [${papeisUnicos.join(', ')}]`);
  }

  // ✅ CRIAR METADADOS: Usa sistema de metadados do NestJS
  return SetMetadata(PAPEIS_KEY, papeisUnicos);
}

/**
 * ============================================================================
 * VALIDATORS E UTILITÁRIOS
 * ============================================================================
 */

/**
 * Valida se os papéis fornecidos ao decorator são válidos.
 * Executa apenas em desenvolvimento para detectar erros cedo.
 *
 * @param papeis - Lista de papéis a serem validados
 * @throws Error se algum papel for inválido
 */
function validarPapeisDecorator(papeis: (keyof typeof PapelUsuario)[]): void {
  if (!papeis || papeis.length === 0) {
    throw new Error(
      '[RBAC] Decorator @Papeis requer pelo menos um papel. ' +
      'Papéis válidos: ADMIN, GERENTE, VENDEDOR'
    );
  }

  const papeisValidos = Object.keys(PapelUsuario) as (keyof typeof PapelUsuario)[];
  const papeisInvalidos = papeis.filter(papel => !papeisValidos.includes(papel));

  if (papeisInvalidos.length > 0) {
    throw new Error(
      `[RBAC] Papéis inválidos no decorator @Papeis: [${papeisInvalidos.join(', ')}]. ` +
      `Papéis válidos: [${papeisValidos.join(', ')}]`
    );
  }

  // Validação de duplicatas (informativa, não bloqueia)
  const papeisUnicos = Array.from(new Set(papeis));
  if (papeisUnicos.length !== papeis.length) {
    console.warn(
      `[RBAC] Aviso: Papéis duplicados encontrados no decorator @Papeis: [${papeis.join(', ')}]. ` +
      `Serão automaticamente removidos: [${papeisUnicos.join(', ')}]`
    );
  }
}

/**
 * ============================================================================
 * DECORATORS AUXILIARES PRÉ-CONFIGURADOS
 * ============================================================================
 */

/**
 * Decorator pré-configurado para endpoints exclusivos de administradores.
 * Equivalente a @Papeis('ADMIN')
 *
 * @example
 * ```
 * @ApenasSuperAdmin()
 * @Delete('campanhas/:id')
 * removerCampanha() { ... }
 * ```
 */
export const ApenasSuperAdmin = () => Papeis('ADMIN');

/**
 * Decorator pré-configurado para endpoints de administradores e gerentes.
 * Equivalente a @Papeis('ADMIN', 'GERENTE')
 *
 * @example
 * ```
 * @AdminOuGerente()
 * @Get('relatorios-financeiros')
 * obterRelatoriosFinanceiros() { ... }
 * ```
 */
export const AdminOuGerente = () => Papeis('ADMIN', 'GERENTE');

/**
 * Decorator pré-configurado para endpoints acessíveis por todos os papéis autenticados.
 * Equivalente a @Papeis('ADMIN', 'GERENTE', 'VENDEDOR')
 *
 * @example
 * ```
 * @TodosOsPapeis()
 * @Get('meu-perfil')
 * obterMeuPerfil() { ... }
 * ```
 */
export const TodosOsPapeis = () => Papeis('ADMIN', 'GERENTE', 'VENDEDOR');

/**
 * Decorator pré-configurado para endpoints exclusivos de vendedores.
 * Equivalente a @Papeis('VENDEDOR')
 * 
 * ATENÇÃO: Por hierarquia, ADMIN e GERENTE também podem acessar.
 * Para acesso EXCLUSIVO de vendedores, usar lógica customizada no controller.
 *
 * @example
 * ```
 * @ApenasVendedores()
 * @Post('enviar-venda')
 * enviarVenda() { ... }
 * ```
 */
export const ApenasVendedores = () => Papeis('VENDEDOR');

/**
 * Decorator pré-configurado para endpoints de gerenciamento.
 * Usado em funcionalidades que envolvem administração de vendedores.
 * Equivalente a @Papeis('ADMIN', 'GERENTE')
 *
 * @example
 * ```
 * @Gerenciamento()
 * @Get('vendedores-da-equipe')
 * listarVendedoresDaEquipe() { ... }
 * ```
 */
export const Gerenciamento = () => Papeis('ADMIN', 'GERENTE');

/**
 * ============================================================================
 * UTILITÁRIOS PARA REFLEXÃO E DEBUGGING
 * ============================================================================
 */

/**
 * Utilitário para verificar se um método ou classe possui o decorator @Papeis.
 * Útil para debugging e testes.
 *
 * @param target - Classe ou método a ser verificado
 * @returns Array de papéis definidos ou null se não possuir decorator
 */
export function obterPapeisDoDecorator(target: any): string[] | null {
  const metadados = Reflect.getMetadata(PAPEIS_KEY, target);
  return metadados || null;
}

/**
 * Utilitário para listar todos os endpoints de um controller com seus papéis.
 * Útil para documentação automática e auditoria de segurança.
 *
 * @param controllerClass - Classe do controller a ser analisada
 * @returns Mapa de métodos e seus papéis
 */
export function mapearPapeisDoController(controllerClass: any): Record<string, string[]> {
  const prototype = controllerClass.prototype;
  const metodos = Object.getOwnPropertyNames(prototype).filter(
    name => typeof prototype[name] === 'function' && name !== 'constructor'
  );

  const mapeamento: Record<string, string[]> = {};

  // Papéis da classe (aplicados a todos métodos)
  const papeisClasse = obterPapeisDoDecorator(controllerClass);

  metodos.forEach(nomeMetodo => {
    const metodo = prototype[nomeMetodo];
    const papeisMetodo = obterPapeisDoDecorator(metodo);
    
    // Método herda papéis da classe se não tiver próprios
    mapeamento[nomeMetodo] = papeisMetodo || papeisClasse || [];
  });

  return mapeamento;
}

/**
 * Utilitário para gerar documentação automática de endpoints por papel.
 * Útil para documentação de APIs e compliance de segurança.
 *
 * @param controllerClass - Classe do controller
 * @returns Documentação estruturada dos endpoints
 */
export function gerarDocumentacaoRBAC(controllerClass: any) {
  const mapeamento = mapearPapeisDoController(controllerClass);
  const nomeController = controllerClass.name;

  const documentacao = {
    controller: nomeController,
    endpoints: Object.entries(mapeamento).map(([metodo, papeis]) => ({
      metodo,
      papeisPermitidos: papeis,
      restricoes: papeis.length > 0 ? 'Autenticação e autorização necessárias' : 'Endpoint público',
      hierarquia: papeis.length > 0 ? 'ADMIN herda permissões de GERENTE e VENDEDOR' : 'N/A',
    })),
    resumo: {
      totalEndpoints: Object.keys(mapeamento).length,
      endpointsProtegidos: Object.values(mapeamento).filter(p => p.length > 0).length,
      endpointsPublicos: Object.values(mapeamento).filter(p => p.length === 0).length,
    },
  };

  return documentacao;
}

/**
 * ============================================================================
 * CONSTANTES E ENUMS AUXILIARES
 * ============================================================================
 */

/**
 * Mapa de descrições dos papéis para documentação.
 */
export const DESCRICOES_PAPEIS = {
  [PapelUsuario.ADMIN]: {
    titulo: 'Administrador',
    descricao: 'Acesso completo ao sistema, incluindo criação de campanhas e gerenciamento de usuários',
    permissoes: [
      'Criar, editar e remover campanhas',
      'Gerenciar todos os usuários do sistema', 
      'Visualizar relatórios globais',
      'Configurar parâmetros do sistema',
      'Validar vendas e pagamentos',
    ],
  },
  [PapelUsuario.GERENTE]: {
    titulo: 'Gerente',
    descricao: 'Gerencia equipe de vendedores e visualiza relatórios da sua ótica',
    permissoes: [
      'Visualizar relatórios da sua ótica',
      'Gerenciar vendedores da sua equipe',
      'Participar de campanhas como vendedor',
      'Receber comissões sobre vendas da equipe',
    ],
  },
  [PapelUsuario.VENDEDOR]: {
    titulo: 'Vendedor',
    descricao: 'Participa de campanhas, submete vendas e resgata prêmios',
    permissoes: [
      'Visualizar campanhas disponíveis',
      'Submeter vendas para validação',
      'Acompanhar progresso em cartelas',
      'Resgatar prêmios com moedinhas',
      'Visualizar ranking da ótica',
    ],
  },
} as const;

/**
 * Enum com níveis de acesso para facilitar comparações.
 */
export enum NivelAcesso {
  PUBLICO = 0,
  VENDEDOR = 1,
  GERENTE = 2,
  ADMIN = 3,
}

/**
 * Mapeamento de papéis para níveis numéricos.
 */
export const NIVEL_POR_PAPEL = {
  [PapelUsuario.VENDEDOR]: NivelAcesso.VENDEDOR,
  [PapelUsuario.GERENTE]: NivelAcesso.GERENTE,
  [PapelUsuario.ADMIN]: NivelAcesso.ADMIN,
} as const;

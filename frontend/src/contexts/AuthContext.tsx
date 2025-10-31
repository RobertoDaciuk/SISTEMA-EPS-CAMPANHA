import { createContext, useContext } from "react";
import { LoginDto } from "../modulos/autenticacao/dto/login.dto";

/**
 * Interface do Usuário Autenticado (Versão Estendida)
 * 
 * Dados completos do usuário logado, incluindo configurações de UI.
 */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: 'ADMIN' | 'GERENTE' | 'VENDEDOR';
  avatarUrl?: string;
  // Adicione outros campos do perfil se necessário (ex: status, nivel)

  /**
   * Configurações dinâmicas para a UI, baseadas nas permissões do usuário.
   */
  configuracao: {
    ranking: {
      visivel: boolean;
    };
  };
}

/**
 * Interface do Contexto de Autenticação
 * 
 * Define todos os estados e métodos disponíveis
 * para gerenciar a autenticação do usuário
 */
export interface AuthContextData {
  /**
   * Dados do usuário autenticado
   * null quando não autenticado
   */
  usuario: Usuario | null;

  /**
   * Indica se o usuário está autenticado
   * Atalho para !!usuario
   */
  estaAutenticado: boolean;

  /**
   * Estado de carregamento inicial
   * true durante a verificação da sessão via cookie
   * false após a validação (sucesso ou falha)
   * 
   * Use este estado para:
   * - Mostrar skeleton/spinner durante carregamento inicial
   * - Evitar redirecionamentos prematuros
   * - Aguardar confirmação de autenticação antes de renderizar conteúdo protegido
   */
  isLoading: boolean;

  /**
   * Realiza o login do usuário
   * 
   * @param credentials - Objeto com email e senha do usuário
   */
  login: (credentials: LoginDto) => Promise<void>;

  /**
   * Realiza o logout do usuário
   * Remove o cookie de sessão via API e redireciona para login
   */
  logout: () => void;
}

/**
 * Contexto de Autenticação
 * 
 * Provê estados e métodos para gerenciar
 * a autenticação em toda a aplicação
 */
export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

/**
 * Hook customizado para acessar o contexto de autenticação
 * 
 * @returns Dados e métodos do contexto de autenticação
 * @throws Error se usado fora do AuthProvider
 * 
 * @example
 * ```tsx
 * const { usuario, login, logout, isLoading } = useAuth();
 * 
 * if (isLoading) {
 *   return <LoadingSpinner />;
 * }
 * 
 * if (!estaAutenticado) {
 *   router.push('/login');
 * }
 * ```
 */
export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }

  return context;
}
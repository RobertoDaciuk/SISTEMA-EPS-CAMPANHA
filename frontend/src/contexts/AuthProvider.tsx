/**
 * ============================================================================
 * AUTH PROVIDER - Implementação do Contexto de Autenticação (Cookie-based)
 * ============================================================================
 * 
 * Descrição:
 * Refatorado para usar cookies httpOnly, aumentando a segurança contra XSS.
 * 
 * Lógica de Funcionamento:
 * - Login: Chama a API de login, que retorna o usuário no corpo e o token
 *   em um cookie httpOnly. O provider apenas armazena os dados do usuário.
 * - Logout: Chama uma nova API de logout que limpa o cookie no backend.
 * - Persistência de Sessão: Na inicialização, tenta buscar o perfil do usuário.
 *   Se a chamada for bem-sucedida (o navegador enviou o cookie válido),
 *   a sessão é restaurada. Se falhar (401), o usuário é considerado deslogado.
 * - Proteção de Rota: A lógica de redirecionamento permanece, mas agora é
 *   baseada na presença do objeto `usuario` em vez de um token no estado.
 * 
 * @module AuthProvider
 * ============================================================================
 **/

"use client";

import { ReactNode, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthContext, Usuario } from "./AuthContext";
import { LoginDto } from "../modulos/autenticacao/dto/login.dto";
import api from "@/lib/axios";
import toast from "react-hot-toast";

interface AuthProviderProps {
  children: ReactNode;
}

const PUBLIC_ROUTES = ["/login", "/registro", "/esqueci-senha"];

/**
 * Combina os dados do perfil com as configurações da UI.
 * @param perfilData Dados de /perfil/meu
 * @param configData Dados de /perfil/minha-configuracao
 * @returns Objeto de usuário completo
 */
const mergeUserData = (perfilData: any, configData: any): Usuario => {
  return {
    ...perfilData,
    configuracao: configData || { ranking: { visivel: false } },
  };
};

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Busca todos os dados do usuário em paralelo e os mescla.
   */
  const fetchAndSetUser = useCallback(async () => {
    try {
      const [perfilRes, configRes] = await Promise.all([
        api.get("/perfil/meu"),
        api.get("/perfil/minha-configuracao"),
      ]);

      const usuarioCompleto = mergeUserData(perfilRes.data, configRes.data);
      setUsuario(usuarioCompleto);
      return true;
    } catch (error) {
      setUsuario(null);
      return false;
    }
  }, []);

  /**
   * Realiza o login do usuário.
   */
  const login = useCallback(
    async (credentials: LoginDto) => {
      try {
        // Primeiro, faz o login para obter o cookie de sessão
        await api.post("/autenticacao/login", credentials);
        // Em seguida, busca os dados completos do usuário
        const success = await fetchAndSetUser();
        if (success) {
          router.push("/");
        } else {
          throw new Error("Não foi possível buscar os dados do usuário após o login.");
        }
      } catch (error) {
        console.error("Erro no login:", error);
        setUsuario(null);
        throw error; // Re-lança o erro para o componente de UI tratar
      }
    },
    [router, fetchAndSetUser]
  );

  /**
   * Realiza o logout do usuário.
   */
  const logout = useCallback(async () => {
    try {
      await api.post("/autenticacao/logout");
    } catch (error) {
      console.error("Erro ao chamar API de logout, limpando localmente de qualquer maneira.", error);
    } finally {
      setUsuario(null);
      router.push("/login");
      toast.success("Logout realizado com sucesso!");
    }
  }, [router]);

  /**
   * Efeito para verificar a sessão na inicialização da aplicação.
   */
  useEffect(() => {
    const verifySession = async () => {
      setIsLoading(true);
      await fetchAndSetUser();
      setIsLoading(false);
    };
    verifySession();
  }, [fetchAndSetUser]);

  /**
   * Efeito para proteção de rotas.
   */
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

    if (!usuario && !isPublicRoute) {
      router.push("/login");
    }

    if (usuario && pathname === "/login") {
      router.push("/");
    }
  }, [usuario, pathname, isLoading, router]);

  const value = {
    usuario,
    estaAutenticado: !!usuario,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

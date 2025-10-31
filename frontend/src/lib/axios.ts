import axios from "axios";

/**
 * Instância do Axios pré-configurada para a API
 * 
 * Configurações:
 * - baseURL: URL base da API (configurada via variável de ambiente)
 * - timeout: Tempo máximo de espera por resposta (30 segundos)
 * - headers: Headers padrão para todas as requisições
 * - withCredentials: Permite envio de cookies (se necessário)
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  timeout: 30000, // 30 segundos
  headers: {
    "Content-Type": "application/json",
  },
  // Habilite se for usar cookies para autenticação
  // withCredentials: true,
});

// ==========================================
// INTERCEPTORS DE REQUISIÇÃO
// ==========================================

/**
 * Interceptor para adicionar token de autenticação
 * automaticamente em todas as requisições
 */
api.interceptors.request.use(
  (config) => {
    // Pega o token do localStorage (será implementado na autenticação)
    const token = typeof window !== "undefined" 
      ? localStorage.getItem("auth_token") 
      : null;

    // Adiciona o token no header Authorization se existir
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==========================================
// INTERCEPTORS DE RESPOSTA
// ==========================================

/**
 * Interceptor para tratar erros de forma centralizada
 */
api.interceptors.response.use(
  (response) => {
    // Retorna a resposta normalmente se não houver erro
    return response;
  },
  (error) => {
    // ==========================================
    // IGNORAR ERROS DE CANCELAMENTO
    // ==========================================
    /**
     * Quando um componente desmonta e cancela requisições pendentes
     * via AbortController, o Axios lança um erro "canceled".
     *
     * Este é um comportamento esperado e não deve ser logado como erro.
     */
    if (axios.isCancel(error) || error.message === "canceled" || error.code === "ERR_CANCELED") {
      // Ignora silenciosamente erros de cancelamento
      return Promise.reject(error);
    }

    // ==========================================
    // TRATAMENTO DE ERROS REAIS
    // ==========================================
    if (error.response) {
      // Erro com resposta do servidor
      switch (error.response.status) {
        case 401:
          // Token inválido ou expirado - redirecionar para login
          if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            // window.location.href = "/login"; // Implementar depois
          }
          break;
        case 403:
          console.error("Acesso negado:", error.response.data);
          break;
        case 404:
          console.error("Recurso não encontrado:", error.response.data);
          break;
        case 500:
          console.error("Erro interno do servidor:", error.response.data);
          break;
        default:
          console.error("Erro na API:", error.response.data);
      }
    } else if (error.request) {
      // Requisição foi feita mas não houve resposta
      console.error("Erro de rede - sem resposta do servidor:", error.request);
    } else {
      // Erro ao configurar a requisição
      console.error("Erro ao configurar requisição:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
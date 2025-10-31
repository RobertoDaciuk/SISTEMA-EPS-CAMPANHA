"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import Link from "next/link";

/**
 * Página de Login - Design Premium com Funcionalidade Completa
 * 
 * Características:
 * - Validação de formulário customizada
 * - Integração com API de autenticação
 * - Estados de loading
 * - Feedback visual (toasts)
 * - Tratamento de erros
 * - Redirecionamento automático
 */
export default function LoginPage() {
  // ========================================
  // HOOKS E CONTEXTO
  // ========================================

  const { login } = useAuth();

  // ========================================
  // ESTADOS DO FORMULÁRIO
  // ========================================

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ========================================
  // VALIDAÇÃO DO FORMULÁRIO
  // ========================================

  const validateForm = (): boolean => {
    // Validação de Email
    if (!email.trim()) {
      toast.error("Por favor, informe seu email");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Por favor, informe um email válido");
      return false;
    }

    // Validação de Senha
    if (!password) {
      toast.error("Por favor, informe sua senha");
      return false;
    }

    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return false;
    }

    return true;
  };

  // ========================================
  // HANDLER: SUBMIT DO FORMULÁRIO
  // ========================================

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Chama o método de login do contexto diretamente com as credenciais
      await login({
        email: email.trim(),
        senha: password,
      });

      // O AuthProvider agora gerencia o sucesso, o estado e o redirecionamento
      toast.success("Login realizado com sucesso!");

    } catch (error: any) {
      console.error("Erro no login:", error);

      let errorMessage = "Erro ao realizar login. Tente novamente.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (error.response?.status === 401) {
        errorMessage = "Email ou senha incorretos";
      } else if (error.response?.status === 429) {
        errorMessage = "Muitas tentativas. Tente novamente mais tarde.";
      } else if (!error.response) {
        errorMessage = "Erro de conexão. Verifique sua internet";
      }

      toast.error(errorMessage);
      setPassword("");

    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="relative w-full">
      {/* ========================================
          TOGGLE DE TEMA
          ======================================== */}
      <motion.div
        className="absolute -top-16 right-0 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <ThemeToggle />
      </motion.div>

      {/* ========================================
          CARD PRINCIPAL
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <div className="glass rounded-3xl p-6 md:p-9 shadow-glass-lg border border-border/40 backdrop-blur-2xl relative overflow-hidden">
          {/* Gradiente Sutil de Fundo */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-light/5 opacity-50" />
          
          {/* Orbe de Brilho Animado */}
          <motion.div
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <div className="relative z-10 space-y-6">
            {/* ========================================
                LOGO E TÍTULO
                ======================================== */}
            <div className="text-center space-y-3">
              <motion.div
                className="inline-flex items-center justify-center mb-1"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <h1 className="text-3xl md:text-4xl font-bold whitespace-nowrap text-gradient">
                  EPS Campanhas
                </h1>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="space-y-1.5"
              >
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                  Bem-vindo de volta
                </h2>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Entre com suas credenciais para continuar
                </p>
              </motion.div>
            </div>

            {/* ========================================
                FORMULÁRIO - SEM VALIDAÇÃO HTML5
                ======================================== */}
            <form 
              className="space-y-4" 
              onSubmit={handleSubmit}
              noValidate
            >
              {/* Campo Email */}
              <motion.div
                className="space-y-1.5"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-foreground"
                >
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-all duration-300">
                    <Mail className="w-4 h-4" />
                  </div>
                  
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    disabled={isLoading}
                    autoComplete="email"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-border bg-background/50 
                             text-sm text-foreground placeholder:text-muted-foreground
                             focus:outline-none focus:border-primary focus:bg-background 
                             focus:shadow-lg focus:shadow-primary/10
                             transition-all duration-300
                             hover:border-primary/50 hover:bg-background/80
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </motion.div>

              {/* Campo Senha */}
              <motion.div
                className="space-y-1.5"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-foreground"
                >
                  Senha
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-all duration-300">
                    <Lock className="w-4 h-4" />
                  </div>
                  
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border-2 border-border bg-background/50 
                             text-sm text-foreground placeholder:text-muted-foreground
                             focus:outline-none focus:border-primary focus:bg-background 
                             focus:shadow-lg focus:shadow-primary/10
                             transition-all duration-300
                             hover:border-primary/50 hover:bg-background/80
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1 rounded-lg hover:bg-accent disabled:opacity-50"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Link "Esqueci minha senha" */}
                <div className="flex justify-end pt-0.5">
                  <Link
                    href="/esqueci-senha"
                    className="text-xs text-primary hover:underline transition-all inline-flex items-center gap-1 group"
                    tabIndex={isLoading ? -1 : 0}
                  >
                    Esqueci minha senha
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </motion.div>

              {/* Lembrar-me */}
              <motion.div
                className="flex items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="w-3.5 h-3.5 rounded border-2 border-border text-primary 
                           focus:ring-2 focus:ring-primary/20 focus:ring-offset-0
                           transition-all cursor-pointer
                           disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label
                  htmlFor="remember"
                  className="ml-2.5 text-xs text-foreground/80 cursor-pointer select-none"
                >
                  Manter-me conectado
                </label>
              </motion.div>

              {/* Botão de Entrada */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className="group relative w-full py-3 rounded-xl font-semibold text-sm
                         bg-gradient-to-r from-primary via-primary-light to-primary 
                         text-primary-foreground shadow-lg shadow-primary/25
                         overflow-hidden transition-all duration-500
                         hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02]
                         active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
              >
                <span className="relative z-10 flex items-center justify-center space-x-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar na plataforma</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </span>
                
                {/* Efeito de Brilho */}
                {!isLoading && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                    animate={{
                      x: ["-200%", "200%"],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                )}
              </motion.button>
            </form>

            {/* ========================================
                LINK DE CADASTRO
                ======================================== */}
            <motion.div
              className="pt-4 border-t border-border/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <div className="text-center text-xs">
                <span className="text-muted-foreground whitespace-nowrap">
                  Ainda não tem uma conta?{" "}
                  <Link
                    href="/registro"
                    className="text-primary font-semibold hover:underline transition-all inline-flex items-center gap-1 group"
                    tabIndex={isLoading ? -1 : 0}
                  >
                    Cadastre-se aqui
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        className="text-center mt-6 text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        © 2025 EPS Campanhas. Todos os direitos reservados.
      </motion.div>
    </div>
  );
}
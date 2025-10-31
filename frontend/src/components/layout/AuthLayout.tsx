import React from "react";

/**
 * Layout para páginas de autenticação
 * 
 * Características:
 * - Centralização vertical e horizontal perfeita
 * - Fundo gradiente sutil com orbes animados
 * - Sem scroll, altura total da viewport
 * - Responsivo com padding adequado
 * 
 * @param children - Conteúdo da página (formulários de auth)
 */
interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4 md:p-8">
      {/* ========================================
          ORBES DE FUNDO ANIMADOS
          Criam profundidade e movimento sutil
          ======================================== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Orbe Superior Esquerdo */}
        <div 
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/20 rounded-full blur-3xl animate-pulse" 
        />
        
        {/* Orbe Inferior Direito */}
        <div 
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-primary-light/10 rounded-full blur-3xl animate-pulse" 
          style={{ 
            animationDelay: '1s', 
            animationDuration: '3s' 
          }} 
        />
      </div>

      {/* ========================================
          CONTAINER DO CONTEÚDO
          Centralizado e com largura máxima
          ======================================== */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
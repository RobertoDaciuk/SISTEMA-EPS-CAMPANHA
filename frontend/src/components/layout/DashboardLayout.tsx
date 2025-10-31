"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

/**
 * DashboardLayout - Layout principal da aplicação
 * 
 * Integra:
 * - Sidebar (navegação lateral)
 * - Header (barra superior)
 * - Main (área de conteúdo)
 * 
 * Gerencia o estado de abertura da sidebar no mobile.
 * 
 * @param children - Conteúdo da página
 */
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ========================================
          SIDEBAR - Navegação Lateral
          ======================================== */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* ========================================
          ÁREA PRINCIPAL - Header + Conteúdo
          ======================================== */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header Fixo */}
        <Header setSidebarOpen={setIsSidebarOpen} />

        {/* Área de Conteúdo com Scroll */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {/* Container com largura máxima para conteúdo */}
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
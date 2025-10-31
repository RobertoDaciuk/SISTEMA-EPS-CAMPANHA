"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Menu, Sun, Moon, Bell, User } from "lucide-react";

/**
 * Header - Barra superior fixa
 * 
 * Funcionalidades:
 * - Botão de menu (mobile)
 * - Toggle de tema (light/dark)
 * - Notificações
 * - Menu de usuário
 * 
 * @param setSidebarOpen - Função para abrir a sidebar mobile
 */
interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita hidratação incorreta
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-background/80 backdrop-blur-lg border-b border-border px-6">
      <div className="h-full flex items-center justify-between">
        {/* ========================================
            LADO ESQUERDO - Botão Menu (Mobile)
            ======================================== */}
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Título da Página (opcional) */}
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
        </div>

        {/* ========================================
            LADO DIREITO - Controles
            ======================================== */}
        <div className="flex items-center space-x-2">
          {/* Botão de Tema */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Alternar tema"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Botão de Notificações */}
          <button
            className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" />
            {/* Badge de notificações não lidas */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>

          {/* Botão de Perfil */}
          <button
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Perfil do usuário"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
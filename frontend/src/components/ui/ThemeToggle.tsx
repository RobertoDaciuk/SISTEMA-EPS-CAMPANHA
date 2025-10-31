"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

/**
 * Toggle de Tema Estilo Apple
 * 
 * Switch animado com indicador visual claro/escuro
 * Design minimalista e intuitivo
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-[140px] h-12 rounded-full bg-muted/50 animate-pulse" />
    );
  }

  const isDark = theme === "dark";

  return (
    <div className="flex items-center">
      {/* Switch Container */}
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="relative w-[140px] h-12 rounded-full glass border border-border/50 hover:border-primary/50 transition-all p-1.5 group"
        aria-label={`Mudar para tema ${isDark ? "claro" : "escuro"}`}
      >
        {/* Background do Switch */}
        <div className="absolute inset-1.5 rounded-full bg-gradient-to-r from-muted/50 to-muted/30" />

        {/* Indicadores de Ícones Fixos - Com contraste correto */}
        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
          {/* Ícone Sol (Esquerda) - Escuro em light mode, claro em dark mode */}
          <Sun
            className={`w-5 h-5 transition-all duration-300 ${
              !isDark 
                ? "text-foreground scale-110" 
                : "text-muted-foreground/30 scale-90"
            }`}
          />
          {/* Ícone Lua (Direita) - Escuro em dark mode, claro em light mode */}
          <Moon
            className={`w-5 h-5 transition-all duration-300 ${
              isDark 
                ? "text-foreground scale-110" 
                : "text-muted-foreground/30 scale-90"
            }`}
          />
        </div>

        {/* Slider Animado */}
        <motion.div
          layout
          className="relative w-[60px] h-full rounded-full bg-gradient-to-br from-primary via-primary-light to-primary shadow-lg shadow-primary/30 z-10"
          animate={{
            x: isDark ? 70 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        >
          {/* Brilho Interno */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          
          {/* Ícone no Slider - ROTAÇÃO 360° */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: isDark ? 360 : 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              {isDark ? (
                <Moon className="w-5 h-5 text-white" />
              ) : (
                <Sun className="w-5 h-5 text-white" />
              )}
            </motion.div>
          </div>
        </motion.div>
      </button>
    </div>
  );
}
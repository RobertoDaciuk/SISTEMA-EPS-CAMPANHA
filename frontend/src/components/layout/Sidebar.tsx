"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_MENU_ITEMS, PapelUsuario } from "@/config/menuItems";

/**
 * Sidebar - Barra lateral de navegação dinâmica e responsiva
 * 
 * Renderiza itens de menu com base no papel (role) do usuário autenticado.
 * 
 * @param isOpen - Estado de abertura (mobile)
 * @param setIsOpen - Função para controlar abertura
 */
interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const { logout, usuario } = useAuth(); // Pegamos o usuário do nosso hook

  // Filtra os menus com base no papel e configurações do usuário, usando useMemo para otimização
  const [mainNavItems, footerNavItems] = useMemo(() => {
    if (!usuario?.papel) {
      return [[], []]; // Retorna vazio se não houver usuário ou papel
    }

    const userRole = usuario.papel as PapelUsuario;

    const accessibleItems = ALL_MENU_ITEMS.filter((item) => {
      // 1. O papel do usuário deve estar na lista de papéis permitidos do item
      const hasRoleAccess = item.roles.includes(userRole);
      if (!hasRoleAccess) return false;

      // 2. Regra específica para o Ranking do Vendedor
      if (
        item.href === "/ranking" &&
        userRole === PapelUsuario.VENDEDOR &&
        !usuario.configuracao?.ranking?.visivel
      ) {
        return false; // Esconde o menu de ranking se a config estiver desabilitada
      }

      return true; // Se passou em todas as checagens, o item é acessível
    });
    
    const mainItems = accessibleItems.filter(item => item.position === 'main');
    const footerItems = accessibleItems.filter(item => item.position === 'footer');

    return [mainItems, footerItems];
  }, [usuario]); // Depende do objeto de usuário inteiro agora


  // Verifica se o link está ativo
  const isLinkActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  // Handler do logout
  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  // Componente reutilizável para a lista de links
  const NavLinkList = ({ onClick }: { onClick?: () => void }) => (
    <>
      {mainNavItems.map((link) => {
        const Icon = link.icon;
        const active = isLinkActive(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClick}
            className={`
              flex items-center space-x-3 px-4 py-3 rounded-xl
              transition-all duration-200 group
              ${
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              }
            `}
          >
            <Icon
              className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                active ? "text-primary-foreground" : ""
              }`}
            />
            <span className="font-medium">{link.label}</span>
          </Link>
        );
      })}
    </>
  );

  // Componente reutilizável para os links do rodapé
  const FooterLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {footerNavItems.map((link) => {
        const Icon = link.icon;
        const active = isLinkActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClick}
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200 group ${active ? "bg-accent" : ""}`}
          >
            <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span className="font-medium">{link.label}</span>
          </Link>
        )
      })}
      <button
        onClick={handleLogout}
        className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 group"
      >
        <LogOut className="w-5 h-5 transition-transform group-hover:scale-110" />
        <span className="font-medium">Sair</span>
      </button>
    </>
  );


  return (
    <>
      {/* Overlay Mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Desktop */}
      <aside className="hidden md:block sticky top-0 h-screen w-64 bg-card border-r border-border">
        <div className="flex flex-col h-full p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gradient">EPS</h2>
            <p className="text-xs text-muted-foreground mt-1">Campanhas</p>
          </div>
          <nav className="flex-1 space-y-2">
            <NavLinkList />
          </nav>
          <div className="pt-4 border-t border-border space-y-2">
            <FooterLinks />
          </div>
        </div>
      </aside>

      {/* Sidebar Mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border md:hidden"
          >
            <div className="flex flex-col h-full p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gradient">EPS</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Campanhas
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-2">
                <NavLinkList onClick={() => setIsOpen(false)} />
              </nav>
              <div className="pt-4 border-t border-border space-y-2">
                <FooterLinks onClick={() => setIsOpen(false)} />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/axios";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

// Componentes de KPIs
import KpisVendedor from "@/components/dashboard/KpisVendedor";
import KpisGerente from "@/components/dashboard/KpisGerente";
import KpisAdmin from "@/components/dashboard/KpisAdmin";

/**
 * Componente de Skeleton Loader para KPIs - COMPACTO
 */
function SkeletonKpiCard() {
  return (
    <div className="glass rounded-xl p-4 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-lg bg-muted/50 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-muted/50" />
          <div className="h-6 w-20 rounded bg-muted/50" />
          <div className="h-2 w-16 rounded bg-muted/50" />
        </div>
      </div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-6 w-40 rounded bg-muted/50 animate-pulse" />
        <div className="h-3 w-56 rounded bg-muted/50 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonKpiCard />
        <SkeletonKpiCard />
        <SkeletonKpiCard />
        <SkeletonKpiCard />
      </div>

      <div className="glass rounded-xl p-6 animate-pulse">
        <div className="h-5 w-32 rounded bg-muted/50 mb-3" />
        <div className="h-20 rounded-lg bg-muted/30" />
      </div>
    </div>
  );
}

/**
 * Página Principal do Dashboard
 * 
 * Características:
 * - Proteção de rota (redireciona se não autenticado)
 * - Busca KPIs da API baseado no papel do usuário
 * - Conteúdo dinâmico com dados reais
 * - Loading states (skeleton) durante carregamento
 * - Design premium com glassmorphism
 */
export default function DashboardPage() {
  const router = useRouter();
  const { usuario, estaAutenticado, isLoading } = useAuth();

  // Estados para KPIs
  const [kpis, setKpis] = useState<any>(null);
  const [isKpiLoading, setIsKpiLoading] = useState(true);

  // ========================================
  // PROTEÇÃO DE ROTA
  // ========================================

  useEffect(() => {
    // Aguarda carregamento inicial
    if (isLoading) return;

    // Redireciona se não autenticado
    if (!estaAutenticado) {
      router.push("/login");
    }
  }, [isLoading, estaAutenticado, router]);

  // ========================================
  // BUSCAR KPIs DA API
  // ========================================

  useEffect(() => {
    const fetchKpis = async () => {
      // Só busca se usuário estiver carregado e autenticado
      if (!usuario || !estaAutenticado) return;

      setIsKpiLoading(true);

      try {
        let endpoint = "";

        // Define endpoint baseado no papel
        if (usuario.papel === "VENDEDOR") {
          endpoint = "/dashboard/vendedor";
        } else if (usuario.papel === "GERENTE") {
          endpoint = "/dashboard/gerente";
        } else if (usuario.papel === "ADMIN") {
          endpoint = "/dashboard/admin";
        } else {
          // Papel desconhecido - não busca KPIs
          setIsKpiLoading(false);
          return;
        }

        // Busca os KPIs
        const response = await api.get(endpoint);
        setKpis(response.data);
      } catch (error: any) {
        console.error("Erro ao buscar KPIs:", error);

        // Mostra toast de erro
        const errorMessage =
          error.response?.data?.message ||
          "Erro ao carregar os indicadores. Tente novamente.";
        toast.error(errorMessage);

        // Define KPIs como null em caso de erro
        setKpis(null);
      } finally {
        setIsKpiLoading(false);
      }
    };

    // Executa apenas após autenticação confirmada
    if (!isLoading && estaAutenticado && usuario) {
      fetchKpis();
    }
  }, [usuario, estaAutenticado, isLoading]);

  // ========================================
  // LOADING STATE INICIAL
  // ========================================

  if (isLoading || !estaAutenticado) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER DO DASHBOARD
  // ========================================

  return (
    <div className="space-y-6">
      {/* ========================================
          HEADER - SAUDAÇÃO (SEM BADGE)
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold">
          Olá, <span className="text-gradient">{usuario?.nome}</span>!
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Bem-vindo ao painel de controle da EPS Campanhas
        </p>
      </motion.div>

      {/* ========================================
          KPIS - CONDICIONAL POR PAPEL
          ======================================== */}

      {isKpiLoading ? (
        // Mostra skeleton durante carregamento
        <SkeletonLoader />
      ) : (
        // Renderiza componente apropriado baseado no papel
        <>
          {usuario?.papel === "VENDEDOR" && <KpisVendedor kpis={kpis} />}

          {usuario?.papel === "GERENTE" && <KpisGerente kpis={kpis} />}

          {usuario?.papel === "ADMIN" && <KpisAdmin kpis={kpis} />}

          {/* Papel desconhecido ou sem KPIs */}
          {!["VENDEDOR", "GERENTE", "ADMIN"].includes(usuario?.papel || "") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="glass rounded-xl p-6 text-center"
            >
              <h2 className="text-xl font-semibold mb-2">Dashboard Padrão</h2>
              <p className="text-muted-foreground text-sm">
                Seu papel ({usuario?.papel}) ainda não possui um dashboard
                customizado.
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
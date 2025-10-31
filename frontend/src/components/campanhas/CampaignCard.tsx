"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Tag, CalendarDays, TrendingUp, DollarSign } from "lucide-react";

/**
 * Interface da Campanha
 * Baseada na resposta da API GET /campanhas
 */
export interface Campanha {
  id: string;
  titulo: string;
  descricao: string;
  moedinhasPorCartela: number;
  pontosReaisPorCartela: number;
  dataInicio: string; // ISO date string
  dataFim: string; // ISO date string
  status: string;
}

/**
 * Props do CampaignCard
 */
interface CampaignCardProps {
  campanha: Campanha;
}

/**
 * Badge de Status da Campanha
 */
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string,{ label: string; color: string; bg: string }> = {
    ATIVA: {
      label: "Ativa",
      color: "text-success",
      bg: "bg-success/10 border-success/20",
    },
    CONCLUIDA: {
      label: "Concluída",
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
    },
    EXPIRADA: {
      label: "Expirada",
      color: "text-muted-foreground",
      bg: "bg-muted/10 border-muted/20",
    },
  };

  const config = statusConfig[status] || statusConfig.ATIVA;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.color}`}
    >
      {config.label}
    </span>
  );
}

/**
 * Card de Campanha - Premium com Glassmorphism
 * 
 * Card clicável que exibe as informações principais de uma campanha
 * e redireciona para a página de detalhes ao ser clicado
 * 
 * Características:
 * - Design glassmorphism elegante
 * - Hover effect sutil com elevação
 * - Informações de pontos, valor e datas
 * - Badge de status colorido
 * - Link para página de detalhes
 */
export default function CampaignCard({ campanha }: CampaignCardProps) {
  // Formata data no formato brasileiro
  const formatarData = (dataISO: string): string => {
    const data = new Date(dataISO);
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Formata valor monetário
  const formatarValor = (valor: number): string => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Formata pontos
  const formatarPontos = (pontos: number): string => {
    return pontos.toLocaleString("pt-BR");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <Link
        href={`/campanhas/${campanha.id}`}
        className="block h-full glass rounded-xl p-5 border border-border/50 hover:shadow-glass-lg hover:border-primary/30 transition-all duration-300 group"
      >
        {/* Header - Título e Badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-3">
            <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-1">
              {campanha.titulo}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {campanha.descricao}
            </p>
          </div>
          <StatusBadge status={campanha.status} />
        </div>

        {/* Moedinhas e Pontos */}
        <div className="flex items-center space-x-4 mb-3 pb-3 border-b border-border/30">
          {/* Moedinhas */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Moedinhas EPS</p>
              <p className="text-sm font-bold">
                {formatarPontos(campanha.moedinhasPorCartela)}
              </p>
            </div>
          </div>

          {/* Pontos (R$) */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pontos</p>
              <p className="text-sm font-bold text-success">
                {formatarValor(campanha.pontosReaisPorCartela)}
              </p>
            </div>
          </div>
        </div>

        {/* Período da Campanha */}
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <CalendarDays className="w-4 h-4" />
          <span>
            {formatarData(campanha.dataInicio)} até{" "}
            {formatarData(campanha.dataFim)}
          </span>
        </div>

        {/* Indicador de Link (aparece no hover) */}
        <div className="mt-3 pt-3 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Ver detalhes</span>
            <svg
              className="w-4 h-4 text-primary transform group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
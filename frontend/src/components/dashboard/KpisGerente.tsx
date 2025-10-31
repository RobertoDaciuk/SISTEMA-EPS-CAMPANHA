"use client";

import { motion } from "framer-motion";
import {
  UserCheck,
  DollarSign,
  Users,
  BarChart,
  Trophy,
  TrendingUp,
} from "lucide-react";

/**
 * Interface dos KPIs do Gerente
 */
interface KpisGerenteData {
  melhorVendedor: {
    nome: string;
    pontosTotais: number;
  } | null;
  ganhosPendentesGerencia: number;
  rankingEquipe: Array<{
    vendedorNome: string;
    pontos: number;
    posicao: number;
  }>;
}

/**
 * Props do componente
 */
interface KpisGerenteProps {
  kpis: KpisGerenteData | null;
}

/**
 * KPIs do Gerente - ALINHAMENTO PERFEITO
 */
export default function KpisGerente({ kpis }: KpisGerenteProps) {
  if (!kpis) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <p className="text-muted-foreground text-sm">
          Não foi possível carregar os KPIs
        </p>
      </div>
    );
  }

  // Formata números grandes com pontos
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) {
      return "0";
    }
    return num.toLocaleString("pt-BR");
  };

  // Formata valores monetários
  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null) {
      return "R$ 0,00";
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Determina o ícone de medalha
  const getMedalIcon = (position: number) => {
    if (position === 1) return "🥇";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    return position;
  };

  return (
    <div className="space-y-4">
      {/* Título da Seção */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl font-semibold">Gestão da Equipe</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Monitore o desempenho dos seus vendedores
        </p>
      </motion.div>

      {/* Grid de KPIs Principais - ALINHAMENTO CORRIGIDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card: Melhor Vendedor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, duration: 0.5 }}
          className="glass rounded-xl p-4 border-2 border-primary/30 hover:shadow-glass-lg transition-all duration-300"
        >
          <div className="flex items-center space-x-4">
            {/* Ícone - MAIOR */}
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary-light/20 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-primary" />
            </div>

            {/* Conteúdo - CENTRALIZADO */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="text-xs font-medium text-muted-foreground mb-0.5">
                Melhor Vendedor do Mês
              </h3>
              {kpis.melhorVendedor ? (
                <>
                  <p className="text-xl font-bold truncate leading-tight">
                    {kpis.melhorVendedor.nome}
                  </p>
                  <div className="flex items-center space-x-1 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-sm font-semibold text-success">
                      {formatNumber(kpis.melhorVendedor.pontosTotais)} pts
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum vendedor ativo
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Card: Recompensas Pendentes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="glass rounded-xl p-4 hover:shadow-glass-lg transition-all duration-300"
        >
          <div className="flex items-center space-x-4">
            {/* Ícone - MAIOR */}
            <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-success" />
            </div>

            {/* Conteúdo - CENTRALIZADO */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="text-xs font-medium text-muted-foreground mb-0.5">
                Recompensas Pendentes
              </h3>
              <p className="text-xl font-bold text-success leading-tight">
                {formatCurrency(kpis.ganhosPendentesGerencia)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate leading-tight">
                Aguardando validação
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Card: Ranking da Equipe */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="glass rounded-xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Ranking da Equipe</h3>
              <p className="text-xs text-muted-foreground">
                Top 10 vendedores por pontos
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">
              {kpis.rankingEquipe.length}
            </span>
          </div>
        </div>

        {/* Lista do Ranking */}
        {kpis.rankingEquipe.length > 0 ? (
          <div className="space-y-2">
            {kpis.rankingEquipe.slice(0, 10).map((vendedor, index) => (
              <motion.div
                key={vendedor.vendedorNome}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.03, duration: 0.3 }}
                className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                  index < 3
                    ? "bg-primary/5 border border-primary/20"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-xl font-bold w-8 text-center">
                    {getMedalIcon(vendedor.posicao)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {vendedor.vendedorNome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {vendedor.posicao}º lugar
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-base font-bold text-primary">
                    {formatNumber(vendedor.pontos)}
                  </p>
                  <p className="text-xs text-muted-foreground">pontos</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum vendedor na equipe ainda</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
"use client";

import { motion } from "framer-motion";
import { Target, Trophy, ShoppingBag, Award, TrendingUp } from "lucide-react";

/**
 * Interface dos KPIs do Vendedor
 */
interface KpisVendedorData {
  saldoMoedinhas: number;
  rankingMoedinhas: number;
  nivel: string;
  posicaoRanking: number;
  totalCampanhasAtivas: number;
  pontosProximoNivel?: number; // Opcional: pontos necessários para o próximo nível
}

/**
 * Props do componente
 */
interface KpisVendedorProps {
  kpis: KpisVendedorData | null;
}

/**
 * Componente KPI Card - LAYOUT HORIZONTAL PERFEITAMENTE ALINHADO
 */
interface KpiCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendColor?: string;
  delay?: number;
}

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  trendColor = "text-success",
  delay = 0,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="glass rounded-xl p-4 hover:shadow-glass-lg transition-all duration-300 group"
    >
      <div className="flex items-center space-x-4">
        {/* Ícone - MAIOR E CENTRALIZADO */}
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
          {icon}
        </div>

        {/* Conteúdo - CENTRALIZADO VERTICALMENTE */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-xs font-medium text-muted-foreground truncate">
              {title}
            </h3>
            {trend && (
              <span className={`text-xs font-semibold ${trendColor} ml-2`}>
                {trend}
              </span>
            )}
          </div>
          <p className="text-xl font-bold tracking-tight leading-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate leading-tight">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Card de Nível com Barra de Progresso
 */
interface NivelCardProps {
  nivel: string;
  rankingMoedinhas: number;
  pontosProximoNivel?: number;
  delay: number;
}

function NivelCard({
  nivel,
  rankingMoedinhas,
  pontosProximoNivel,
  delay,
}: NivelCardProps) {
  // Configurações de cor por nível - SINTAXE CORRIGIDA
  const nivelConfig: Record<string, { cor: string; corTexto: string; corBarra: string }> = {
    Bronze: {
      cor: "from-amber-700/20 to-amber-900/20",
      corTexto: "text-amber-700",
      corBarra: "bg-amber-700",
    },
    Prata: {
      cor: "from-gray-400/20 to-gray-600/20",
      corTexto: "text-gray-600",
      corBarra: "bg-gray-600",
    },
    Ouro: {
      cor: "from-yellow-400/20 to-yellow-600/20",
      corTexto: "text-yellow-600",
      corBarra: "bg-yellow-600",
    },
    Platina: {
      cor: "from-cyan-400/20 to-cyan-600/20",
      corTexto: "text-cyan-600",
      corBarra: "bg-cyan-600",
    },
    Diamante: {
      cor: "from-blue-400/20 to-blue-600/20",
      corTexto: "text-blue-600",
      corBarra: "bg-blue-600",
    },
  };

  const config = nivelConfig[nivel] || nivelConfig.Bronze;

  // Calcula progresso
  const progresso = pontosProximoNivel
    ? Math.min((rankingMoedinhas / pontosProximoNivel) * 100, 100)
    : 100;

  const formatNumber = (num: number): string => {
    return num.toLocaleString("pt-BR");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="glass rounded-xl p-4 hover:shadow-glass-lg transition-all duration-300 border-2 border-primary/20"
    >
      <div className="flex items-center space-x-4">
        {/* Ícone com Gradiente do Nível */}
        <div
          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${config.cor} flex items-center justify-center flex-shrink-0 border-2 ${config.corTexto} border-opacity-50`}
        >
          <Award className={`w-6 h-6 ${config.corTexto}`} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground">
                Nível Atual
              </h3>
              <p className={`text-xl font-bold ${config.corTexto}`}>{nivel}</p>
            </div>
            {pontosProximoNivel && progresso < 100 && (
              <span className="text-xs font-semibold text-muted-foreground">
                {progresso.toFixed(0)}%
              </span>
            )}
          </div>

          {/* Barra de Progresso */}
          {pontosProximoNivel && progresso < 100 ? (
            <div className="space-y-1">
              <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progresso}%` }}
                  transition={{ delay: delay + 0.3, duration: 1, ease: "easeOut" }}
                  className={`h-full ${config.corBarra} rounded-full`}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatNumber(rankingMoedinhas)} pts</span>
                <span>{formatNumber(pontosProximoNivel)} pts</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nível máximo atingido!
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * KPIs do Vendedor - ORDEM OTIMIZADA
 */
export default function KpisVendedor({ kpis }: KpisVendedorProps) {
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
  const formatNumber = (num: number): string => {
    return num.toLocaleString("pt-BR");
  };

  // Determina a cor da posição no ranking
  const getRankingColor = (position: number): string => {
    if (position === 1) return "text-yellow-500";
    if (position <= 3) return "text-primary";
    if (position <= 10) return "text-success";
    return "text-muted-foreground";
  };

  // Determina o ícone de medalha
  const getRankingIcon = (position: number) => {
    if (position === 1) return "🥇";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    return `${position}º`;
  };

  return (
    <div className="space-y-4">
      {/* Título da Seção */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl font-semibold">Meu Desempenho</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Acompanhe suas métricas e evolução
        </p>
      </motion.div>

      {/* Grid de KPIs - NOVA ORDEM */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Moedinhas Disponíveis para Resgate */}
        <KpiCard
          icon={<ShoppingBag className="w-6 h-6 text-primary" />}
          title="Moedinhas Disponíveis"
          value={formatNumber(kpis.saldoMoedinhas)}
          subtitle="Troque por prêmios"
          trend="+12%"
          trendColor="text-success"
          delay={0}
        />

        {/* 2. Posição no Ranking */}
        <KpiCard
          icon={
            <Trophy
              className={`w-6 h-6 ${getRankingColor(kpis.posicaoRanking)}`}
            />
          }
          title="Posição no Ranking"
          value={getRankingIcon(kpis.posicaoRanking)}
          subtitle={
            kpis.posicaoRanking <= 3 ? "Parabéns!" : "Continue assim!"
          }
          delay={0.1}
        />

        {/* 3. Campanhas Ativas */}
        <KpiCard
          icon={<Target className="w-6 h-6 text-primary" />}
          title="Campanhas Ativas"
          value={kpis.totalCampanhasAtivas}
          subtitle={
            kpis.totalCampanhasAtivas > 0
              ? "Participe e ganhe pontos"
              : "Nenhuma ativa no momento"
          }
          delay={0.2}
        />

        {/* 4. Nível Atual com Barra de Progresso */}
        <NivelCard
          nivel={kpis.nivel}
          rankingMoedinhas={kpis.rankingMoedinhas}
          pontosProximoNivel={kpis.pontosProximoNivel}
          delay={0.3}
        />
      </div>
    </div>
  );
}
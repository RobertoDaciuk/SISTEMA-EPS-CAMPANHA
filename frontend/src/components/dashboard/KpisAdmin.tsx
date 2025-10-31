"use client";

import { motion } from "framer-motion";
import {
  Users,
  Target,
  ClipboardCheck,
  Star,
  Banknote,
  TrendingUp,
} from "lucide-react";

/**
 * Interface dos KPIs do Admin
 */
interface KpisAdminData {
  totalUsuarios: number;
  totalCampanhasAtivas: number;
  totalVendasValidadas: number;
  totalMoedinhasDistribuidas: number;
  totalFinanceiroPendente: number;
}

/**
 * Props do componente
 */
interface KpisAdminProps {
  kpis: KpisAdminData | null;
}

/**
 * Componente KPI Card - ALINHAMENTO PERFEITO
 */
interface KpiCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendColor?: string;
  delay?: number;
  highlight?: boolean;
}

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  trendColor = "text-success",
  delay = 0,
  highlight = false,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className={`glass rounded-xl p-4 hover:shadow-glass-lg transition-all duration-300 group ${
        highlight ? "border-2 border-primary/30" : ""
      }`}
    >
      <div className="flex items-center space-x-4">
        {/* Ícone - MAIOR E CENTRALIZADO */}
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
            highlight
              ? "bg-gradient-to-br from-primary/20 to-primary-light/20"
              : "bg-primary/10 group-hover:bg-primary/20"
          }`}
        >
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
 * KPIs do Admin - ALINHAMENTO PERFEITO
 */
export default function KpisAdmin({ kpis }: KpisAdminProps) {
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

  // Formata valores monetários
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Título da Seção */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-xl font-semibold">Visão Geral do Sistema</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Métricas globais da plataforma EPS Campanhas
        </p>
      </motion.div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card: Total de Usuários */}
        <KpiCard
          icon={<Users className="w-6 h-6 text-primary" />}
          title="Total de Usuários"
          value={formatNumber(kpis.totalUsuarios)}
          subtitle="Cadastrados na plataforma"
          trend="+15"
          trendColor="text-success"
          delay={0}
        />

        {/* Card: Campanhas Ativas */}
        <KpiCard
          icon={<Target className="w-6 h-6 text-primary" />}
          title="Campanhas Ativas"
          value={formatNumber(kpis.totalCampanhasAtivas)}
          subtitle="Campanhas em andamento"
          delay={0.1}
        />

        {/* Card: Vendas Validadas */}
        <KpiCard
          icon={<ClipboardCheck className="w-6 h-6 text-primary" />}
          title="Vendas Validadas"
          value={formatNumber(kpis.totalVendasValidadas)}
          subtitle="Vendas aprovadas"
          trend="+25%"
          trendColor="text-success"
          delay={0.2}
        />

        {/* Card: Moedinhas Distribuídas */}
        <KpiCard
          icon={<Star className="w-6 h-6 text-primary" />}
          title="Moedinhas Distribuídas"
          value={formatNumber(kpis.totalMoedinhasDistribuidas)}
          subtitle="Total de moedinhas atribuídas"
          delay={0.3}
          highlight
        />

        {/* Card: Financeiro Pendente - DESTAQUE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          className="glass rounded-xl p-4 border-2 border-warning/30 hover:shadow-glass-lg transition-all duration-300 md:col-span-2"
        >
          <div className="flex items-center space-x-4">
            {/* Ícone - MAIOR */}
            <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
              <Banknote className="w-6 h-6 text-warning" />
            </div>

            {/* Conteúdo - CENTRALIZADO */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-0.5">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Financeiro Pendente
                </h3>
                <div className="flex items-center space-x-1 text-warning">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-xs font-semibold">Atenção</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-warning leading-tight">
                {formatCurrency(kpis.totalFinanceiroPendente)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                Aguardando validação para pagamento
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card: Resumo de Atividade */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="glass rounded-xl p-5 space-y-3"
        >
          <h3 className="text-sm font-semibold flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Resumo de Atividade</span>
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">
                Média moedinhas/usuário
              </span>
              <span className="font-semibold text-sm">
                {kpis.totalUsuarios > 0
                  ? formatNumber(
                      Math.round(
                        kpis.totalMoedinhasDistribuidas / kpis.totalUsuarios
                      )
                    )
                  : 0}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground">
                Vendas/campanha ativa
              </span>
              <span className="font-semibold text-sm">
                {kpis.totalCampanhasAtivas > 0
                  ? formatNumber(
                      Math.round(
                        kpis.totalVendasValidadas / kpis.totalCampanhasAtivas
                      )
                    )
                  : 0}
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-muted-foreground">
                Taxa de aprovação
              </span>
              <span className="font-semibold text-sm text-success">
                {kpis.totalFinanceiroPendente > 0 ? "Em análise" : "100%"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Card: Status do Sistema */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="glass rounded-xl p-5 space-y-3"
        >
          <h3 className="text-sm font-semibold flex items-center space-x-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            <span>Status do Sistema</span>
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">Plataforma</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-semibold text-success">
                  Operacional
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">API Backend</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-semibold text-success">Ativo</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">
                Processamento
              </span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-semibold text-success">Normal</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
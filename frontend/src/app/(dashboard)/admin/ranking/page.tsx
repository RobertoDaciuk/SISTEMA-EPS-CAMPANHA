'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Building } from 'lucide-react';
import RankingOticasTab from '@/components/admin/ranking/RankingOticasTab';
import RankingVendedoresTab from '@/components/admin/ranking/RankingVendedoresTab';

// ============================================================================
// Tipos e Configuração das Abas
// ============================================================================
type Tab = 'oticas' | 'vendedores';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  {
    id: 'oticas',
    label: 'Ranking de Óticas',
    icon: Building,
  },
  {
    id: 'vendedores',
    label: 'Ranking de Vendedores',
    icon: BarChart3,
  },
];

// ============================================================================
// Componente Principal da Página
// ============================================================================
export default function AdminRankingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('oticas');

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Rankings</h1>
        <p className="text-muted-foreground mt-1">
          Analise a performance de óticas e vendedores da plataforma.
        </p>
      </motion.div>

      {/* Navegação das Abas */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo das Abas */}
      <div>
        {activeTab === 'oticas' && <RankingOticasTab />}
        {activeTab === 'vendedores' && <RankingVendedoresTab />}
      </div>
    </div>
  );
}

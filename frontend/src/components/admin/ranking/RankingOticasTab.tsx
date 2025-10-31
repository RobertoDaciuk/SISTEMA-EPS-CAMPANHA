'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  AlertTriangle,
  ChevronDown,
  Building,
  Users,
  Star,
} from 'lucide-react';
import { RankingOtica } from '@/types/ranking.d'; // Assumindo que o tipo foi movido

// ============================================================================
// Sub-componente Recursivo para Itens da Lista
// ============================================================================
interface OticaRankingItemProps {
  otica: RankingOtica;
  level: number; // Para indentação
}

const OticaRankingItem = ({ otica, level }: OticaRankingItemProps) => {
  const [isExpanded, setIsExpanded] = useState(level === 0); // Matrizes começam expandidas

  const hasFiliais = otica.filiais && otica.filiais.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0 }}
      className={`rounded-lg ${
        level === 0 ? 'bg-card/60 border border-border/50' : ''
      }`}
    >
      <div
        className={`flex items-center p-3 transition-colors ${
          hasFiliais ? 'cursor-pointer hover:bg-accent/50' : ''
        } ${
          level > 0 ? 'border-t border-border/30' : ''
        }`}
        onClick={() => hasFiliais && setIsExpanded(!isExpanded)}
        style={{ paddingLeft: `${1 + level * 1.5}rem` }}
      >
        {/* Icone e Nome */}
        <div className="flex-1 flex items-center gap-3">
          {hasFiliais && (
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                isExpanded ? 'rotate-0' : '-rotate-90'
              }`}
            />
          )}
          <Building
            className={`h-5 w-5 ${
              otica.ehMatriz ? 'text-primary' : 'text-muted-foreground'
            }`}
          />
          <span className="font-semibold">{otica.nome}</span>
          {otica.ehMatriz && (
            <span className="px-2 py-0.5 text-xs font-bold text-primary bg-primary/10 rounded-full">
              MATRIZ
            </span>
          )}
        </div>

        {/* Contagem de Vendedores */}
        <div className="flex items-center gap-2 mx-6 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{otica.vendedores}</span>
        </div>

        {/* Total de Pontos */}
        <div className="flex items-center gap-2 w-32 font-mono font-bold text-right">
          <Star className="h-4 w-4 text-green-400" />
          <span>
            {otica.totalPontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Filiais (Recursão) */}
      <AnimatePresence>
        {isExpanded && hasFiliais && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 pt-2 pb-1">
              {otica.filiais.map((filial) => (
                <OticaRankingItem key={filial.id} otica={filial} level={level + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// Componente da Aba de Ranking de Óticas
// ============================================================================
export default function RankingOticasTab() {
  const [data, setData] = useState<RankingOtica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/ranking/oticas');
        setData(response.data);
      } catch (err) {
        setError('Falha ao buscar o ranking de óticas.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-red-500 bg-red-500/10 rounded-lg">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Cabeçalho da Lista */}
      <div className="flex items-center p-3 text-xs text-muted-foreground font-semibold uppercase">
          <div className="flex-1">Ótica</div>
          <div className="mx-6">Vendedores</div>
          <div className="w-32 text-right">Pontos (R$)</div>
      </div>

      {/* Lista de Óticas */}
      <div className="space-y-2">
        {data.map((otica) => (
          <OticaRankingItem key={otica.id} otica={otica} level={0} />
        ))}
      </div>
    </motion.div>
  );
}

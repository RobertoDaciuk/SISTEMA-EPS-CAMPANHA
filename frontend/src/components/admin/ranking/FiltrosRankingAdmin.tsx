'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Loader2, ListFilter } from 'lucide-react';

interface OticaSimple {
  id: string;
  nome: string;
}

interface FiltrosRankingAdminProps {
  onFiltroChange: (filtros: { opticaId?: string }) => void;
  isLoading: boolean;
}

export default function FiltrosRankingAdmin({ onFiltroChange, isLoading }: FiltrosRankingAdminProps) {
  const [oticas, setOticas] = useState<OticaSimple[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [opticaSelecionada, setOpticaSelecionada] = useState<string>('all');

  useEffect(() => {
    const fetchOticas = async () => {
      try {
        const response = await api.get('/oticas?simple=true');
        setOticas(response.data);
      } catch (error) {
        console.error("Erro ao buscar lista de óticas", error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchOticas();
  }, []);

  const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setOpticaSelecionada(value);
    onFiltroChange({ opticaId: value === 'all' ? undefined : value });
  };

  return (
    <div className="bg-card/50 backdrop-blur-lg border border-border/50 rounded-xl p-4 flex items-center gap-4">
        <div className='flex items-center gap-2 text-muted-foreground'>
            <ListFilter className="h-5 w-5" />
            <label htmlFor="otica-filter" className="font-semibold">Filtrar por Ótica</label>
        </div>
      
        <select
            id="otica-filter"
            value={opticaSelecionada}
            onChange={handleSelectionChange}
            disabled={isFetching || isLoading}
            className="flex-1 bg-background border border-border/60 rounded-md px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition"
        >
            <option value="all">Todas as Óticas</option>
            {oticas.map(otica => (
                <option key={otica.id} value={otica.id}>{otica.nome}</option>
            ))}
        </select>
        {(isFetching || isLoading) && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
    </div>
  );
}

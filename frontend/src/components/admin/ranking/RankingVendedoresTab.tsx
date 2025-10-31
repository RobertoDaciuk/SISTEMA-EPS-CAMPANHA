'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import api from '@/lib/axios';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle } from 'lucide-react';

import FiltrosRankingAdmin from './FiltrosRankingAdmin';
import PodiumCard, { PodiumUser } from '@/components/ranking/PodiumCard';
import RankingListItem, { RankingUser } from '@/components/ranking/RankingListItem';
import PaginationControls from '@/components/ranking/PaginationControls';

interface RankingResponse {
  dados: RankingUser[];
  paginaAtual: number;
  totalPaginas: number;
  totalRegistros: number;
}

export default function RankingVendedoresTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<RankingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({ 
    opticaId: searchParams.get('opticaId') || undefined 
  });
  const currentPage = Number(searchParams.get('pagina')) || 1;

  const handleFiltroChange = useCallback((newFilters: { opticaId?: string }) => {
    setFilters(newFilters);
    // Reset page to 1 when filters change
    const params = new URLSearchParams(searchParams.toString());
    if (newFilters.opticaId) {
      params.set('opticaId', newFilters.opticaId);
    } else {
      params.delete('opticaId');
    }
    params.set('pagina', '1');
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('pagina', String(currentPage));
      params.append('porPagina', '20');
      if (filters.opticaId) {
        params.append('opticaId', filters.opticaId);
      }

      try {
        const response = await api.get<RankingResponse>(`/ranking`, { params });
        setData(response.data);
      } catch (err) {
        setError('Falha ao buscar o ranking de vendedores.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentPage, filters]);

  const podiumUsers = data?.dados.slice(0, 3) ?? [];
  const listUsers = data?.dados.slice(3) ?? [];

  const renderContent = () => {
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

    if (!data || data.dados.length === 0) {
        return <p className='text-center text-muted-foreground py-8'>Nenhum vendedor encontrado para os filtros selecionados.</p>
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        {/* Pódio (apenas na primeira página) */}
        {currentPage === 1 && podiumUsers.length > 0 && (
          <div className="flex flex-wrap items-end justify-center gap-4 md:gap-8">
            {podiumUsers.find(u => u.posicao === 2) && <PodiumCard user={podiumUsers.find(u => u.posicao === 2)!} metric="pontos" size="md" />}
            {podiumUsers.find(u => u.posicao === 1) && <PodiumCard user={podiumUsers.find(u => u.posicao === 1)!} metric="pontos" size="lg" />}
            {podiumUsers.find(u => u.posicao === 3) && <PodiumCard user={podiumUsers.find(u => u.posicao === 3)!} metric="pontos" size="md" />}
          </div>
        )}

        {/* Lista do restante */}
        {listUsers.length > 0 && (
            <div className="space-y-2">
                {listUsers.map(user => (
                    <RankingListItem key={user.id} user={user} metric="pontos" />
                ))}
            </div>
        )}

        {/* Paginação */}
        {data.totalPaginas > 1 && (
            <PaginationControls 
                paginaAtual={data.paginaAtual}
                totalPaginas={data.totalPaginas}
                baseUrl={pathname} // Usa o pathname atual para manter os filtros
            />
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <FiltrosRankingAdmin onFiltroChange={handleFiltroChange} isLoading={isLoading} />
      {renderContent()}
    </div>
  );
}

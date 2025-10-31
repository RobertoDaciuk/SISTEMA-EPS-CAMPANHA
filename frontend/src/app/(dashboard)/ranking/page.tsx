'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Loader2, AlertTriangle, EyeOff, Trophy, Users, Star } from 'lucide-react';
import { motion } from 'framer-motion';

import PodiumCard, { PodiumUser } from '@/components/ranking/PodiumCard';
import RankingListItem, { RankingUser } from '@/components/ranking/RankingListItem';
import PaginationControls from '@/components/ranking/PaginationControls';

// ============================================================================
// Tipos
// ============================================================================
interface RankingResponse {
  dados: RankingUser[];
  paginaAtual: number;
  totalPaginas: number;
  totalRegistros: number;
  rankingHabilitado: boolean;
}

// ============================================================================
// SUB-COMPONENTE: Switch de Visibilidade para Gerente
// ============================================================================
const VisibilidadeRankingSwitch = ({ otica, onUpdate }: { otica: any, onUpdate: () => void }) => {
    const [isChecked, setIsChecked] = useState(otica.rankingVisivelParaVendedores);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async () => {
        setIsLoading(true);
        try {
            await api.patch('/oticas/minha-otica/ranking-visibilidade', { visivel: !isChecked });
            toast.success(`Visibilidade do ranking para vendedores foi ${!isChecked ? 'HABILITADA' : 'DESABILITADA'}`);
            setIsChecked(!isChecked);
            onUpdate(); // Notifica o componente pai para re-buscar dados se necessário
        } catch (error) {
            toast.error("Erro ao atualizar visibilidade.");
        }
        setIsLoading(false);
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-4 p-4 border border-border/50 rounded-lg bg-card/50 backdrop-blur-lg"
        >
            <div>
                <p className="font-semibold">Visibilidade do Ranking</p>
                <p className="text-xs text-muted-foreground">Permitir que os vendedores da sua ótica vejam o ranking interno (baseado em Moedinhas).</p>
            </div>
            <div className="flex items-center gap-3">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <button onClick={handleToggle} disabled={isLoading} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isChecked ? 'bg-primary' : 'bg-gray-600'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isChecked ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
        </motion.div>
    )
}

// ============================================================================
// COMPONENTE PRINCIPAL: Página de Ranking
// ============================================================================
export default function RankingPage() {
  const { usuario } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [rankingData, setRankingData] = useState<RankingResponse | null>(null);
  const [oticaData, setOticaData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPage = Number(searchParams.get('pagina')) || 1;

  const fetchData = useCallback(async () => {
    if (!usuario) return;

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('pagina', String(currentPage));
      params.append('porPagina', '20');

      const promises = [api.get('/ranking', { params })];
      if (usuario.papel === 'GERENTE') {
        promises.push(api.get('/oticas/minha-otica'));
      }

      const results = await Promise.all(promises);
      const rankingRes = results[0].data as RankingResponse;

      // A rota de vendedor pode retornar `rankingHabilitado: false`
      if (usuario.papel === 'VENDEDOR' && !rankingRes.rankingHabilitado) {
          setError('Ranking desabilitado para sua ótica.'); // Segurança extra
          setRankingData(null);
      } else {
          setRankingData(rankingRes);
      }

      if (results.length > 1) {
        setOticaData(results[1].data);
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erro ao buscar dados do ranking.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }, [usuario, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading State
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-64 text-red-500 bg-red-500/10 rounded-lg">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  // Empty/No Data State
  if (!rankingData || rankingData.dados.length === 0) {
    return (
        <div className="text-center p-8 bg-card/50 rounded-lg border border-border/50">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold">Ranking Vazio</h2>
            <p className="text-muted-foreground">Ainda não há vendedores no ranking da sua ótica.</p>
        </div>
    )
  }

  const metric = usuario?.papel === 'GERENTE' ? 'pontos' : 'moedinhas';
  const podiumUsers = rankingData.dados.slice(0, 3);
  const listUsers = rankingData.dados.slice(3);

  return (
    <div className="container mx-auto p-4 space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3"><Trophy/> Ranking da Equipe</h1>
            <p className="text-muted-foreground mt-1">
                {usuario?.papel === 'GERENTE' 
                    ? 'Performance da sua equipe baseada em Pontos (R$).' 
                    : 'Sua posição e de seus colegas baseada em Moedinhas.'}
            </p>
        </motion.div>

        {/* Controle do Gerente */}
        {usuario?.papel === 'GERENTE' && oticaData && 
            <VisibilidadeRankingSwitch otica={oticaData} onUpdate={fetchData} />
        }

        {/* Pódio (apenas na primeira página) */}
        {currentPage === 1 && podiumUsers.length > 0 && (
          <div className="flex flex-wrap items-end justify-center gap-4 md:gap-8 pt-8">
            {podiumUsers.find(u => u.posicao === 2) && <PodiumCard user={podiumUsers.find(u => u.posicao === 2)!} metric={metric} size="md" />}
            {podiumUsers.find(u => u.posicao === 1) && <PodiumCard user={podiumUsers.find(u => u.posicao === 1)!} metric={metric} size="lg" />}
            {podiumUsers.find(u => u.posicao === 3) && <PodiumCard user={podiumUsers.find(u => u.posicao === 3)!} metric={metric} size="md" />}
          </div>
        )}

        {/* Lista do restante */}
        {listUsers.length > 0 && (
            <div className="space-y-2 pt-8">
                {listUsers.map(user => (
                    <RankingListItem key={user.id} user={user} metric={metric} isCurrentUser={user.id === usuario?.id} />
                ))}
            </div>
        )}

        {/* Paginação */}
        {rankingData.totalPaginas > 1 && (
            <PaginationControls 
                paginaAtual={rankingData.paginaAtual}
                totalPaginas={rankingData.totalPaginas}
                baseUrl={pathname}
            />
        )}
    </div>
  );
}

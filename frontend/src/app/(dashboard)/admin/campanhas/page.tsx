'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Filter, Loader2, AlertCircle, Trophy, PlayCircle, PauseCircle, CheckCircle2 } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import CampaignAdminCard from '@/components/admin/campanhas/CampaignAdminCard';
import CriarCampanhaWizard from '@/components/admin/campanhas/CriarCampanhaWizard';
import AnalyticsModal from '@/components/admin/campanhas/AnalyticsModal';

// --- Tipagem ---
export interface Campanha {
  id: string;
  titulo: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  moedinhasPorCartela: number;
  pontosReaisPorCartela: number;
  status: string;
  percentualGerente: number;
  paraTodasOticas: boolean;
  imagemCampanha?: string | null;
  tags?: string[];
  regras?: string | null;
  criadoEm: string;
  atualizadoEm: string;
  oticasAlvo?: Array<{ id: string; nome: string }>;
  eventosEspeciais?: EventoEspecial[];
  _count?: {
    enviosVenda: number;
    cartelasConcluidas: number;
  };
}

export interface EventoEspecial {
  id: string;
  nome: string;
  descricao?: string | null;
  multiplicador: number;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
  corDestaque: string;
}

// --- Componente de Card de Estatística ---
interface KpiCardProps {
  title: string;
  value: string | number;
  colorClass?: string;
  icon: React.ElementType;
}

const KpiCard = ({ title, value, colorClass, icon: Icon }: KpiCardProps) => (
  <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm font-medium ${colorClass || 'text-muted-foreground'}`}>{title}</p>
        <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
      </div>
      {Icon && <Icon className={`h-8 w-8 ${colorClass || 'text-muted-foreground'}`} />}
    </div>
  </div>
);

// --- Página Principal ---
export default function PaginaAdminCampanhas() {
  const router = useRouter();
  const { usuario, isLoading: isAuthLoading } = useAuth();

  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalCriarOpen, setModalCriarOpen] = useState(false);
  const [campanhaParaEditar, setCampanhaParaEditar] = useState<Campanha | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [modalAnalyticsOpen, setModalAnalyticsOpen] = useState(false);
  const [campanhaParaAnalytics, setCampanhaParaAnalytics] = useState<Campanha | null>(null);

  // Proteção de Rota
  useEffect(() => {
    if (!isAuthLoading && (!usuario || usuario.papel !== 'ADMIN')) {
      router.push('/');
      toast.error('Acesso negado: Apenas administradores');
    }
  }, [isAuthLoading, usuario, router]);

  // Fetch de campanhas
  const fetchCampanhas = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/campanhas');
      setCampanhas(response.data);
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      toast.error('Erro ao carregar campanhas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (usuario?.papel === 'ADMIN') {
      fetchCampanhas();
    }
  }, [usuario, fetchCampanhas]);

  // Handlers
  const handleAbrirModalCriar = () => {
    setCampanhaParaEditar(null);
    setModalCriarOpen(true);
  };

  const handleAbrirModalEditar = (campanha: Campanha) => {
    setCampanhaParaEditar(campanha);
    setModalCriarOpen(true);
  };

  const handleFecharModal = () => {
    setModalCriarOpen(false);
    setCampanhaParaEditar(null);
  };

  const handleSucessoModal = () => {
    handleFecharModal();
    fetchCampanhas();
  };

  const handleDuplicar = async (campanha: Campanha) => {
    try {
      toast.loading('Duplicando campanha...');
      await api.post(`/campanhas/${campanha.id}/duplicar`);
      toast.dismiss();
      toast.success('Campanha duplicada com sucesso!');
      fetchCampanhas();
    } catch (error) {
      toast.dismiss();
      toast.error('Erro ao duplicar campanha');
    }
  };

  const handleAlternarStatus = async (campanha: Campanha) => {
    try {
      const novoStatus = campanha.status === 'ATIVA' ? 'PAUSADA' : 'ATIVA';
      await api.patch(`/campanhas/${campanha.id}`, { status: novoStatus });
      toast.success(`Campanha ${novoStatus === 'ATIVA' ? 'ativada' : 'pausada'} com sucesso!`);
      fetchCampanhas();
    } catch (error) {
      toast.error('Erro ao alterar status da campanha');
    }
  };

  const handleDeletar = async (campanhaId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta campanha? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await api.delete(`/campanhas/${campanhaId}`);
      toast.success('Campanha deletada com sucesso!');
      fetchCampanhas();
    } catch (error) {
      toast.error('Erro ao deletar campanha');
    }
  };

  const handleViewAnalytics = (campanha: Campanha) => {
    setCampanhaParaAnalytics(campanha);
    setModalAnalyticsOpen(true);
  };

  const handleCloseAnalytics = () => {
    setModalAnalyticsOpen(false);
    setCampanhaParaAnalytics(null);
  };

  // Filtros
  const campanhasFiltradas = campanhas.filter((campanha) => {
    const matchStatus = !filtroStatus || campanha.status === filtroStatus;
    const matchTexto = !filtroTexto ||
      campanha.titulo.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      campanha.descricao.toLowerCase().includes(filtroTexto.toLowerCase());
    return matchStatus && matchTexto;
  });

  // KPIs
  const totalCampanhas = campanhas.length;
  const campanhasAtivas = campanhas.filter(c => c.status === 'ATIVA').length;
  const campanhasPausadas = campanhas.filter(c => c.status === 'PAUSADA').length;
  const campanhasConcluidas = campanhas.filter(c => c.status === 'CONCLUIDA').length;

  // Renderização condicional
  if (isAuthLoading || !usuario || usuario.papel !== 'ADMIN') {
    return (
      <div className="p-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Cabeçalho */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Gerenciamento de Campanhas
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Crie, edite e gerencie campanhas de vendas com regras avançadas
          </p>
        </div>
        <button
          onClick={handleAbrirModalCriar}
          className="mt-4 sm:mt-0 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nova Campanha</span>
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total" value={totalCampanhas} icon={Trophy} />
        <KpiCard title="Ativas" value={campanhasAtivas} colorClass="text-green-500" icon={PlayCircle} />
        <KpiCard title="Pausadas" value={campanhasPausadas} colorClass="text-yellow-500" icon={PauseCircle} />
        <KpiCard title="Concluídas" value={campanhasConcluidas} colorClass="text-blue-500" icon={CheckCircle2} />
      </div>

      {/* Filtros */}
      <div className="bg-card rounded-2xl border border-border shadow-sm mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">Filtros</span>
          </div>
          <svg
            className={`h-5 w-5 text-muted-foreground transition-transform ${showFilters ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showFilters && (
          <div className="px-6 pb-6 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Buscar</label>
                <input
                  type="text"
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  placeholder="Título ou descrição..."
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Todos</option>
                  <option value="ATIVA">Ativa</option>
                  <option value="PAUSADA">Pausada</option>
                  <option value="CONCLUIDA">Concluída</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid de Campanhas */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : campanhasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma campanha encontrada</h3>
            <p className="text-muted-foreground mb-6">
              {campanhas.length === 0
                ? 'Comece criando sua primeira campanha.'
                : 'Tente ajustar os filtros.'}
            </p>
            {campanhas.length === 0 && (
              <button
                onClick={handleAbrirModalCriar}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Criar Primeira Campanha
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {campanhasFiltradas.map((campanha) => (
                <motion.div
                  key={campanha.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <CampaignAdminCard
                    campanha={campanha}
                    onEdit={() => handleAbrirModalEditar(campanha)}
                    onDuplicate={() => handleDuplicar(campanha)}
                    onToggleStatus={() => handleAlternarStatus(campanha)}
                    onDelete={() => handleDeletar(campanha.id)}
                    onViewAnalytics={() => handleViewAnalytics(campanha)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal de Criar/Editar */}
      <CriarCampanhaWizard
        isOpen={modalCriarOpen}
        onClose={handleFecharModal}
        onSuccess={handleSucessoModal}
        campanhaParaEditar={campanhaParaEditar}
      />

      {/* Modal de Analytics */}
      {campanhaParaAnalytics && (
        <AnalyticsModal
          isOpen={modalAnalyticsOpen}
          onClose={handleCloseAnalytics}
          campanhaId={campanhaParaAnalytics.id}
          campanhaTitulo={campanhaParaAnalytics.titulo}
        />
      )}
    </div>
  );
}

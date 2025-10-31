'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Trophy,
  DollarSign,
  Users,
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  BarChart3,
  FileText,
  Zap,
  Target,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Campanha } from '@/app/(dashboard)/admin/campanhas/page';

interface CampaignAdminCardProps {
  campanha: Campanha;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  onViewAnalytics: () => void;
}

export default function CampaignAdminCard({
  campanha,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onDelete,
  onViewAnalytics,
}: CampaignAdminCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const dataInicio = new Date(campanha.dataInicio);
  const dataFim = new Date(campanha.dataFim);
  const agora = new Date();

  const isAtiva = campanha.status === 'ATIVA';
  const isPausada = campanha.status === 'PAUSADA';
  const isConcluida = campanha.status === 'CONCLUIDA' || agora > dataFim;
  const isFutura = agora < dataInicio;

  // Cor baseada no status
  const getStatusColor = () => {
    if (isConcluida) return 'bg-blue-500';
    if (isPausada) return 'bg-yellow-500';
    if (isAtiva) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (isConcluida) return 'Concluída';
    if (isPausada) return 'Pausada';
    if (isFutura) return 'Futura';
    if (isAtiva) return 'Ativa';
    return campanha.status;
  };

  // Verificar se tem eventos especiais ativos HOJE
  const eventoAtivoHoje = campanha.eventosEspeciais?.find((evento) => {
    const eventoInicio = new Date(evento.dataInicio);
    const eventoFim = new Date(evento.dataFim);
    return agora >= eventoInicio && agora <= eventoFim && evento.ativo;
  });

  return (
    <div className="relative group">
      {/* Badge de Evento Especial Ativo */}
      {eventoAtivoHoje && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 z-10"
        >
          <div
            className="px-3 py-1 rounded-full text-white font-bold text-xs shadow-lg flex items-center gap-1"
            style={{ backgroundColor: eventoAtivoHoje.corDestaque }}
          >
            <Zap className="h-3 w-3" />
            {eventoAtivoHoje.multiplicador}X ATIVO
          </div>
        </motion.div>
      )}

      <div className="glass rounded-2xl overflow-hidden border border-border hover:border-primary transition-all duration-300 hover:shadow-xl">
        {/* Header com Imagem */}
        <div className="relative h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
          {campanha.imagemCampanha ? (
            <img
              src={campanha.imagemCampanha}
              alt={campanha.titulo}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="h-16 w-16 text-primary opacity-20" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <div className={`${getStatusColor()} text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}>
              {isAtiva ? <Play className="h-3 w-3" /> : isPausada ? <Pause className="h-3 w-3" /> : null}
              {getStatusText()}
            </div>
          </div>

          {/* Menu de Ações */}
          <div className="absolute top-3 right-3">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20"
                onMouseLeave={() => setShowMenu(false)}
              >
                <button
                  onClick={() => {
                    onViewAnalytics();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-accent flex items-center gap-2 transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  Ver Analytics
                </button>
                <button
                  onClick={() => router.push(`/admin/campanhas/${campanha.id}/regras`)}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-accent flex items-center gap-2 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Regras
                </button>
                <button
                  onClick={onEdit}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-accent flex items-center gap-2 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
                <button
                  onClick={onDuplicate}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-accent flex items-center gap-2 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Duplicar
                </button>
                <button
                  onClick={onToggleStatus}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-accent flex items-center gap-2 transition-colors"
                >
                  {isAtiva ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isAtiva ? 'Pausar' : 'Ativar'}
                </button>
                <button
                  onClick={onDelete}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-red-500/10 text-red-500 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Deletar
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-4">
          {/* Título e Descrição */}
          <div>
            <h3 className="text-lg font-bold text-foreground line-clamp-1">{campanha.titulo}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{campanha.descricao}</p>
          </div>

          {/* Tags */}
          {campanha.tags && campanha.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {campanha.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
              {campanha.tags.length > 3 && (
                <span className="px-2 py-1 bg-muted text-muted-foreground rounded-md text-xs font-medium">
                  +{campanha.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Datas */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {dataInicio.toLocaleDateString('pt-BR')} - {dataFim.toLocaleDateString('pt-BR')}
            </span>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-accent/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Trophy className="h-3 w-3" />
                <span>Moedinhas</span>
              </div>
              <p className="text-base font-bold text-foreground">{campanha.moedinhasPorCartela.toLocaleString()}</p>
            </div>
            <div className="bg-accent/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" />
                <span>R$ / Cartela</span>
              </div>
              <p className="text-base font-bold text-foreground">
                R$ {Number(campanha.pontosReaisPorCartela).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Targeting */}
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {campanha.paraTodasOticas ? (
                'Todas as óticas'
              ) : (
                `${campanha.oticasAlvo?.length || 0} ótica(s)`
              )}
            </span>
          </div>

          {/* Estatísticas (se disponível) */}
          {campanha._count && (
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Envios</p>
                <p className="text-lg font-bold text-foreground">{campanha._count.enviosVenda}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Cartelas</p>
                <p className="text-lg font-bold text-foreground">{campanha._count.cartelasConcluidas}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

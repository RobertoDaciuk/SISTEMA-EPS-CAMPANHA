'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { Check, X, Truck } from 'lucide-react';

// Importando os modais
import ConfirmacaoResgateModal from '@/components/premios/ConfirmacaoResgateModal';
import CancelarResgateModal from '@/components/premios/admin/CancelarResgateModal';

// --- Tipagem dos Dados ---
interface ResgateAdmin {
  id: string;
  dataSolicitacao: string;
  status: 'SOLICITADO' | 'ENVIADO' | 'CANCELADO';
  vendedor: {
    nome: string;
  };
  premio: {
    nome: string;
  };
}

const statusTabs = [
  { nome: 'Solicitados', status: 'SOLICITADO' },
  { nome: 'Enviados', status: 'ENVIADO' },
  { nome: 'Cancelados', status: 'CANCELADO' },
];

// --- Componente Principal da Página ---
export default function LogisticaResgatesPage() {
  const [resgates, setResgates] = useState<ResgateAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('SOLICITADO');

  // --- Gerenciamento dos Modais ---
  const [selectedResgate, setSelectedResgate] = useState<ResgateAdmin | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // --- Busca de Dados ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/resgates', { params: { status: activeTab } });
      setResgates(response.data);
    } catch (error) {
      console.error(`Erro ao buscar resgates [${activeTab}]:`, error);
      toast.error('Não foi possível carregar os resgates.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers das Ações ---
  const handleOpenMarcarEnviado = (resgate: ResgateAdmin) => {
    setSelectedResgate(resgate);
    setIsConfirmOpen(true);
  };

  const handleOpenCancelar = (resgate: ResgateAdmin) => {
    setSelectedResgate(resgate);
    setIsCancelOpen(true);
  };

  const handleConfirmarEnvio = async () => {
    if (!selectedResgate) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/resgates/${selectedResgate.id}/marcar-enviado`);
      toast.success('Resgate marcado como enviado!');
      fetchData(); // Re-busca os dados para atualizar a lista
    } catch (error) {
      toast.error('Falha ao marcar como enviado.');
    } finally {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
    }
  };

  const handleConfirmarCancelamento = async (motivo: string) => {
    if (!selectedResgate) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/resgates/${selectedResgate.id}/cancelar`, { motivoCancelamento: motivo });
      toast.success('Resgate cancelado e estornado!');
      fetchData(); // Re-busca os dados
    } catch (error) {
      toast.error('Falha ao cancelar o resgate.');
    } finally {
      setIsSubmitting(false);
      setIsCancelOpen(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      SOLICITADO: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      ENVIADO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      CANCELADO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* ... (cabeçalho e abas - sem alteração) ... */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Logística de Resgates</h1>
          <p className="mt-2 text-lg text-muted-foreground">Processe as solicitações de resgate de prêmios dos vendedores.</p>
        </header>
        <div className="border-b border-border mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {statusTabs.map((tab) => (
              <button
                key={tab.nome}
                onClick={() => setActiveTab(tab.status)}
                className={`${activeTab === tab.status ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                {tab.nome}
              </button>
            ))}
          </nav>
        </div>

        {/* Tabela de Resgates */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border bg-card">
            <thead className="bg-muted/50">{/* ... (cabeçalho da tabela - sem alteração) ... */}</thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8">Carregando...</td></tr>
              ) : resgates.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum resgate encontrado para este status.</td></tr>
              ) : (
                resgates.map((resgate) => (
                  <tr key={resgate.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(resgate.dataSolicitacao).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{resgate.vendedor.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{resgate.premio.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={resgate.status} /></td>
                    {activeTab === 'SOLICITADO' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                        <button onClick={() => handleOpenCancelar(resgate)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" title="Cancelar Resgate">
                          <X className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenMarcarEnviado(resgate)} className="text-green-500 hover:text-green-700 p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50" title="Marcar como Enviado">
                          <Truck className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modais de Ação */}
      {selectedResgate && (
        <>
          <ConfirmacaoResgateModal
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={handleConfirmarEnvio}
            isLoading={isSubmitting}
            title="Marcar como Enviado?"
            message={`Tem certeza que deseja marcar o resgate do prêmio "${selectedResgate.premio.nome}" para "${selectedResgate.vendedor.nome}" como enviado? Esta ação não pode ser desfeita.`}
            confirmButtonText="Sim, marcar como enviado"
          />
          <CancelarResgateModal
            isOpen={isCancelOpen}
            onClose={() => setIsCancelOpen(false)}
            onConfirm={handleConfirmarCancelamento}
            isLoading={isSubmitting}
          />
        </>
      )}
    </>
  );
}
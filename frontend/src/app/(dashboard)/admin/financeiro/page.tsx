'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { DollarSign, CheckCircle, Clock, Download, User, Check } from 'lucide-react';
import { Switch } from '@headlessui/react';
import ConfirmacaoResgateModal from '@/components/premios/ConfirmacaoResgateModal';

// --- Tipagem dos Dados ---
interface Relatorio {
  id: string;
  dataGerado: string;
  valor: number;
  status: 'PENDENTE' | 'PAGO';
  tipo: string;
  usuario: {
    nome: string;
    cpf: string | null;
    optica: { nome: string; cnpj: string; } | null;
  };
  campanha: {
    titulo: string;
  };
}

interface Kpis {
  totalAPagar: number;
  totalPagoUltimos30dias: number;
  pagamentosPendentes: number;
}

// --- Componentes Internos ---
interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
}

const KpiCard = ({ title, value, icon: Icon }: KpiCardProps) => (
  <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
    <div className="bg-primary/10 p-3 rounded-lg">
      <Icon className="w-6 h-6 text-primary" />
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    PENDENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    PAGO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

// --- Funções Utilitárias ---
const formatarCPF = (cpf: string) => (cpf || '').replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const formatarCNPJ = (cnpj: string) => (cnpj || '').replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d)/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');

// --- Componente Principal da Página ---
export default function PaginaFinanceiro() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- Novos Estados de Filtro ---
  const [activeTab, setActiveTab] = useState('PENDENTE');
  const [agrupar, setAgrupar] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [isConfirmIndividualOpen, setIsConfirmIndividualOpen] = useState(false);
  const [isConfirmMassaOpen, setIsConfirmMassaOpen] = useState(false);
  const [relatorioParaAcao, setRelatorioParaAcao] = useState<Relatorio | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setSelecionados(new Set());
    try {
      const params = {
        status: activeTab,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
        agrupar: agrupar,
      };
      const [resRelatorios, resKpis] = await Promise.all([
        api.get('/relatorios-financeiros', { params }),
        api.get('/relatorios-financeiros/kpis'),
      ]);
      setRelatorios(resRelatorios.data);
      setKpis(resKpis.data);
    } catch (error) {
      toast.error('Não foi possível carregar os dados financeiros.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, dataInicio, dataFim, agrupar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelecionados(new Set(relatorios.map(r => r.id)));
    else setSelecionados(new Set());
  };

  const handleSelectRow = (id: string) => {
    const novaSelecao = new Set(selecionados);
    if (novaSelecao.has(id)) novaSelecao.delete(id);
    else novaSelecao.add(id);
    setSelecionados(novaSelecao);
  };

  const handleOpenConfirmIndividual = (relatorio: Relatorio) => {
    setRelatorioParaAcao(relatorio);
    setIsConfirmIndividualOpen(true);
  };

  const handleMarcarComoPagoIndividual = async () => {
    if (!relatorioParaAcao) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/relatorios-financeiros/${relatorioParaAcao.id}/marcar-como-pago`);
      toast.success('Pagamento atualizado com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Falha ao atualizar o pagamento.');
    } finally {
      setIsSubmitting(false);
      setIsConfirmIndividualOpen(false);
    }
  };

  const handleMarcarComoPagoEmMassa = async () => {
    setIsSubmitting(true);
    try {
      const ids = Array.from(selecionados);
      await api.patch('/relatorios-financeiros/marcar-em-massa', { ids });
      toast.success(`${ids.length} pagamentos foram atualizados com sucesso!`);
      fetchData();
    } catch (error) {
      toast.error('Falha ao atualizar pagamentos em massa.');
    } finally {
      setIsSubmitting(false);
      setIsConfirmMassaOpen(false);
    }
  };

  const handleExportar = async () => {
    const toastId = toast.loading('Gerando seu relatório...');
    try {
      const params = {
        status: activeTab,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
        agrupar: agrupar,
      };
      const response = await api.get('/relatorios-financeiros/exportar', { params });

      // Cria um "arquivo virtual" no navegador para o download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', fileName);
      
      // Adiciona, clica e remove o link
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Relatório gerado com sucesso!', { id: toastId });

    } catch (error) {
      toast.error('Falha ao gerar o relatório.', { id: toastId });
      console.error("Erro ao exportar CSV:", error);
    }
  };

  const totalSelecionado = useMemo(() => relatorios.filter(r => selecionados.has(r.id)).reduce((sum, r) => sum + r.valor, 0), [selecionados, relatorios]);

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Painel Financeiro</h1>
          <p className="mt-2 text-lg text-muted-foreground">Visualize e gerencie todos os pagamentos da plataforma.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KpiCard title="Total a Pagar (Pendente)" value={kpis ? `R$ ${kpis.totalAPagar.toFixed(2)}` : '...'} icon={DollarSign} />
          <KpiCard title="Total Pago (Últimos 30 dias)" value={kpis ? `R$ ${kpis.totalPagoUltimos30dias.toFixed(2)}` : '...'} icon={CheckCircle} />
          <KpiCard title="Pagamentos Pendentes" value={kpis ? kpis.pagamentosPendentes : '...'} icon={Clock} />
        </div>

        {/* Barra de Filtros */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2"><label className="text-sm font-medium">De:</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="rounded-md bg-background border-border text-sm"/></div>
          <div className="flex items-center gap-2"><label className="text-sm font-medium">Até:</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="rounded-md bg-background border-border text-sm"/></div>
          <div className="flex items-center gap-2"><Switch checked={agrupar} onChange={setAgrupar} className={`${agrupar ? 'bg-primary' : 'bg-muted'} relative inline-flex h-6 w-11 items-center rounded-full`}><span className={`${agrupar ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`} /></Switch><span className="text-sm font-medium">Agrupar por Beneficiário</span></div>
          <button onClick={handleExportar} className="flex items-center gap-2 text-sm font-medium ml-auto px-3 py-2 rounded-md hover:bg-accent"><Download className="w-4 h-4"/>Exportar CSV</button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
          <div className="border-b border-border"><nav className="-mb-px flex space-x-8"><button onClick={() => setActiveTab('PENDENTE')} className={`${activeTab === 'PENDENTE' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Pendentes</button><button onClick={() => setActiveTab('PAGO')} className={`${activeTab === 'PAGO' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Pagos</button></nav></div>
          {selecionados.size > 0 && activeTab === 'PENDENTE' && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><button onClick={() => setIsConfirmMassaOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-x-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90"><User className="w-4 h-4"/>Marcar {selecionados.size} como Pagos (R$ {totalSelecionado.toFixed(2)})</button></motion.div>}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border bg-card">
            <thead className="bg-muted/50">
              <tr>
                {activeTab === 'PENDENTE' && <th className="p-4"><input type="checkbox" onChange={handleSelectAll} checked={selecionados.size > 0 && selecionados.size === relatorios.length} className="rounded border-gray-300 text-primary focus:ring-primary" /></th>}
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Beneficiário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ótica</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Conclusão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                {activeTab === 'PENDENTE' && <th className="relative px-6 py-3"><span className="sr-only">Ação</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (<tr><td colSpan={7} className="text-center py-12">Carregando relatórios...</td></tr>) : relatorios.length === 0 ? (<tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum relatório encontrado para os filtros aplicados.</td></tr>) : (relatorios.map((rel) => (<tr key={rel.id} className={`${selecionados.has(rel.id) ? 'bg-primary/10' : 'hover:bg-muted/50'}`}><td className="p-4"><input type="checkbox" checked={selecionados.has(rel.id)} onChange={() => handleSelectRow(rel.id)} className="rounded border-gray-300 text-primary focus:ring-primary" /></td><td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-foreground">{rel.usuario.nome}</div><div className="text-xs text-muted-foreground">CPF: {formatarCPF(rel.usuario.cpf)}</div></td><td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-foreground">{rel.usuario.optica?.nome || 'N/A'}</div><div className="text-xs text-muted-foreground">CNPJ: {formatarCNPJ(rel.usuario.optica?.cnpj)}</div></td><td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(rel.dataGerado).toLocaleDateString('pt-BR')}</td><td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">R$ {rel.valor.toFixed(2)}</td><td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={rel.status} /></td>{activeTab === 'PENDENTE' && <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleOpenConfirmIndividual(rel)} className="text-primary hover:text-primary/80" title="Marcar como Pago"><Check className="w-5 h-5" /></button></td>}</tr>)))}</tbody>
          </table>
        </div>
      </div>
      <ConfirmacaoResgateModal isOpen={isConfirmIndividualOpen} onClose={() => setIsConfirmIndividualOpen(false)} onConfirm={handleMarcarComoPagoIndividual} isLoading={isSubmitting} title="Confirmar Pagamento Individual" message={<p>Tem certeza que deseja marcar o pagamento de <strong>R$ {relatorioParaAcao?.valor.toFixed(2)}</strong> para <strong>{relatorioParaAcao?.usuario.nome}</strong> como PAGO?</p>} confirmButtonText="Sim, confirmar" />
      <ConfirmacaoResgateModal isOpen={isConfirmMassaOpen} onClose={() => setIsConfirmMassaOpen(false)} onConfirm={handleMarcarComoPagoEmMassa} isLoading={isSubmitting} title="Confirmar Pagamento em Massa" message={<p>Você confirma o pagamento de <strong>{selecionados.size} itens</strong>, totalizando <strong>R$ {totalSelecionado.toFixed(2)}</strong>? Esta ação não pode ser desfeita.</p>} confirmButtonText={`Sim, pagar ${selecionados.size} itens`} />
    </>
  );
}
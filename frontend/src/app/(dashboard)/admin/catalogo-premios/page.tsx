'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { PlusCircle, Edit } from 'lucide-react';

// Importando o modal que criamos
import CriarEditarPremioModal from '@/components/premios/admin/CriarEditarPremioModal';

// --- Tipagem dos Dados ---
interface PremioAdmin {
  id: string;
  nome: string;
  descricao: string;
  custoMoedinhas: number;
  estoque: number;
  imageUrl: string | null;
  ativo: boolean;
}

// --- Componente Principal da Página ---
export default function CatalogoPremiosPage() {
  const [premios, setPremios] = useState<PremioAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Gerenciamento do Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPremio, setSelectedPremio] = useState<PremioAdmin | null>(null);

  // --- Busca de Dados ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/premios/admin/todos');
      setPremios(response.data);
    } catch (error) {
      console.error("Erro ao buscar catálogo de prêmios:", error);
      toast.error('Não foi possível carregar o catálogo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers do Modal ---
  const handleOpenModal = (premio: PremioAdmin | null) => {
    setSelectedPremio(premio);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPremio(null);
  };

  const handleSavePremio = (savedPremio: PremioAdmin) => {
    if (selectedPremio) { // Editando
      setPremios(prev => prev.map(p => p.id === savedPremio.id ? savedPremio : p));
    } else { // Criando
      setPremios(prev => [savedPremio, ...prev]);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Cabeçalho e Ação Principal */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Catálogo de Prêmios
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Gerencie os prêmios disponíveis para resgate na plataforma.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-4 sm:mt-0 flex items-center justify-center gap-x-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/80 focus-visible:ring-offset-background"
            onClick={() => handleOpenModal(null)}
          >
            <PlusCircle className="w-5 h-5" />
            <span>Adicionar Prêmio</span>
          </motion.button>
        </header>

        {/* Tabela de Prêmios */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border bg-card">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Prêmio</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Custo (Moedinhas)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Estoque</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Editar</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8">Carregando...</td></tr>
              ) : (
                premios.map((premio) => (
                  <tr key={premio.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{premio.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{premio.custoMoedinhas.toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{premio.estoque}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${premio.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                        {premio.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenModal(premio)} className="text-primary hover:text-primary/80">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      <CriarEditarPremioModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePremio}
        premioInicial={selectedPremio}
      />
    </>
  );
}
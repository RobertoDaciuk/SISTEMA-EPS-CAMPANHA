'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';

// Importando os componentes que criamos
import PremioCard from '@/components/premios/PremioCard';
import PremioDetalhesModal from '@/components/premios/PremioDetalhesModal';
import ConfirmacaoResgateModal from '@/components/premios/ConfirmacaoResgateModal';

// --- Tipagem dos Dados ---
interface Premio {
  id: string;
  nome: string;
  descricao: string;
  imageUrl: string | null;
  custoMoedinhas: number;
}

// --- Componente Principal da Página ---
export default function LojaDePremiosPage() {
  const { usuario } = useAuth();
  const [premios, setPremios] = useState<Premio[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado para o processo de resgate

  // --- Gerenciamento dos Modais ---
  const [selectedPremio, setSelectedPremio] = useState<Premio | null>(null);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // --- Busca de Dados ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resPremios, resPerfil] = await Promise.all([
        api.get('/premios'),
        api.get('/perfil/meu'),
      ]);
      setPremios(resPremios.data);
      setSaldo(resPerfil.data.saldoMoedinhas);
    } catch (error) {
      console.error("Erro ao buscar dados da loja:", error);
      toast.error('Não foi possível carregar a loja de prêmios.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers do Fluxo de Resgate ---
  const handleSelectPremio = (premio: Premio) => {
    setSelectedPremio(premio);
    setIsDetalhesOpen(true);
  };

  const handleCloseDetalhes = () => {
    setIsDetalhesOpen(false);
  };

  const handleOpenConfirmacao = () => {
    setIsDetalhesOpen(false); // Fecha o modal de detalhes
    setIsConfirmOpen(true);   // Abre o modal de confirmação
  };

  const handleCloseConfirmacao = () => {
    setIsConfirmOpen(false);
  };

  const handleConfirmarResgate = async () => {
    if (!selectedPremio) return;

    setIsSubmitting(true);
    try {
      await api.post('/resgates/solicitar', { premioId: selectedPremio.id });
      toast.success(`Prêmio "${selectedPremio.nome}" resgatado com sucesso!`);
      
      // Atualiza o saldo na tela otimisticamente
      setSaldo(prev => prev - selectedPremio.custoMoedinhas);

    } catch (error: any) {
      console.error("Erro ao resgatar prêmio:", error);
      const errorMessage = error.response?.data?.message || 'Não foi possível completar o resgate.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      handleCloseConfirmacao();
      setSelectedPremio(null);
    }
  };

  // Efeito de container para animação dos cards
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Cabeçalho da Página */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Loja de Prêmios
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Use suas Moedinhas EPS para resgatar recompensas incríveis!
          </p>
        </header>

        {/* Card de Saldo */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg">
          <p className="text-sm font-medium uppercase tracking-wider">Meu Saldo</p>
          <div className="flex items-baseline gap-x-2 mt-1">
            <span className="text-4xl font-bold tracking-tight">
              {isLoading ? '...' : saldo.toLocaleString('pt-BR')}
            </span>
            <span className="text-lg font-medium">Moedinhas EPS</span>
          </div>
        </div>

        {/* Grade de Prêmios */}
        {isLoading ? (
          <p>Carregando prêmios...</p> // TODO: Criar Skeleton Loader
        ) : (
          <motion.div 
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {premios.map((premio) => (
              <PremioCard 
                key={premio.id} 
                premio={premio} 
                saldoUsuario={saldo} 
                onSelect={handleSelectPremio} 
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Modais */}
      <PremioDetalhesModal 
        isOpen={isDetalhesOpen}
        onClose={handleCloseDetalhes}
        onResgatar={handleOpenConfirmacao}
        premio={selectedPremio}
      />

      {selectedPremio && (
        <ConfirmacaoResgateModal 
          isOpen={isConfirmOpen}
          onClose={handleCloseConfirmacao}
          onConfirm={handleConfirmarResgate}
          isLoading={isSubmitting}
          title="Confirmar Resgate"
          message={
            <p>
              Você está prestes a resgatar o prêmio <strong>{selectedPremio.nome}</strong>. O custo de <strong>{selectedPremio.custoMoedinhas.toLocaleString('pt-BR')} moedinhas</strong> será deduzido do seu saldo. Deseja continuar?
            </p>
          }
        />
      )}
    </>
  );
}
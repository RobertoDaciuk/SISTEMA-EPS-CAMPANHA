'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';

// Importando os componentes que criamos
import InformacoesPerfilCard from '@/components/perfil/InformacoesPerfilCard';
import AlterarSenhaCard from '@/components/perfil/AlterarSenhaCard';

// Tipagem para os dados completos do perfil
interface PerfilUsuarioCompleto {
  nome: string;
  email: string;
  cpf: string | null;
  whatsapp: string | null;
  optica: {
    nome: string;
    cnpj: string;
  } | null;
  // Adicionar outros campos se necessário no futuro
}

// Componente de Skeleton para o estado de carregamento
const SkeletonLoader = () => (
  <div className="space-y-8 animate-pulse">
    <div className="bg-card rounded-2xl border border-border shadow-sm">
      <div className="p-6 border-b border-border">
        <div className="h-6 bg-muted rounded w-1/3"></div>
        <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2"><div className="h-4 bg-muted rounded w-1/4"></div><div className="h-5 bg-muted rounded w-3/4"></div></div>
        <div className="space-y-2"><div className="h-4 bg-muted rounded w-1/4"></div><div className="h-5 bg-muted rounded w-3/4"></div></div>
        <div className="space-y-2"><div className="h-4 bg-muted rounded w-1/4"></div><div className="h-5 bg-muted rounded w-3/4"></div></div>
        <div className="space-y-2"><div className="h-4 bg-muted rounded w-1/4"></div><div className="h-5 bg-muted rounded w-3/4"></div></div>
      </div>
    </div>
    <div className="bg-card rounded-2xl border border-border shadow-sm">
      <div className="p-6 border-b border-border">
        <div className="h-6 bg-muted rounded w-1/3"></div>
        <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-2"><div className="h-4 bg-muted rounded w-1/4"></div><div className="h-8 bg-muted rounded"></div></div>
        <div className="space-y-2"><div className="h-4 bg-muted rounded w-1/4"></div><div className="h-8 bg-muted rounded"></div></div>
        <div className="space-y-2"><div className="h-4 bg-muted rounded w-1/4"></div><div className="h-8 bg-muted rounded"></div></div>
      </div>
    </div>
  </div>
);

/**
 * Página "Meu Perfil", que orquestra os componentes de informações e alteração de senha.
 */
export default function PerfilPage() {
  // Estado para armazenar os dados do usuário
  const [perfil, setPerfil] = useState<PerfilUsuarioCompleto | null>(null);
  // Estado de carregamento inicial da página
  const [isLoading, setIsLoading] = useState(true);

  // Função para buscar os dados do perfil do usuário
  const fetchPerfil = useCallback(async () => {
    try {
      const response = await api.get('/perfil/meu');
      setPerfil(response.data);
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      toast.error('Não foi possível carregar seus dados de perfil.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Efeito para buscar os dados quando o componente é montado
  useEffect(() => {
    fetchPerfil();
  }, [fetchPerfil]);

  // Callback para atualizar o estado local quando o card filho salvar os dados
  const handlePerfilAtualizado = (novosDados: Partial<PerfilUsuarioCompleto>) => {
    if (perfil) {
      setPerfil({ ...perfil, ...novosDados });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Cabeçalho da Página */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Meu Perfil
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Gerencie suas informações pessoais e de segurança.
        </p>
      </header>

      {/* Conteúdo da Página */}
      {isLoading ? (
        <SkeletonLoader />
      ) : perfil ? (
        <div className="space-y-8">
          <InformacoesPerfilCard 
            dadosIniciais={perfil} 
            onPerfilAtualizado={handlePerfilAtualizado} 
          />
          <AlterarSenhaCard />
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Não foi possível carregar os dados do seu perfil.</p>
      )}
    </div>
  );
}

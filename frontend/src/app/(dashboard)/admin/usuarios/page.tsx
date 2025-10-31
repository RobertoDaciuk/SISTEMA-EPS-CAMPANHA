'use client';

/**
 * ============================================================================
 * PÁGINA: Gerenciamento de Usuários (Admin)
 * ============================================================================
 *
 * Página protegida (apenas ADMIN) para gerenciamento completo de usuários.
 *
 * Features:
 * - Listagem de todos os usuários com filtros avançados
 * - Filtros server-side (nomeOuEmail, papel, status, opticaId)
 * - Criação de novos usuários (modal)
 * - Edição de usuários existentes (modal)
 * - Reset de senha (modal com token)
 * - Personificação (troca de contexto)
 * - Aprovar/Bloquear/Desbloquear usuários
 * - Proteção de rota (redirect se não for Admin)
 * - Estados de loading e vazios
 * - Responsivo (mobile-first)
 *
 * @module AdminUsuariosPage
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Filter, Loader2, Users, AlertCircle } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import UsuarioTable from '@/components/admin/usuarios/UsuarioTable';
import CriarEditarUsuarioModal from '@/components/admin/usuarios/CriarEditarUsuarioModal';
import ResetSenhaModal from '@/components/admin/usuarios/ResetSenhaModal';

// ============================================================================
// INTERFACES
// ============================================================================

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf?: string | null;
  whatsapp?: string | null;
  papel: 'ADMIN' | 'GERENTE' | 'VENDEDOR';
  status: 'PENDENTE' | 'ATIVO' | 'BLOQUEADO';
  opticaId?: string | null;
  optica?: {
    id: string;
    nome: string;
  } | null;
  gerenteId?: string | null;
  gerente?: {
    id: string;
    nome: string;
  } | null;
}

interface Optica {
  id: string;
  nome: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AdminUsuariosPage() {
  const router = useRouter();
  const { usuario, isLoading: isAuthLoading } = useAuth();

  // ==========================================================================
  // ESTADOS
  // ==========================================================================

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modais
  const [modalCriarEditarOpen, setModalCriarEditarOpen] = useState(false);
  const [modalResetSenhaOpen, setModalResetSenhaOpen] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null);

  // Filtros
  const [filtroNomeOuEmail, setFiltroNomeOuEmail] = useState('');
  const [filtroPapel, setFiltroPapel] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroOpticaId, setFiltroOpticaId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Lista de óticas (para filtro)
  const [listaOticasFiltro, setListaOticasFiltro] = useState<Optica[]>([]);

  // ==========================================================================
  // PROTEÇÃO DE ROTA
  // ==========================================================================

  useEffect(() => {
    if (!isAuthLoading && (!usuario || usuario.papel !== 'ADMIN')) {
      router.push('/');
      toast.error('Acesso negado: Apenas administradores');
    }
  }, [isAuthLoading, usuario, router]);

  // ==========================================================================
  // FETCH: Carregar Óticas (para filtro)
  // ==========================================================================

  useEffect(() => {
    if (usuario?.papel === 'ADMIN') {
      fetchOticas();
    }
  }, [usuario]);

  const fetchOticas = async () => {
    try {
      const response = await api.get('/oticas');
      setListaOticasFiltro(response.data);
    } catch (error: any) {
      console.error('Erro ao buscar óticas:', error);
    }
  };

  // ==========================================================================
  // FETCH: Carregar Usuários (com Filtros)
  // ==========================================================================

  const fetchUsuarios = useCallback(async () => {
    try {
      setIsLoading(true);

      // Montar query params
      const params = new URLSearchParams();
      if (filtroNomeOuEmail) params.append('nomeOuEmail', filtroNomeOuEmail);
      if (filtroPapel) params.append('papel', filtroPapel);
      if (filtroStatus) params.append('status', filtroStatus);
      if (filtroOpticaId) params.append('opticaId', filtroOpticaId);

      const response = await api.get(`/usuarios?${params.toString()}`);
      setUsuarios(response.data);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar lista de usuários');
    } finally {
      setIsLoading(false);
    }
  }, [filtroNomeOuEmail, filtroPapel, filtroStatus, filtroOpticaId]);

  // ==========================================================================
  // EFFECT: Carregar Usuários (depende de filtros)
  // ==========================================================================

  useEffect(() => {
    if (usuario?.papel === 'ADMIN') {
      fetchUsuarios();
    }
  }, [usuario, fetchUsuarios]);

  // ==========================================================================
  // HANDLERS: Modais
  // ==========================================================================

  const handleAbrirModalCriar = () => {
    setUsuarioSelecionado(null);
    setModalCriarEditarOpen(true);
  };

  const handleAbrirModalEditar = (user: Usuario) => {
    setUsuarioSelecionado(user);
    setModalCriarEditarOpen(true);
  };

  const handleAbrirModalReset = (user: Usuario) => {
    setUsuarioSelecionado(user);
    setModalResetSenhaOpen(true);
  };

  const handleFecharModais = () => {
    setModalCriarEditarOpen(false);
    setModalResetSenhaOpen(false);
    setUsuarioSelecionado(null);
  };

  const handleSucessoModal = () => {
    handleFecharModais();
    fetchUsuarios();
  };

  // ==========================================================================
  // RENDER: Loading Inicial
  // ==========================================================================

  if (isAuthLoading || (isLoading && usuarios.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: Não é Admin
  // ==========================================================================

  if (!usuario || usuario.papel !== 'ADMIN') {
    return null;
  }

  // ==========================================================================
  // RENDER PRINCIPAL
  // ==========================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 p-3 shadow-lg shadow-indigo-500/30">
                  <Users className="h-8 w-8 text-white" />
                </div>
                Gerenciamento de Usuários
              </h1>
              <p className="text-gray-600 mt-2">
                Gerencie todos os usuários da plataforma
              </p>
            </div>

            {/* Botão: Adicionar Usuário */}
            <button
              onClick={handleAbrirModalCriar}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              <Plus className="h-5 w-5" />
              <span>Adicionar Usuário</span>
            </button>
          </div>

          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600 font-medium">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{usuarios.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-emerald-600 font-medium">Ativos</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {usuarios.filter((u) => u.status === 'ATIVO').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-amber-600 font-medium">Pendentes</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {usuarios.filter((u) => u.status === 'PENDENTE').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-red-600 font-medium">Bloqueados</p>
              <p className="text-2xl font-bold text-red-700 mt-1">
                {usuarios.filter((u) => u.status === 'BLOQUEADO').length}
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          {/* Toggle Filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Filtros</span>
              {(filtroNomeOuEmail || filtroPapel || filtroStatus || filtroOpticaId) && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                  Ativos
                </span>
              )}
            </div>
            <svg
              className={`h-5 w-5 text-gray-600 transition-transform ${
                showFilters ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Campos de Filtro */}
          {showFilters && (
            <div className="px-6 pb-6 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {/* Filtro: Nome ou Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome ou Email
                  </label>
                  <input
                    type="text"
                    value={filtroNomeOuEmail}
                    onChange={(e) => setFiltroNomeOuEmail(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Filtro: Papel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Papel
                  </label>
                  <select
                    value={filtroPapel}
                    onChange={(e) => setFiltroPapel(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="ADMIN">Admin</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="VENDEDOR">Vendedor</option>
                  </select>
                </div>

                {/* Filtro: Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="BLOQUEADO">Bloqueado</option>
                  </select>
                </div>

                {/* Filtro: Ótica */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ótica
                  </label>
                  <select
                    value={filtroOpticaId}
                    onChange={(e) => setFiltroOpticaId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Todas</option>
                    {listaOticasFiltro.map((otica) => (
                      <option key={otica.id} value={otica.id}>
                        {otica.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botão: Limpar Filtros */}
              {(filtroNomeOuEmail || filtroPapel || filtroStatus || filtroOpticaId) && (
                <button
                  onClick={() => {
                    setFiltroNomeOuEmail('');
                    setFiltroPapel('');
                    setFiltroStatus('');
                    setFiltroOpticaId('');
                  }}
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Lista/Tabela de Usuários */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              Tente ajustar os filtros ou adicione o primeiro usuário
            </p>
            <button
              onClick={handleAbrirModalCriar}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Adicionar Primeiro Usuário
            </button>
          </div>
        ) : (
          <UsuarioTable
            usuarios={usuarios}
            onEdit={handleAbrirModalEditar}
            onResetSenha={handleAbrirModalReset}
            onRefetch={fetchUsuarios}
          />
        )}
      </div>

      {/* Modais */}
      <CriarEditarUsuarioModal
        isOpen={modalCriarEditarOpen}
        onClose={handleFecharModais}
        onSuccess={handleSucessoModal}
        userToEdit={usuarioSelecionado}
      />

      <ResetSenhaModal
        isOpen={modalResetSenhaOpen}
        onClose={handleFecharModais}
        usuario={usuarioSelecionado}
      />
    </div>
  );
}

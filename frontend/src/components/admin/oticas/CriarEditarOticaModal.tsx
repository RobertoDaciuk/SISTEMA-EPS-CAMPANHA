'use client';

/**
 * ============================================================================
 * MODAL: Criar/Editar Ótica
 * ============================================================================
 *
 * Modal responsável por criar novas óticas ou editar óticas existentes.
 * Suporta hierarquia Matriz/Filial através de campos ehMatriz e matrizId.
 *
 * Features:
 * - Criação e edição de óticas
 * - Seleção de matriz (dropdown de óticas marcadas como ehMatriz=true)
 * - Máscara de CNPJ automática
 * - Validação de campos
 * - Estados de loading
 * - Feedback visual com toasts
 *
 * @module CriarEditarOticaModal
 * ============================================================================
 */

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Loader2, Building2, Network } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

// ============================================================================
// INTERFACES
// ============================================================================

interface Optica {
  id: string;
  nome: string;
  cnpj: string;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
  email?: string | null;
  ativa: boolean;
  ehMatriz: boolean;
  matrizId?: string | null;
  matriz?: {
    id: string;
    nome: string;
  } | null;
}

interface CriarEditarOticaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  oticaToEdit: Optica | null;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Formata CNPJ adicionando pontuação (00.000.000/0000-00)
 */
const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 14) {
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return value;
};

/**
 * Remove pontuação do CNPJ (apenas números)
 */
const cleanCNPJ = (value: string): string => {
  return value.replace(/\D/g, '');
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function CriarEditarOticaModal({
  isOpen,
  onClose,
  onSuccess,
  oticaToEdit,
}: CriarEditarOticaModalProps) {
  // ==========================================================================
  // ESTADOS DO FORMULÁRIO
  // ==========================================================================

  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [ehMatriz, setEhMatriz] = useState(false);
  const [matrizId, setMatrizId] = useState<string>('');

  // ==========================================================================
  // ESTADOS DE CONTROLE
  // ==========================================================================

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMatrizes, setIsFetchingMatrizes] = useState(false);
  const [listaMatrizes, setListaMatrizes] = useState<Optica[]>([]);
  const [erro, setErro] = useState<string>('');

  const isEditMode = !!oticaToEdit;

  // ==========================================================================
  // EFFECT: Carregar Matrizes Disponíveis
  // ==========================================================================

  useEffect(() => {
    if (isOpen) {
      fetchMatrizes();
    }
  }, [isOpen]);

  // ==========================================================================
  // EFFECT: Popular Formulário no Modo Edição
  // ==========================================================================

  useEffect(() => {
    if (oticaToEdit) {
      setNome(oticaToEdit.nome);
      setCnpj(formatCNPJ(oticaToEdit.cnpj));
      setEndereco(oticaToEdit.endereco || '');
      setCidade(oticaToEdit.cidade || '');
      setEstado(oticaToEdit.estado || '');
      setTelefone(oticaToEdit.telefone || '');
      setEmail(oticaToEdit.email || '');
      setEhMatriz(oticaToEdit.ehMatriz);
      setMatrizId(oticaToEdit.matrizId || '');
    } else {
      // Modo criar - limpar formulário
      resetForm();
    }
  }, [oticaToEdit]);

  // ==========================================================================
  // FUNÇÃO: Buscar Matrizes (para dropdown)
  // ==========================================================================

  const fetchMatrizes = async () => {
    try {
      setIsFetchingMatrizes(true);
      const response = await api.get('/oticas', {
        params: { ehMatriz: true },
      });
      setListaMatrizes(response.data);
    } catch (error: any) {
      console.error('Erro ao buscar matrizes:', error);
      toast.error('Erro ao carregar lista de matrizes');
    } finally {
      setIsFetchingMatrizes(false);
    }
  };

  // ==========================================================================
  // FUNÇÃO: Resetar Formulário
  // ==========================================================================

  const resetForm = () => {
    setNome('');
    setCnpj('');
    setEndereco('');
    setCidade('');
    setEstado('');
    setTelefone('');
    setEmail('');
    setEhMatriz(false);
    setMatrizId('');
    setErro('');
  };

  // ==========================================================================
  // HANDLER: Fechar Modal
  // ==========================================================================

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  // ==========================================================================
  // HANDLER: Submeter Formulário
  // ==========================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    // Validações básicas
    if (!nome.trim()) {
      setErro('Nome é obrigatório');
      return;
    }

    const cnpjLimpo = cleanCNPJ(cnpj);
    if (cnpjLimpo.length !== 14) {
      setErro('CNPJ inválido (deve ter 14 dígitos)');
      return;
    }

    // Se for filial, matrizId é obrigatório
    if (!ehMatriz && !matrizId) {
      setErro('Selecione uma matriz para esta filial');
      return;
    }

    // Montar payload
    const payload = {
      nome: nome.trim(),
      cnpj: cnpjLimpo,
      endereco: endereco.trim() || undefined,
      cidade: cidade.trim() || undefined,
      estado: estado.trim() || undefined,
      telefone: telefone.trim() || undefined,
      email: email.trim() || undefined,
      ehMatriz,
      matrizId: ehMatriz ? null : (matrizId || null),
    };

    try {
      setIsLoading(true);

      if (isEditMode) {
        // Modo Edição
        await api.patch(`/oticas/${oticaToEdit.id}`, payload);
        toast.success('Ótica atualizada com sucesso!');
      } else {
        // Modo Criar
        await api.post('/oticas', payload);
        toast.success('Ótica criada com sucesso!');
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Erro ao salvar ótica:', error);
      const mensagemErro =
        error.response?.data?.message || 'Erro ao salvar ótica';
      setErro(mensagemErro);
      toast.error(mensagemErro);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Container do Modal */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/20 p-2">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <Dialog.Title className="text-xl font-bold text-white">
                      {isEditMode ? 'Editar Ótica' : 'Nova Ótica'}
                    </Dialog.Title>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="space-y-5">
                    {/* Erro Geral */}
                    {erro && (
                      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                        {erro}
                      </div>
                    )}

                    {/* Nome */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nome da Ótica *
                      </label>
                      <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Ex: Ótica Central LTDA"
                        disabled={isLoading}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                      />
                    </div>

                    {/* CNPJ */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        CNPJ *
                      </label>
                      <input
                        type="text"
                        value={cnpj}
                        onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        disabled={isLoading}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                      />
                    </div>

                    {/* Grid: Cidade e Estado */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Cidade
                        </label>
                        <input
                          type="text"
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                          placeholder="Ex: São Paulo"
                          disabled={isLoading}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Estado (UF)
                        </label>
                        <input
                          type="text"
                          value={estado}
                          onChange={(e) => setEstado(e.target.value.toUpperCase())}
                          placeholder="Ex: SP"
                          maxLength={2}
                          disabled={isLoading}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                        />
                      </div>
                    </div>

                    {/* Endereço */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Endereço
                      </label>
                      <input
                        type="text"
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        placeholder="Ex: Rua das Flores, 123"
                        disabled={isLoading}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                      />
                    </div>

                    {/* Grid: Telefone e Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Telefone
                        </label>
                        <input
                          type="text"
                          value={telefone}
                          onChange={(e) => setTelefone(e.target.value)}
                          placeholder="(11) 98765-4321"
                          disabled={isLoading}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="contato@otica.com"
                          disabled={isLoading}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                        />
                      </div>
                    </div>

                    {/* Divisor */}
                    <div className="border-t border-gray-200 pt-5">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Network className="h-4 w-4 text-indigo-600" />
                        Hierarquia Matriz/Filial
                      </h3>

                      {/* Checkbox: É Matriz? */}
                      <div className="mb-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={ehMatriz}
                            onChange={(e) => {
                              setEhMatriz(e.target.checked);
                              if (e.target.checked) {
                                setMatrizId(''); // Limpar matriz se virar matriz
                              }
                            }}
                            disabled={isLoading}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                            Esta ótica é uma Matriz (pode ter filiais)
                          </span>
                        </label>
                      </div>

                      {/* Dropdown: Selecionar Matriz (apenas se NÃO for matriz) */}
                      {!ehMatriz && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Matriz Vinculada *
                          </label>
                          {isFetchingMatrizes ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Carregando matrizes...
                            </div>
                          ) : (
                            <select
                              value={matrizId}
                              onChange={(e) => setMatrizId(e.target.value)}
                              disabled={isLoading}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                            >
                              <option value="">Selecione uma matriz</option>
                              {listaMatrizes.map((matriz) => (
                                <option key={matriz.id} value={matriz.id}>
                                  {matriz.nome} - {formatCNPJ(matriz.cnpj)}
                                </option>
                              ))}
                            </select>
                          )}
                          {!ehMatriz && listaMatrizes.length === 0 && !isFetchingMatrizes && (
                            <p className="mt-2 text-sm text-amber-600">
                              Nenhuma matriz cadastrada. Marque esta ótica como matriz ou cadastre uma matriz primeiro.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isLoading ? 'Salvando...' : isEditMode ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

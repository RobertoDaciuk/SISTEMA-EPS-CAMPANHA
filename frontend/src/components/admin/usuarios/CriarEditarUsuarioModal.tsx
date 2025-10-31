'use client';

/**
 * ============================================================================
 * MODAL: Criar/Editar Usuário
 * ============================================================================
 *
 * Modal responsável por criar novos usuários ou editar usuários existentes.
 * Suporta seleção de Ótica e Gerente (com dados buscados da API).
 *
 * Features:
 * - Criação e edição de usuários
 * - Dropdowns dinâmicos (Ótica, Gerente, Papel, Status)
 * - Máscaras de CPF e WhatsApp
 * - Validação de campos
 * - Estados de loading
 * - Feedback visual com toasts
 *
 * @module CriarEditarUsuarioModal
 * ============================================================================
 */

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Loader2, User, Shield, Building2, UserCog } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

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
  cnpj: string;
}

interface CriarEditarUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit: Usuario | null;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Formata CPF adicionando pontuação (000.000.000-00)
 */
const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  return value;
};

/**
 * Formata WhatsApp adicionando pontuação ((00) 00000-0000)
 */
const formatWhatsApp = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
  return value;
};

/**
 * Remove pontuação (apenas números)
 */
const cleanNumbers = (value: string): string => {
  return value.replace(/\D/g, '');
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function CriarEditarUsuarioModal({
  isOpen,
  onClose,
  onSuccess,
  userToEdit,
}: CriarEditarUsuarioModalProps) {
  // ==========================================================================
  // ESTADOS DO FORMULÁRIO
  // ==========================================================================

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [papel, setPapel] = useState<'ADMIN' | 'GERENTE' | 'VENDEDOR'>('VENDEDOR');
  const [status, setStatus] = useState<'PENDENTE' | 'ATIVO' | 'BLOQUEADO'>('ATIVO');
  const [opticaId, setOpticaId] = useState<string>('');
  const [gerenteId, setGerenteId] = useState<string>('');

  // ==========================================================================
  // ESTADOS DE CONTROLE
  // ==========================================================================

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [listaOticas, setListaOticas] = useState<Optica[]>([]);
  const [listaGerentes, setListaGerentes] = useState<Usuario[]>([]);
  const [erro, setErro] = useState<string>('');
  const [tokenGerado, setTokenGerado] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);

  const isEditMode = !!userToEdit;

  // ==========================================================================
  // EFFECT: Carregar Dados (Óticas e Gerentes)
  // ==========================================================================

  useEffect(() => {
    if (isOpen) {
      fetchDados();
    }
  }, [isOpen]);

  // ==========================================================================
  // EFFECT: Popular Formulário no Modo Edição
  // ==========================================================================

  useEffect(() => {
    if (userToEdit) {
      setNome(userToEdit.nome);
      setEmail(userToEdit.email);
      setCpf(userToEdit.cpf ? formatCPF(userToEdit.cpf) : '');
      setWhatsapp(userToEdit.whatsapp ? formatWhatsApp(userToEdit.whatsapp) : '');
      setPapel(userToEdit.papel);
      setStatus(userToEdit.status);
      setOpticaId(userToEdit.opticaId || '');
      setGerenteId(userToEdit.gerenteId || '');
    } else {
      // Modo criar - limpar formulário
      resetForm();
    }
  }, [userToEdit]);

  // ==========================================================================
  // FUNÇÃO: Buscar Óticas e Gerentes
  // ==========================================================================

  const fetchDados = async () => {
    try {
      setIsFetchingData(true);

      const [oticasResponse, gerentesResponse] = await Promise.all([
        api.get('/oticas'),
        api.get('/usuarios', { params: { papel: 'GERENTE' } }),
      ]);

      setListaOticas(oticasResponse.data);
      setListaGerentes(gerentesResponse.data);
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados do formulário');
    } finally {
      setIsFetchingData(false);
    }
  };

  // ==========================================================================
  // FUNÇÃO: Resetar Formulário
  // ==========================================================================

  const resetForm = () => {
    setNome('');
    setEmail('');
    setCpf('');
    setWhatsapp('');
    setPapel('VENDEDOR');
    setStatus('ATIVO');
    setOpticaId('');
    setGerenteId('');
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

    if (!email.trim()) {
      setErro('Email é obrigatório');
      return;
    }

    // Montar payload
    const payload: any = {
      nome: nome.trim(),
      email: email.trim(),
      cpf: cpf ? cleanNumbers(cpf) : undefined,
      whatsapp: whatsapp ? cleanNumbers(whatsapp) : undefined,
      papel,
      status,
      opticaId: opticaId || undefined,
      gerenteId: gerenteId || undefined,
    };

    try {
      setIsLoading(true);

      if (isEditMode) {
        // Modo Edição
        await api.patch(`/usuarios/${userToEdit.id}`, payload);
        toast.success('Usuário atualizado com sucesso!');
        onSuccess();
        handleClose();
      } else {
        // Modo Criar - Backend retorna { usuario, tokenOriginal }
        const response = await api.post('/usuarios', payload);

        // Se token foi gerado (senha não fornecida), mostrar para o Admin
        if (response.data.tokenOriginal) {
          setTokenGerado(response.data.tokenOriginal);
          setShowTokenModal(true);
          toast.success('Usuário criado! Token de primeiro acesso gerado.');
        } else {
          toast.success('Usuário criado com sucesso!');
          onSuccess();
          handleClose();
        }
      }
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      const mensagemErro =
        error.response?.data?.message || 'Erro ao salvar usuário';
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/20 p-2">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <Dialog.Title className="text-xl font-bold text-white">
                      {isEditMode ? 'Editar Usuário' : 'Novo Usuário'}
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
                  {isFetchingData ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                      <span className="ml-3 text-gray-600">Carregando...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Erro Geral */}
                      {erro && (
                        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                          {erro}
                        </div>
                      )}

                      {/* Informações Básicas */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <User className="h-4 w-4 text-indigo-600" />
                          Informações Básicas
                        </h3>
                        <div className="space-y-4">
                          {/* Nome */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Nome Completo *
                            </label>
                            <input
                              type="text"
                              value={nome}
                              onChange={(e) => setNome(e.target.value)}
                              placeholder="Ex: João Silva"
                              disabled={isLoading}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                            />
                          </div>

                          {/* Grid: Email e CPF */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Email *
                              </label>
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="joao@email.com"
                                disabled={isLoading}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                CPF
                              </label>
                              <input
                                type="text"
                                value={cpf}
                                onChange={(e) => setCpf(formatCPF(e.target.value))}
                                placeholder="000.000.000-00"
                                maxLength={14}
                                disabled={isLoading}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                              />
                            </div>
                          </div>

                          {/* WhatsApp */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              WhatsApp
                            </label>
                            <input
                              type="text"
                              value={whatsapp}
                              onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                              placeholder="(11) 98765-4321"
                              maxLength={15}
                              disabled={isLoading}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Permissões e Status */}
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-indigo-600" />
                          Permissões e Status
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Papel */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Papel *
                            </label>
                            <select
                              value={papel}
                              onChange={(e) => setPapel(e.target.value as any)}
                              disabled={isLoading}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="GERENTE">Gerente</option>
                              <option value="VENDEDOR">Vendedor</option>
                            </select>
                          </div>

                          {/* Status */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Status *
                            </label>
                            <select
                              value={status}
                              onChange={(e) => setStatus(e.target.value as any)}
                              disabled={isLoading}
                              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                            >
                              <option value="PENDENTE">Pendente</option>
                              <option value="ATIVO">Ativo</option>
                              <option value="BLOQUEADO">Bloqueado</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Vinculações (esconder para ADMIN) */}
                      {papel !== 'ADMIN' && (
                        <div className="border-t border-gray-200 pt-6">
                          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-indigo-600" />
                            Vinculações
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Ótica */}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Ótica {papel === 'GERENTE' || papel === 'VENDEDOR' ? '*' : ''}
                              </label>
                              <select
                                value={opticaId}
                                onChange={(e) => setOpticaId(e.target.value)}
                                disabled={isLoading}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                              >
                                <option value="">Selecione uma ótica</option>
                                {listaOticas.map((otica) => (
                                  <option key={otica.id} value={otica.id}>
                                    {otica.nome}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Gerente (apenas para VENDEDOR) */}
                            {papel === 'VENDEDOR' && (
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Gerente
                                </label>
                                <select
                                  value={gerenteId}
                                  onChange={(e) => setGerenteId(e.target.value)}
                                  disabled={isLoading}
                                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                                >
                                  <option value="">Nenhum gerente</option>
                                  {listaGerentes.map((gerente) => (
                                    <option key={gerente.id} value={gerente.id}>
                                      {gerente.nome}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 justify-end border-t border-gray-200 pt-6">
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
                      disabled={isLoading || isFetchingData}
                      className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        {/* Modal de Token Gerado */}
        {showTokenModal && tokenGerado && (
          <Transition appear show={showTokenModal} as={Fragment}>
            <Dialog
              as="div"
              className="relative z-[60]"
              onClose={() => {
                setShowTokenModal(false);
                setTokenGerado(null);
                onSuccess();
                handleClose();
              }}
            >
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
              </Transition.Child>

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
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5">
                        <Dialog.Title className="text-xl font-bold text-white">
                          Token de Primeiro Acesso Gerado
                        </Dialog.Title>
                        <p className="mt-2 text-sm text-green-100">
                          Envie este token para o usuário. Válido por 7 dias.
                        </p>
                      </div>

                      {/* Body */}
                      <div className="p-6 space-y-4">
                        {/* Token Display */}
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                            Token
                          </label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-white rounded border border-gray-300 px-3 py-2 text-sm font-mono text-gray-800 break-all">
                              {tokenGerado}
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(tokenGerado);
                                toast.success('Token copiado!');
                              }}
                              className="flex-shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                            >
                              Copiar
                            </button>
                          </div>
                        </div>

                        {/* Info Alert */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-sm text-amber-800">
                            <strong>Importante:</strong> O usuário deve acessar a página de
                            redefinição de senha e usar este token para criar sua senha
                            permanente. O token expira em 7 dias.
                          </p>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="bg-gray-50 px-6 py-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowTokenModal(false);
                            setTokenGerado(null);
                            onSuccess();
                            handleClose();
                          }}
                          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold hover:from-green-700 hover:to-emerald-700 transition-all"
                        >
                          Entendido
                        </button>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>
        )}
      </Dialog>
    </Transition>
  );
}

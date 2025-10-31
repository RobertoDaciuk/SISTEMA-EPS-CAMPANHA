'use client';

/**
 * ============================================================================
 * MODAL: Resetar Senha de Usuário (Admin)
 * ============================================================================
 *
 * Modal para o Admin gerar token temporário de reset de senha para um usuário.
 * O token gerado deve ser enviado ao usuário para que ele possa redefinir a senha.
 *
 * Features:
 * - Gerar token temporário de reset de senha
 * - Copiar token para área de transferência
 * - Feedback visual com toasts
 * - Estados de loading
 *
 * @module ResetSenhaModal
 * ============================================================================
 */

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, KeyRound, Copy, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

// ============================================================================
// INTERFACES
// ============================================================================

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface ResetSenhaModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuario: Usuario | null;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function ResetSenhaModal({
  isOpen,
  onClose,
  usuario,
}: ResetSenhaModalProps) {
  // ==========================================================================
  // ESTADOS
  // ==========================================================================

  const [tokenGerado, setTokenGerado] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // ==========================================================================
  // EFFECT: Resetar Token ao Fechar
  // ==========================================================================

  useEffect(() => {
    if (!isOpen) {
      setTokenGerado(null);
      setCopiado(false);
    }
  }, [isOpen]);

  // ==========================================================================
  // FUNÇÃO: Gerar Token
  // ==========================================================================

  const handleGerarToken = async () => {
    if (!usuario) return;

    try {
      setIsLoading(true);
      const response = await api.post(`/usuarios/${usuario.id}/iniciar-reset-senha`);

      setTokenGerado(response.data.tokenOriginal);
      toast.success('Token gerado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar token:', error);
      const mensagemErro =
        error.response?.data?.message || 'Erro ao gerar token de reset';
      toast.error(mensagemErro);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // FUNÇÃO: Copiar Token
  // ==========================================================================

  const handleCopiarToken = async () => {
    if (!tokenGerado) return;

    try {
      await navigator.clipboard.writeText(tokenGerado);
      setCopiado(true);
      toast.success('Token copiado para a área de transferência!');

      // Resetar estado de "copiado" após 3 segundos
      setTimeout(() => {
        setCopiado(false);
      }, 3000);
    } catch (error) {
      console.error('Erro ao copiar token:', error);
      toast.error('Erro ao copiar token');
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/20 p-2">
                      <KeyRound className="h-6 w-6 text-white" />
                    </div>
                    <Dialog.Title className="text-xl font-bold text-white">
                      Resetar Senha
                    </Dialog.Title>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6">
                  {/* Informações do Usuário */}
                  {usuario && (
                    <div className="mb-6 rounded-lg bg-gray-50 border border-gray-200 p-4">
                      <p className="text-sm text-gray-600 mb-1">Resetar senha para:</p>
                      <p className="text-lg font-bold text-gray-900">{usuario.nome}</p>
                      <p className="text-sm text-gray-600 mt-1">{usuario.email}</p>
                    </div>
                  )}

                  {/* Alerta de Instruções */}
                  {!tokenGerado && (
                    <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 flex gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-2">Como funciona:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Clique em "Gerar Token Temporário"</li>
                          <li>Copie o token gerado</li>
                          <li>Envie o token ao usuário (WhatsApp, email, etc.)</li>
                          <li>O usuário usa o token para redefinir a senha</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* Botão: Gerar Token */}
                  {!tokenGerado && (
                    <button
                      onClick={handleGerarToken}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/30 hover:from-amber-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Gerando Token...
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-5 w-5" />
                          Gerar Token Temporário
                        </>
                      )}
                    </button>
                  )}

                  {/* Token Gerado */}
                  {tokenGerado && (
                    <div className="space-y-4">
                      {/* Alerta de Sucesso */}
                      <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-800">
                          <p className="font-semibold mb-1">Token gerado com sucesso!</p>
                          <p>Copie o token abaixo e envie ao usuário.</p>
                        </div>
                      </div>

                      {/* Campo do Token */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Token Temporário
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={tokenGerado}
                            readOnly
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-sm font-mono bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                          <button
                            onClick={handleCopiarToken}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md transition-all ${
                              copiado
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title="Copiar token"
                          >
                            {copiado ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <Copy className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Este token expira em 15 minutos
                        </p>
                      </div>

                      {/* Botão: Copiar Token (Grande) */}
                      <button
                        onClick={handleCopiarToken}
                        className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold shadow-lg transition-all ${
                          copiado
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-green-500/30'
                            : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-amber-500/30 hover:from-amber-700 hover:to-orange-700'
                        }`}
                      >
                        {copiado ? (
                          <>
                            <CheckCircle className="h-5 w-5" />
                            Token Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-5 w-5" />
                            Copiar Token
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={onClose}
                      className="w-full px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {tokenGerado ? 'Fechar' : 'Cancelar'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

'use client';

/**
 * ============================================================================
 * COMPONENTE: Menu de Ações do Usuário
 * ============================================================================
 *
 * Dropdown com todas as ações disponíveis para um usuário na lista.
 *
 * Ações Disponíveis:
 * - Editar (sempre disponível)
 * - Resetar Senha (sempre disponível)
 * - Personificar / Acessar como (sempre disponível)
 * - Aprovar (apenas se status === PENDENTE)
 * - Bloquear (apenas se status === ATIVO)
 * - Desbloquear (apenas se status === BLOQUEADO)
 *
 * Features:
 * - Menu dropdown responsivo
 * - Ações condicionais baseadas no status
 * - Confirmação para ações críticas
 * - Feedback visual com toasts
 * - Personificação com troca de contexto (auth.login)
 *
 * @module MenuAcoesUsuario
 * ============================================================================
 */

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  MoreHorizontal,
  Edit,
  KeyRound,
  UserCheck,
  CheckCircle,
  XCircle,
  Unlock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

// ============================================================================
// INTERFACES
// ============================================================================

interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: 'ADMIN' | 'GERENTE' | 'VENDEDOR';
  status: 'PENDENTE' | 'ATIVO' | 'BLOQUEADO';
}

interface MenuAcoesUsuarioProps {
  usuario: Usuario;
  onEdit: (user: Usuario) => void;
  onResetSenha: (user: Usuario) => void;
  onRefetch: () => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function MenuAcoesUsuario({
  usuario,
  onEdit,
  onResetSenha,
  onRefetch,
}: MenuAcoesUsuarioProps) {
  const { login: authLogin } = useAuth();

  // ==========================================================================
  // HANDLER: Aprovar Usuário
  // ==========================================================================

  const handleAprovar = async () => {
    if (!confirm(`Aprovar o usuário ${usuario.nome}?`)) return;

    try {
      await toast.promise(api.patch(`/usuarios/${usuario.id}/aprovar`), {
        loading: 'Aprovando usuário...',
        success: 'Usuário aprovado com sucesso!',
        error: 'Erro ao aprovar usuário',
      });

      onRefetch();
    } catch (error: any) {
      console.error('Erro ao aprovar usuário:', error);
    }
  };

  // ==========================================================================
  // HANDLER: Bloquear Usuário
  // ==========================================================================

  const handleBloquear = async () => {
    if (!confirm(`Bloquear o usuário ${usuario.nome}? Ele não poderá mais acessar o sistema.`)) return;

    try {
      await toast.promise(api.patch(`/usuarios/${usuario.id}/bloquear`), {
        loading: 'Bloqueando usuário...',
        success: 'Usuário bloqueado com sucesso!',
        error: 'Erro ao bloquear usuário',
      });

      onRefetch();
    } catch (error: any) {
      console.error('Erro ao bloquear usuário:', error);
    }
  };

  // ==========================================================================
  // HANDLER: Desbloquear Usuário
  // ==========================================================================

  const handleDesbloquear = async () => {
    if (!confirm(`Desbloquear o usuário ${usuario.nome}?`)) return;

    try {
      await toast.promise(api.patch(`/usuarios/${usuario.id}/desbloquear`), {
        loading: 'Desbloqueando usuário...',
        success: 'Usuário desbloqueado com sucesso!',
        error: 'Erro ao desbloquear usuário',
      });

      onRefetch();
    } catch (error: any) {
      console.error('Erro ao desbloquear usuário:', error);
    }
  };

  // ==========================================================================
  // HANDLER: Personificar (Acessar como)
  // ==========================================================================

  const handlePersonificar = async () => {
    if (
      !confirm(
        `Você será logado como ${usuario.nome}. Deseja continuar?`
      )
    ) {
      return;
    }

    try {
      const response = await toast.promise(
        api.post(`/usuarios/${usuario.id}/personificar`),
        {
          loading: 'Personificando usuário...',
          success: `Logado como ${usuario.nome}!`,
          error: 'Erro ao personificar usuário',
        }
      );

      // Logar com o novo token (troca de contexto)
      const novoToken = response.data.accessToken;
      await authLogin(novoToken);

      // Redireciona para a home (o authLogin já faz isso, mas garantir)
      window.location.href = '/';
    } catch (error: any) {
      console.error('Erro ao personificar usuário:', error);
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Menu as="div" className="relative inline-block text-left">
      {/* Botão do Menu (Trigger) */}
      <Menu.Button className="inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <MoreHorizontal className="h-5 w-5" />
      </Menu.Button>

      {/* Dropdown */}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-xl bg-white shadow-xl ring-1 ring-black/5 focus:outline-none z-10 overflow-hidden">
          {/* Seção 1: Ações Básicas */}
          <div className="p-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => onEdit(usuario)}
                  className={`${
                    active ? 'bg-indigo-50 text-indigo-900' : 'text-gray-700'
                  } group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors`}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </button>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => onResetSenha(usuario)}
                  className={`${
                    active ? 'bg-amber-50 text-amber-900' : 'text-gray-700'
                  } group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors`}
                >
                  <KeyRound className="h-4 w-4" />
                  Resetar Senha
                </button>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={handlePersonificar}
                  className={`${
                    active ? 'bg-purple-50 text-purple-900' : 'text-gray-700'
                  } group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors`}
                >
                  <UserCheck className="h-4 w-4" />
                  Acessar como
                </button>
              )}
            </Menu.Item>
          </div>

          {/* Seção 2: Ações de Status (Condicionais) */}
          <div className="p-1">
            {/* Aprovar (apenas se PENDENTE) */}
            {usuario.status === 'PENDENTE' && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleAprovar}
                    className={`${
                      active ? 'bg-green-50 text-green-900' : 'text-gray-700'
                    } group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprovar
                  </button>
                )}
              </Menu.Item>
            )}

            {/* Bloquear (apenas se ATIVO) */}
            {usuario.status === 'ATIVO' && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleBloquear}
                    className={`${
                      active ? 'bg-red-50 text-red-900' : 'text-gray-700'
                    } group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors`}
                  >
                    <XCircle className="h-4 w-4" />
                    Bloquear
                  </button>
                )}
              </Menu.Item>
            )}

            {/* Desbloquear (apenas se BLOQUEADO) */}
            {usuario.status === 'BLOQUEADO' && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleDesbloquear}
                    className={`${
                      active ? 'bg-emerald-50 text-emerald-900' : 'text-gray-700'
                    } group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors`}
                  >
                    <Unlock className="h-4 w-4" />
                    Desbloquear
                  </button>
                )}
              </Menu.Item>
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

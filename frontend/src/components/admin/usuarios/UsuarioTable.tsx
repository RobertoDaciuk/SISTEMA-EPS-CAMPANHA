'use client';

/**
 * ============================================================================
 * COMPONENTE: Tabela de Usuários
 * ============================================================================
 *
 * Tabela responsiva para exibir lista de usuários com informações detalhadas.
 *
 * Features:
 * - Design responsivo (mobile-first)
 * - Exibição de avatar, nome, email
 * - Badges coloridos para papel e status
 * - Informações de ótica e gerente
 * - Menu de ações integrado
 *
 * @module UsuarioTable
 * ============================================================================
 */

import { User, Building2, UserCog } from 'lucide-react';
import MenuAcoesUsuario from './MenuAcoesUsuario';

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

interface UsuarioTableProps {
  usuarios: Usuario[];
  onEdit: (user: Usuario) => void;
  onResetSenha: (user: Usuario) => void;
  onRefetch: () => void;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Retorna as cores do badge baseado no papel do usuário
 */
const getPapelColors = (papel: string): string => {
  switch (papel) {
    case 'ADMIN':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'GERENTE':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'VENDEDOR':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

/**
 * Retorna as cores do badge baseado no status do usuário
 */
const getStatusColors = (status: string): string => {
  switch (status) {
    case 'ATIVO':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'PENDENTE':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'BLOQUEADO':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

/**
 * Gera as iniciais do nome para o avatar
 */
const getInitials = (nome: string): string => {
  const parts = nome.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return nome.substring(0, 2).toUpperCase();
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function UsuarioTable({
  usuarios,
  onEdit,
  onResetSenha,
  onRefetch,
}: UsuarioTableProps) {
  // ==========================================================================
  // RENDER: Desktop (Tabela)
  // ==========================================================================

  return (
    <>
      {/* Tabela Desktop (Hidden em Mobile) */}
      <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          {/* Header */}
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
              >
                Usuário
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
              >
                Papel
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
              >
                Ótica
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
              >
                Gerente
              </th>
              <th scope="col" className="relative px-6 py-4">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {usuarios.map((usuario) => (
              <tr
                key={usuario.id}
                className="hover:bg-gray-50 transition-colors"
              >
                {/* Coluna: Usuário (Avatar + Nome + Email) */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {getInitials(usuario.nome)}
                    </div>
                    {/* Nome + Email */}
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {usuario.nome}
                      </div>
                      <div className="text-sm text-gray-500">{usuario.email}</div>
                    </div>
                  </div>
                </td>

                {/* Coluna: Papel */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getPapelColors(
                      usuario.papel
                    )}`}
                  >
                    {usuario.papel}
                  </span>
                </td>

                {/* Coluna: Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColors(
                      usuario.status
                    )}`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        usuario.status === 'ATIVO'
                          ? 'bg-emerald-500'
                          : usuario.status === 'PENDENTE'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    />
                    {usuario.status}
                  </span>
                </td>

                {/* Coluna: Ótica */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {usuario.optica ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span>{usuario.optica.nome}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">N/A</span>
                  )}
                </td>

                {/* Coluna: Gerente */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {usuario.gerente ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <UserCog className="h-4 w-4 text-gray-400" />
                      <span>{usuario.gerente.nome}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">N/A</span>
                  )}
                </td>

                {/* Coluna: Ações */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <MenuAcoesUsuario
                    usuario={usuario}
                    onEdit={onEdit}
                    onResetSenha={onResetSenha}
                    onRefetch={onRefetch}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards Mobile (Visible apenas em Mobile) */}
      <div className="lg:hidden space-y-4">
        {usuarios.map((usuario) => (
          <div
            key={usuario.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            {/* Header do Card */}
            <div className="p-4 border-b border-gray-100 flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar */}
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {getInitials(usuario.nome)}
                </div>
                {/* Nome + Email */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 truncate">
                    {usuario.nome}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">{usuario.email}</p>
                </div>
              </div>
              {/* Menu de Ações */}
              <MenuAcoesUsuario
                usuario={usuario}
                onEdit={onEdit}
                onResetSenha={onResetSenha}
                onRefetch={onRefetch}
              />
            </div>

            {/* Badges: Papel e Status */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getPapelColors(
                  usuario.papel
                )}`}
              >
                {usuario.papel}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColors(
                  usuario.status
                )}`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    usuario.status === 'ATIVO'
                      ? 'bg-emerald-500'
                      : usuario.status === 'PENDENTE'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                />
                {usuario.status}
              </span>
            </div>

            {/* Informações Adicionais */}
            <div className="p-4 space-y-2">
              {/* Ótica */}
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 font-medium">Ótica:</span>
                <span className="text-gray-900 truncate">
                  {usuario.optica?.nome || 'N/A'}
                </span>
              </div>

              {/* Gerente */}
              <div className="flex items-center gap-2 text-sm">
                <UserCog className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 font-medium">Gerente:</span>
                <span className="text-gray-900 truncate">
                  {usuario.gerente?.nome || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

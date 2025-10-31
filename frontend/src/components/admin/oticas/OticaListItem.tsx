'use client';

/**
 * ============================================================================
 * COMPONENTE: Item da Lista de Óticas
 * ============================================================================
 *
 * Componente responsável por renderizar um item individual da lista de óticas.
 * Exibe informações principais e ações disponíveis (Editar, Desativar/Reativar).
 *
 * Features:
 * - Exibição de informações da ótica
 * - Badges para status (Ativa/Inativa)
 * - Badge para tipo (Matriz/Filial)
 * - Ações: Editar, Desativar, Reativar
 * - Responsivo (mobile-first)
 *
 * @module OticaListItem
 * ============================================================================
 */

import { Building2, Edit, Power, MapPin, Network, Phone, Mail } from 'lucide-react';

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

interface OticaListItemProps {
  otica: Optica;
  onEdit: (otica: Optica) => void;
  onToggleAtiva: (id: string, ativa: boolean) => Promise<void>;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Formata CNPJ adicionando pontuação (00.000.000/0000-00)
 */
const formatCNPJ = (cnpj: string): string => {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length === 14) {
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return cnpj;
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function OticaListItem({
  otica,
  onEdit,
  onToggleAtiva,
}: OticaListItemProps) {
  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleToggle = async () => {
    await onToggleAtiva(otica.id, !otica.ativa);
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200">
      {/* Barra de Status (Lateral Esquerda) */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${
          otica.ativa
            ? 'bg-gradient-to-b from-emerald-500 to-green-600'
            : 'bg-gradient-to-b from-gray-400 to-gray-500'
        }`}
      />

      {/* Conteúdo Principal */}
      <div className="p-5 pl-6">
        {/* Header: Nome + Badges */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            {/* Ícone */}
            <div
              className={`flex-shrink-0 rounded-lg p-2.5 ${
                otica.ativa
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
              }`}
            >
              <Building2 className="h-5 w-5 text-white" />
            </div>

            {/* Nome + CNPJ */}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {otica.nome}
              </h3>
              <p className="text-sm font-mono text-gray-500 mt-0.5">
                {formatCNPJ(otica.cnpj)}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {/* Badge: Status Ativa/Inativa */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                otica.ativa
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  otica.ativa ? 'bg-emerald-500' : 'bg-gray-400'
                }`}
              />
              {otica.ativa ? 'Ativa' : 'Inativa'}
            </span>

            {/* Badge: Matriz ou Filial */}
            {otica.ehMatriz ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                <Network className="h-3 w-3" />
                Matriz
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                Filial
              </span>
            )}
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Localização */}
          {(otica.cidade || otica.estado) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">
                {otica.cidade}
                {otica.cidade && otica.estado && ', '}
                {otica.estado}
              </span>
            </div>
          )}

          {/* Telefone */}
          {otica.telefone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{otica.telefone}</span>
            </div>
          )}

          {/* Email */}
          {otica.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-2">
              <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{otica.email}</span>
            </div>
          )}

          {/* Se for Filial, mostrar a Matriz */}
          {!otica.ehMatriz && otica.matriz && (
            <div className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-2">
              <Network className="h-4 w-4 text-purple-500 flex-shrink-0" />
              <span className="truncate">
                <span className="font-medium">Matriz:</span> {otica.matriz.nome}
              </span>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
          {/* Botão: Editar */}
          <button
            onClick={() => onEdit(otica)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Editar
          </button>

          {/* Botão: Desativar/Reativar */}
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              otica.ativa
                ? 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200'
                : 'text-green-700 bg-green-50 hover:bg-green-100 border border-green-200'
            }`}
          >
            <Power className="h-4 w-4" />
            {otica.ativa ? 'Desativar' : 'Reativar'}
          </button>
        </div>
      </div>

      {/* Efeito de Hover (Brilho) */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-blue-50/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}

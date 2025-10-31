"use client";

import { useState, ReactNode } from "react";

/**
 * Interface para os dados de uma Cartela
 */
interface Cartela {
  id: string;
  numeroCartela: number;
  descricao: string;
}

/**
 * Props do componente TabsCampanha
 */
interface TabsCampanhaProps {
  /**
   * Lista de cartelas disponíveis na campanha
   */
  cartelas: Cartela[];
  
  /**
   * Função render prop que recebe o ID da cartela ativa
   * e retorna o conteúdo a ser exibido
   */
  children: (cartelaId: string) => ReactNode;
}

/**
 * Componente de Abas para Cartelas de Campanha
 * 
 * Permite navegação entre diferentes cartelas de uma campanha,
 * exibindo os requisitos e formulários de submissão correspondentes.
 * 
 * Funcionalidades:
 * - Navegação por abas (uma para cada cartela)
 * - Estado ativo visual claro
 * - Render props pattern para flexibilidade de conteúdo
 * - Acessibilidade (ARIA roles e labels)
 * 
 * @example
 * <TabsCampanha cartelas={campanha.cartelas}>
 *   {(cartelaId) => (
 *     <div>Conteúdo da cartela {cartelaId}</div>
 *   )}
 * </TabsCampanha>
 */
export default function TabsCampanha({ cartelas, children }: TabsCampanhaProps) {
  // ========================================
  // ESTADO: Controle da aba ativa
  // ========================================
  const [abaAtiva, setAbaAtiva] = useState<string>(
    cartelas.length > 0 ? cartelas[0].id : ""
  );

  // ========================================
  // VALIDAÇÃO: Cartelas vazias
  // ========================================
  if (cartelas.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-8 text-center">
        <p className="text-muted-foreground">
          Esta campanha não possui cartelas cadastradas.
        </p>
      </div>
    );
  }

  // ========================================
  // RENDERIZAÇÃO
  // ========================================
  return (
    <div className="space-y-4">
      {/* ========================================
          HEADER: Lista de Abas (Tab Buttons)
          ======================================== */}
      <div
        role="tablist"
        aria-label="Cartelas da campanha"
        className="flex flex-wrap gap-2 border-b border-border pb-2"
      >
        {cartelas.map((cartela) => {
          const isAtiva = abaAtiva === cartela.id;
          
          return (
            <button
              key={cartela.id}
              role="tab"
              aria-selected={isAtiva}
              aria-controls={`tabpanel-${cartela.id}`}
              id={`tab-${cartela.id}`}
              onClick={() => setAbaAtiva(cartela.id)}
              className={`
                group relative px-4 py-2.5 rounded-t-lg font-medium 
                transition-all duration-200 focus:outline-none focus:ring-2 
                focus:ring-primary focus:ring-offset-2
                ${
                  isAtiva
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-sm"
                }
              `}
            >
              {/* Texto da aba */}
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  Cartela {cartela.numeroCartela}
                </span>
              </span>

              {/* Indicador visual de aba ativa (linha inferior) */}
              {isAtiva && (
                <span className="absolute bottom-0 left-0 right-0 h-1 bg-primary-foreground/30 rounded-t-sm" />
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================
          CONTEÚDO: Painel da Aba Ativa (Tab Panel)
          ======================================== */}
      <div
        role="tabpanel"
        id={`tabpanel-${abaAtiva}`}
        aria-labelledby={`tab-${abaAtiva}`}
        className="animate-in fade-in-50 duration-200"
      >
        {/* Descrição da cartela ativa */}
        {cartelas.find((c) => c.id === abaAtiva)?.descricao && (
          <div className="mb-4 rounded-lg border border-border/50 bg-card/30 p-4">
            <p className="text-sm text-muted-foreground">
              {cartelas.find((c) => c.id === abaAtiva)?.descricao}
            </p>
          </div>
        )}

        {/* Conteúdo renderizado via render prop */}
        {children(abaAtiva)}
      </div>
    </div>
  );
}

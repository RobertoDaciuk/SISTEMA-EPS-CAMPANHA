/**
 * Skeleton Loader para Card de Requisito
 * 
 * Componente de loading que simula a estrutura do RequisitoCard
 * enquanto os dados estão sendo carregados da API.
 * 
 * Estrutura:
 * - Título (placeholder)
 * - Barra de progresso (placeholder)
 * - Meta/Quantidade (placeholder)
 * - Input de número do pedido (placeholder)
 * - Botão de submissão (placeholder)
 */
export default function SkeletonRequisitoCard() {
  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg"
      aria-label="Carregando requisito..."
    >
      {/* ========================================
          HEADER: Título do Requisito (Placeholder)
          ======================================== */}
      <div className="mb-3">
        {/* Título placeholder */}
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
      </div>

      {/* ========================================
          PROGRESSO: Barra e Meta (Placeholders)
          ======================================== */}
      <div className="mb-4 space-y-2">
        {/* Barra de progresso placeholder */}
        <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
        
        {/* Meta/Quantidade placeholder */}
        <div className="flex items-center justify-between">
          <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/5 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* ========================================
          FORMULÁRIO: Input e Botão (Placeholders)
          ======================================== */}
      <div className="space-y-2">
        {/* Input placeholder */}
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
        
        {/* Botão placeholder */}
        <div className="flex justify-end">
          <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* ========================================
          EFEITO VISUAL: Shimmer Glassmorphism
          ======================================== */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

/**
 * Skeleton Loader para Card de Campanha
 * 
 * Componente de loading que simula a estrutura do CampaignCard
 * enquanto os dados estão sendo carregados da API
 */
export default function SkeletonCampaignCard() {
  return (
    <div className="glass rounded-xl p-5 border border-border/50 animate-pulse">
      {/* Header - Título e Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-6 bg-muted/50 rounded w-3/4 mb-2" />
          <div className="h-4 bg-muted/40 rounded w-full" />
        </div>
        <div className="w-20 h-6 bg-muted/50 rounded-full ml-3" />
      </div>

      {/* Descrição */}
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-muted/40 rounded w-full" />
        <div className="h-3 bg-muted/40 rounded w-5/6" />
      </div>

      {/* Pontos e Valor */}
      <div className="flex items-center space-x-4 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-muted/50 rounded" />
          <div className="h-4 bg-muted/50 rounded w-16" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-muted/50 rounded" />
          <div className="h-4 bg-muted/50 rounded w-20" />
        </div>
      </div>

      {/* Datas */}
      <div className="flex items-center space-x-2 pt-3 border-t border-border/30">
        <div className="w-4 h-4 bg-muted/50 rounded" />
        <div className="h-3 bg-muted/40 rounded w-32" />
      </div>
    </div>
  );
}
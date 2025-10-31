/**
 * ============================================================================
 * PÁGINA DE DETALHES DA CAMPANHA (VISÃO DO VENDEDOR) - REFATORADA
 * ============================================================================
 *
 * Arquitetura Refatorada:
 * - Fonte Única da Verdade: Esta página agora faz uma ÚNICA chamada para a API
 *   no endpoint `GET /api/campanhas/:id/vendedor-view`.
 * - Backend for Frontend (BFF): O backend agora é responsável por toda a lógica
 *   complexa de calcular progresso, status dos requisitos (ATIVO, COMPLETO, BLOQUEADO),
 *   e a lógica de spillover. A resposta da API já contém os dados "hidratados".
 * - Cliente Leve: A complexidade do frontend foi drasticamente reduzida. Os hooks
 *   `useMemo` para calcular status e filtrar envios foram REMOVIDOS. O componente
 *   agora é primariamente declarativo, renderizando os dados que chegam do servidor.
 * - UI Enriquecida: A página agora renderiza os dados completos da campanha,
 *   incluindo imagem, tags, eventos especiais e regras, seguindo o "Design Magnífico".
 *
 * @module Campanhas
 * ============================================================================
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Loader2, AlertCircle, Trophy, ArrowLeft, Sparkles, Tag, FileText } from "lucide-react";
import toast from "react-hot-toast";
import RequisitoCard from "@/components/campanhas/RequisitoCard";
import TabsCampanha from "@/components/campanhas/TabsCampanha";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// TIPOS E INTERFACES (ATUALIZADOS PARA REFLETIR O PAYLOAD DA API)
// ============================================================================

// A interface `EnvioVenda` agora é parte de `RequisitoHidratado`
interface EnvioVenda {
  id: string;
  numeroPedido: string;
  status: "EM_ANALISE" | "VALIDADO" | "REJEITADO" | "CONFLITO_MANUAL";
  dataEnvio: string;
  motivoRejeicao: string | null;
}

// Requisito agora vem "hidratado" com dados de progresso do backend
interface RequisitoHidratado {
  id: string;
  requisitoBaseId: string; // ✅ ID real do requisito para submissão
  descricao: string;
  quantidade: number;
  tipoUnidade: string;
  ordem: number;
  progressoAtual: number; // ✅ Calculado no backend
  enviosPendentes: EnvioVenda[]; // ✅ Filtrado no backend
  status: "ATIVO" | "COMPLETO" | "BLOQUEADO"; // ✅ Calculado no backend
}

interface CartelaHidratada {
  id: string;
  numeroCartela: number;
  descricao: string;
  requisitos: RequisitoHidratado[];
  nomeAba?: string;
}

interface EventoEspecial {
    id: string;
    nome: string;
    multiplicador: number;
    corDestaque: string;
    ativo: boolean;
    dataInicio: string;
    dataFim: string;
}

interface CampanhaCompleta {
  id: string;
  titulo: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  imagemCampanha?: string;
  tags: string[];
  regras?: string;
  cartelas: CartelaHidratada[];
  eventosAtivos: EventoEspecial[];
}

/**
 * [NOVO] Valida se um evento especial está ativo no momento atual (timezone-aware).
 * Garante que mesmo se o backend falhar, o frontend não exibe eventos expirados.
 * 
 * @param evento - Objeto do evento especial
 * @returns true se o evento está ativo agora, false caso contrário
 */
const eventoEstaAtivo = (evento: EventoEspecial): boolean => {
  const agora = new Date();
  const dataInicio = new Date(evento.dataInicio);
  const dataFim = new Date(evento.dataFim);
  
  return evento.ativo && dataInicio <= agora && agora <= dataFim;
};

export default function CampanhaDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const campanhaId = params.id as string;

  const { estaAutenticado, isLoading: isAuthLoading } = useAuth();

  const [campanha, setCampanha] = useState<CampanhaCompleta | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * [REFATORADO] Busca todos os dados da campanha em uma única chamada.
   */
  const buscarDadosCampanha = useCallback(async () => {
    if (!estaAutenticado) return;

    setIsLoadingData(true);
    setError(null);

    try {
      // ÚNICA CHAMADA para o novo endpoint que retorna dados hidratados
      const response = await api.get(`/campanhas/${campanhaId}/vendedor-view`);
      setCampanha(response.data);
    } catch (err: any) {
      console.error("Erro ao buscar dados da campanha:", err);
      if (err.response?.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        router.push("/login");
        return;
      }
      const mensagemErro = err.response?.data?.message || "Erro ao carregar dados da campanha.";
      setError(mensagemErro);
      toast.error(mensagemErro);
    } finally {
      setIsLoadingData(false);
    }
  }, [estaAutenticado, campanhaId, router]);

  /**
   * Efeito para buscar dados quando a autenticação estiver pronta.
   */
  useEffect(() => {
    if (isAuthLoading) return;
    if (!estaAutenticado) {
      toast.error("Você precisa estar autenticado para acessar esta página.");
      router.push("/login");
      return;
    }
    if (campanhaId) {
      buscarDadosCampanha();
    }
  }, [isAuthLoading, estaAutenticado, campanhaId, buscarDadosCampanha, router]);

  /**
   * Callback para o RequisitoCard chamar um refetch dos dados.
   */
  const handleSubmissaoSucesso = () => {
    toast.success('Progresso atualizado!');
    buscarDadosCampanha();
  };

  // Renderização de estados de loading e erro
  if (isAuthLoading || isLoadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">
            {isAuthLoading ? "Verificando autenticação..." : "Carregando dados da campanha..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !campanha) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-destructive">Erro ao Carregar Campanha</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || "A campanha que você está procurando não existe ou foi removida."}
          </p>
          <button
            onClick={() => router.push("/campanhas")}
            className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar para Campanhas
          </button>
        </div>
      </div>
    );
  }

  // Adiciona a aba de Regras dinamicamente se houver regras
  const abas = [...campanha.cartelas];
  if (campanha.regras) {
      abas.push({ id: 'regras', numeroCartela: 999, descricao: 'Regulamento', nomeAba: 'Regulamento', requisitos: [] });
  }

  const eventoAtivo = campanha.eventosAtivos?.find(eventoEstaAtivo);

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6">
      {/* --- HEADER --- */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {/* --- IMAGEM DA CAMPANHA --- */}
        {campanha.imagemCampanha && (
            <div className="relative mb-6 h-48 w-full overflow-hidden rounded-xl shadow-lg">
                <Image 
                    src={campanha.imagemCampanha}
                    alt={`Banner da campanha ${campanha.titulo}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
            </div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">{campanha.titulo}</h1>
                </div>
                <p className="mt-2 text-muted-foreground">{campanha.descricao}</p>
            </div>

            {/* --- EVENTO ESPECIAL ATIVO --- */}
            {eventoAtivo && (
                <div 
                    className="flex-shrink-0 rounded-lg p-3 shadow-md animate-pulse"
                    style={{ backgroundColor: eventoAtivo.corDestaque || '#FF5733' }}
                >
                    <div className="flex items-center gap-2 text-white">
                        <Sparkles className="h-6 w-6" />
                        <div className="text-left">
                            <p className="font-bold text-lg">{eventoAtivo.nome}</p>
                            <p className="text-sm">Prêmios x{Number(eventoAtivo.multiplicador)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- TAGS DA CAMPANHA --- */}
        {campanha.tags && campanha.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {campanha.tags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
            </div>
        )}
      </div>

      {/* --- TABS E CONTEÚDO --- */}
      {abas.length > 0 ? (
        <TabsCampanha cartelas={abas as any}>
          {(cartelaAtivaId) => {
            if (cartelaAtivaId === 'regras') {
                return (
                    <div className="prose prose-invert max-w-none rounded-xl bg-card/50 p-6 backdrop-blur-sm">
                        <h2 className="flex items-center gap-2"><FileText /> Regulamento da Campanha</h2>
                        <div dangerouslySetInnerHTML={{ __html: campanha.regras || '' }} />
                    </div>
                )
            }

            const cartelaAtual = campanha.cartelas.find(c => c.id === cartelaAtivaId);

            if (!cartelaAtual) {
              return <div className="text-center text-muted-foreground">Cartela não encontrada.</div>;
            }

            return (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cartelaAtual.requisitos.map((requisito) => (
                  <RequisitoCard
                    key={requisito.id}
                    requisito={requisito} // O requisito já vem hidratado
                    campanhaId={campanhaId}
                    onSubmissaoSucesso={handleSubmissaoSucesso}
                  />
                ))}
              </div>
            );
          }}
        </TabsCampanha>
      ) : (
        <div className="text-center text-muted-foreground">Esta campanha não possui cartelas.</div>
      )}
    </div>
  );
}

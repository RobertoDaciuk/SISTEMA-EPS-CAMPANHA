"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  Save,
  CheckCircle2,
  Settings,
  Target,
  XCircle,
  AlertTriangle,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";
import UploadPlanilha from "@/components/validacao/UploadPlanilha";
import api from "@/lib/axios";

/**
 * ========================================
 * INTERFACES E TIPOS
 * ========================================
 */

/**
 * Interface para uma campanha disponível para seleção
 */
interface CampanhaParaSelecao {
  id: string;
  titulo: string;
  status: string;
  dataInicio: string;
  dataFim: string;
}

/**
 * Interface para o resultado do processamento retornado pela API
 * Espelha a resposta de POST /api/validacao/processar
 */
interface ResultadoProcessamento {
  mensagem: string;
  totalProcessados: number;
  validado: number;
  rejeitado: number;
  conflito_manual: number;
}

/**
 * Enum dos campos mapeáveis da planilha
 * Estes valores correspondem aos campos esperados pelo backend
 */
const CAMPOS_MAPEAVEIS = {
  IGNORAR: "IGNORAR",
  NUMERO_PEDIDO_OS: "NUMERO_PEDIDO_OS",
  NUMERO_PEDIDO_OPTICLICK: "NUMERO_PEDIDO_OPTICLICK",
  NUMERO_PEDIDO_ONLINE: "NUMERO_PEDIDO_ONLINE",
  NUMERO_PEDIDO_ENVELOPE: "NUMERO_PEDIDO_ENVELOPE",
  DATA_VENDA: "DATA_VENDA",
  NOME_PRODUTO: "NOME_PRODUTO",
  CNPJ_OTICA: "CNPJ_OTICA",
  CPF: "CPF",
  VALOR_VENDA: "VALOR_VENDA",
} as const;

/**
 * Array de opções para os dropdowns de mapeamento
 */
const OPCOES_MAPEAMENTO = [
  { value: CAMPOS_MAPEAVEIS.IGNORAR, label: "Ignorar Coluna", obrigatorio: false },
  {
    value: CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_OS,
    label: "Número Pedido (OS)",
    obrigatorio: false,
    grupo: "numeroPedido",
  },
  {
    value: CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_OPTICLICK,
    label: "Número Pedido (OptiClick)",
    obrigatorio: false,
    grupo: "numeroPedido",
  },
  {
    value: CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_ONLINE,
    label: "Número Pedido (Online)",
    obrigatorio: false,
    grupo: "numeroPedido",
  },
  {
    value: CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_ENVELOPE,
    label: "Número Pedido (Envelope)",
    obrigatorio: false,
    grupo: "numeroPedido",
  },
  {
    value: CAMPOS_MAPEAVEIS.DATA_VENDA,
    label: "Data da Venda *",
    obrigatorio: true,
  },
  {
    value: CAMPOS_MAPEAVEIS.NOME_PRODUTO,
    label: "Nome do Produto *",
    obrigatorio: true,
  },
  {
    value: CAMPOS_MAPEAVEIS.CNPJ_OTICA,
    label: "CNPJ da Ótica *",
    obrigatorio: true,
  },
  { value: CAMPOS_MAPEAVEIS.CPF, label: "CPF (Opcional)", obrigatorio: false },
  {
    value: CAMPOS_MAPEAVEIS.VALOR_VENDA,
    label: "Valor da Venda (Opcional)",
    obrigatorio: false,
  },
];

/**
 * ========================================
 * PÁGINA: Admin - Validação
 * ========================================
 * 
 * Página protegida para ADMIN realizar upload, mapeamento, validação
 * e processamento de planilhas de campanhas.
 * 
 * Funcionalidades:
 * - Upload de planilha (.xlsx, .xls, .csv)
 * - Parsing no cliente com FileReader + xlsx
 * - Mapeamento de colunas com persistência (salvar/carregar)
 * - Seleção de campanha ativa
 * - Modo simulação
 * - Validação para habilitar processamento
 * - Acionamento do "Robô" de validação via API
 * - Exibição de resultados do processamento
 * - Proteção de rota (apenas ADMIN)
 * 
 * Sprint: 17.3 - Admin - Validação (Acionando o Robô)
 * Tarefa: 41
 */
export default function ValidacaoPage() {
  // ========================================
  // HOOKS: Autenticação e Navegação
  // ========================================
  const { usuario, estaAutenticado, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // ========================================
  // ESTADOS: Dados da Planilha
  // ========================================
  const [cabecalhos, setCabecalhos] = useState<string[]>([]);
  const [linhasPreview, setLinhasPreview] = useState<any[]>([]);
  const [linhasCompletas, setLinhasCompletas] = useState<any[]>([]);
  const [arquivoProcessado, setArquivoProcessado] = useState<File | null>(null);

  // ========================================
  // ESTADOS: Mapeamento de Colunas
  // ========================================
  const [mapaColunas, setMapaColunas] = useState<Record<string, string>>({});
  const [isSavingMap, setIsSavingMap] = useState(false);

  // ========================================
  // ESTADOS: Campanhas e Opções
  // ========================================
  const [campanhasDisponiveis, setCampanhasDisponiveis] = useState<
    CampanhaParaSelecao[]
  >([]);
  const [campanhaIdSelecionada, setCampanhaIdSelecionada] = useState("");
  const [ehSimulacao, setEhSimulacao] = useState(true);
  const [isLoadingCampanhas, setIsLoadingCampanhas] = useState(false);

  // ========================================
  // ESTADOS: Processamento (NOVO - Tarefa 41)
  // ========================================
  const [isLoadingProcessamento, setIsLoadingProcessamento] = useState(false);
  const [resultadoProcessamento, setResultadoProcessamento] =
    useState<ResultadoProcessamento | null>(null);

  // ========================================
  // EFEITO: Proteção de Rota (ADMIN)
  // ========================================
  useEffect(() => {
    if (isAuthLoading) return;

    if (!estaAutenticado) {
      toast.error("Você precisa estar autenticado para acessar esta página");
      router.push("/login");
      return;
    }

    if (usuario && usuario.papel !== "ADMIN") {
      toast.error(
        "Acesso negado! Esta página é exclusiva para administradores"
      );
      router.push("/");
      return;
    }
  }, [isAuthLoading, estaAutenticado, usuario, router]);

  // ========================================
  // EFEITO: Buscar Campanhas Ativas
  // ========================================
  useEffect(() => {
    if (!estaAutenticado || !usuario || usuario.papel !== "ADMIN") return;

    const buscarCampanhas = async () => {
      setIsLoadingCampanhas(true);
      try {
        const response = await api.get<CampanhaParaSelecao[]>("/campanhas");
        const campanhasAtivas = response.data.filter(
          (c) => c.status === "ATIVA"
        );
        setCampanhasDisponiveis(campanhasAtivas);
        console.log("📋 Campanhas ativas carregadas:", campanhasAtivas.length);
      } catch (error: any) {
        console.error("❌ Erro ao buscar campanhas:", error);
        toast.error("Erro ao carregar campanhas disponíveis");
      } finally {
        setIsLoadingCampanhas(false);
      }
    };

    buscarCampanhas();
  }, [estaAutenticado, usuario]);

  // ========================================
  // FUNÇÃO: Carregar Mapa Salvo e Iniciar Mapeamento
  // ========================================
  const carregarMapaSalvoEIniciarMapeamento = useCallback(
    async (cabecalhosAtuais: string[]) => {
      try {
        const response = await api.get("/perfil/meu");
        const mapeamentoSalvo = response.data?.mapeamentoPlanilhaSalvo;

        console.log("🗺️ Mapeamento salvo encontrado:", mapeamentoSalvo);

        const mapaInicial: Record<string, string> = {};

        cabecalhosAtuais.forEach((cabecalho) => {
          if (
            mapeamentoSalvo &&
            typeof mapeamentoSalvo === "object" &&
            cabecalho in mapeamentoSalvo
          ) {
            mapaInicial[cabecalho] = (mapeamentoSalvo as any)[cabecalho];
          } else {
            mapaInicial[cabecalho] = CAMPOS_MAPEAVEIS.IGNORAR;
          }
        });

        setMapaColunas(mapaInicial);
        toast.success("Mapeamento anterior carregado com sucesso");
      } catch (error: any) {
        console.error("❌ Erro ao carregar mapeamento salvo:", error);

        const mapaInicial: Record<string, string> = {};
        cabecalhosAtuais.forEach((cabecalho) => {
          mapaInicial[cabecalho] = CAMPOS_MAPEAVEIS.IGNORAR;
        });

        setMapaColunas(mapaInicial);
        toast("Nenhum mapeamento anterior encontrado", { icon: "ℹ️" });
      }
    },
    []
  );

  // ========================================
  // CALLBACK: Planilha Carregada (ATUALIZADO - Tarefa 41)
  // ========================================
  const handlePlanilhaCarregada = useCallback(
    async (cabecalhosExtraidos: string[], linhas: any[], arquivo: File) => {
      // Armazenar cabeçalhos
      setCabecalhos(cabecalhosExtraidos);

      // ✅ CRÍTICO: Armazenar TODAS as linhas (não apenas preview)
      setLinhasCompletas(linhas);

      // Armazenar apenas preview (primeiras 10 linhas)
      setLinhasPreview(linhas.slice(0, 10));

      // Armazenar arquivo original
      setArquivoProcessado(arquivo);

      // Log para debug
      console.log("📊 Planilha carregada:", {
        arquivo: arquivo.name,
        totalLinhas: linhas.length,
        cabecalhos: cabecalhosExtraidos,
        previewLinhas: linhas.slice(0, 10),
      });

      // Carregar mapeamento salvo e inicializar mapa
      await carregarMapaSalvoEIniciarMapeamento(cabecalhosExtraidos);
    },
    [carregarMapaSalvoEIniciarMapeamento]
  );

  // ========================================
  // HANDLER: Mudança de Mapeamento
  // ========================================
  const handleMapChange = useCallback(
    (cabecalho: string, valorSelecionado: string) => {
      setMapaColunas((prev) => ({
        ...prev,
        [cabecalho]: valorSelecionado,
      }));
    },
    []
  );

  // ========================================
  // HANDLER: Salvar Mapeamento
  // ========================================
  const handleSalvarMapeamento = async () => {
    setIsSavingMap(true);

    try {
      await toast.promise(
        api.patch("/perfil/meu", {
          mapeamentoPlanilhaSalvo: mapaColunas,
        }),
        {
          loading: "Salvando mapeamento...",
          success: "Mapeamento salvo com sucesso!",
          error: (err) => {
            console.error("Erro ao salvar mapeamento:", err);
            return "Erro ao salvar mapeamento. Verifique se o backend suporta este campo.";
          },
        }
      );

      console.log("✅ Mapeamento salvo:", mapaColunas);
    } catch (error) {
      console.error("❌ Falha ao salvar mapeamento:", error);
    } finally {
      setIsSavingMap(false);
    }
  };

  // ========================================
  // HANDLER: Limpar Dados (ATUALIZADO - Tarefa 41)
  // ========================================
  const handleLimparDados = () => {
    setCabecalhos([]);
    setLinhasPreview([]);
    setLinhasCompletas([]);
    setArquivoProcessado(null);
    setMapaColunas({});
    setCampanhaIdSelecionada("");
    setResultadoProcessamento(null); // ✅ NOVO: Limpa resultado
    toast.success("Dados limpos com sucesso");
  };

  // ========================================
  // VALIDAÇÃO: Processar Habilitado
  // ========================================
  const isProcessarHabilitado = useMemo(() => {
    if (!campanhaIdSelecionada) return false;

    const valoresMapeados = Object.values(mapaColunas).filter(
      (valor) => valor !== CAMPOS_MAPEAVEIS.IGNORAR
    );

    const temNumeroPedido = valoresMapeados.some((valor) =>
      [
        CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_OS,
        CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_OPTICLICK,
        CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_ONLINE,
        CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_ENVELOPE,
      ].includes(valor as any)
    );

    const camposObrigatorios = [
      CAMPOS_MAPEAVEIS.DATA_VENDA,
      CAMPOS_MAPEAVEIS.NOME_PRODUTO,
      CAMPOS_MAPEAVEIS.CNPJ_OTICA,
    ];

    const todosObrigatoriosMapeados = camposObrigatorios.every((campo) =>
      valoresMapeados.includes(campo)
    );

    return temNumeroPedido && todosObrigatoriosMapeados;
  }, [campanhaIdSelecionada, mapaColunas]);

  // ========================================
  // HANDLER: Processar Planilha (IMPLEMENTADO - Tarefa 41)
  // ========================================
  /**
   * Aciona o "Robô" de validação via POST /api/validacao/processar
   * 
   * Envia:
   * - campanhaId: ID da campanha selecionada
   * - ehSimulacao: true/false (define se altera dados reais)
   * - mapaColunas: Mapa de colunas cabeçalho->campo_sistema
   * - linhasPlanilha: TODAS as linhas da planilha (não apenas preview)
   * 
   * Recebe:
   * - ResultadoProcessamento (mensagem, totalProcessados, validado, rejeitado, conflito_manual)
   */
  const handleProcessarPlanilha = async () => {
    // Limpa resultado anterior
    setResultadoProcessamento(null);
    setIsLoadingProcessamento(true);

    // ========================================
    // MONTAR PAYLOAD
    // ========================================
    const payload = {
      campanhaId: campanhaIdSelecionada,
      ehSimulacao: ehSimulacao,
      mapaColunas: mapaColunas,
      linhasPlanilha: linhasCompletas, // ✅ CRÍTICO: Envia TODAS as linhas
    };

    console.log("🚀 Enviando payload para processamento:", {
      campanhaId: payload.campanhaId,
      ehSimulacao: payload.ehSimulacao,
      totalLinhas: payload.linhasPlanilha.length,
      mapaColunas: payload.mapaColunas,
    });

    // ========================================
    // CHAMAR API COM TOAST.PROMISE
    // ========================================
    try {
      const promise = api.post<ResultadoProcessamento>(
        "/validacao/processar",
        payload
      );

      toast.promise(promise, {
        loading: `Processando ${linhasCompletas.length} linhas... ${
          ehSimulacao ? "(Simulação)" : "(Modo Real)"
        }`,
        success: (response) => {
          setResultadoProcessamento(response.data);
          return response.data.mensagem || "Processamento concluído!";
        },
        error: (err) => {
          console.error("❌ Erro no processamento:", err);
          return (
            err.response?.data?.message ||
            "Erro desconhecido durante o processamento."
          );
        },
      });

      await promise; // Aguarda resolução para o finally
    } catch (error) {
      // Erro já tratado pelo toast.promise
      console.error("❌ Falha no processamento:", error);
    } finally {
      setIsLoadingProcessamento(false);
    }
  };

  // ========================================
  // RENDERIZAÇÃO: Loading de Autenticação
  // ========================================
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600 font-medium">
            Verificando permissões...
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDERIZAÇÃO: Página Principal
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* CABEÇALHO DA PÁGINA */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileSpreadsheet className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Validação de Campanhas
            </h1>
          </div>
          <p className="text-gray-600">
            Faça upload da planilha de campanha para validação e processamento
          </p>
        </div>

        {/* CARD: Upload de Planilha */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
              1
            </span>
            Upload da Planilha
          </h2>
          <UploadPlanilha onPlanilhaCarregada={handlePlanilhaCarregada} />
        </div>

        {/* CARD: Informações da Planilha */}
        {arquivoProcessado && cabecalhos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                  2
                </span>
                Informações da Planilha
              </h2>
              <button
                onClick={handleLimparDados}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Limpar Dados
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium mb-1">
                  Arquivo
                </p>
                <p className="text-lg font-bold text-blue-900 truncate">
                  {arquivoProcessado.name}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium mb-1">
                  Total de Linhas
                </p>
                <p className="text-lg font-bold text-green-900">
                  {linhasCompletas.length.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600 font-medium mb-1">
                  Colunas
                </p>
                <p className="text-lg font-bold text-purple-900">
                  {cabecalhos.length}
                </p>
              </div>
            </div>

            {/* SEÇÃO: Cabeçalhos */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Cabeçalhos Identificados
              </h3>
              <div className="flex flex-wrap gap-2">
                {cabecalhos.map((cabecalho, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full border border-indigo-200"
                  >
                    {cabecalho || `(Coluna ${index + 1})`}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CARD: Pré-visualização dos Dados */}
        {linhasPreview.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                  3
                </span>
                Pré-visualização dos Dados
              </h2>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                Primeiras 10 linhas
              </span>
            </div>

            {/* ALERTA: Preview Limitado */}
            <div className="mb-4 flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Visualização Limitada
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Exibindo apenas as 10 primeiras linhas de{" "}
                  {linhasCompletas.length} linhas totais. A validação completa
                  processará todos os dados.
                </p>
              </div>
            </div>

            {/* TABELA: Preview dos Dados */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      #
                    </th>
                    {cabecalhos.map((cabecalho, index) => (
                      <th
                        key={index}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                      >
                        {cabecalho || `Coluna ${index + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {linhasPreview.map((linha, linhaIndex) => (
                    <tr
                      key={linhaIndex}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-500 border-r border-gray-200">
                        {linhaIndex + 1}
                      </td>
                      {cabecalhos.map((cabecalho, colIndex) => {
                        const valor = linha[cabecalho];
                        return (
                          <td
                            key={colIndex}
                            className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0"
                          >
                            {valor !== undefined &&
                            valor !== null &&
                            valor !== ""
                              ? String(valor)
                              : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* RODAPÉ: Contador de Linhas */}
            <div className="mt-4 text-sm text-gray-500 text-center">
              Exibindo linhas 1-{linhasPreview.length} de{" "}
              {linhasCompletas.length} linhas totais
            </div>
          </div>
        )}

        {/* CARD: Mapeamento de Colunas */}
        {cabecalhos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                  4
                </span>
                Mapeamento de Colunas
              </h2>
              <button
                onClick={handleSalvarMapeamento}
                disabled={isSavingMap || Object.keys(mapaColunas).length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {isSavingMap ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Mapeamento
                  </>
                )}
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Associe cada coluna da planilha ao campo correspondente do
              sistema. Campos marcados com{" "}
              <span className="text-red-600 font-bold">*</span> são
              obrigatórios.
            </p>

            {/* TABELA: Mapeamento */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Coluna da Planilha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Exemplo (1ª linha)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Mapear Para
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cabecalhos.map((cabecalho, index) => {
                    const exemplo = linhasPreview[0]?.[cabecalho];
                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {cabecalho || `(Coluna ${index + 1})`}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {exemplo !== undefined &&
                          exemplo !== null &&
                          exemplo !== ""
                            ? String(exemplo)
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={
                              mapaColunas[cabecalho] || CAMPOS_MAPEAVEIS.IGNORAR
                            }
                            onChange={(e) =>
                              handleMapChange(cabecalho, e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          >
                            {OPCOES_MAPEAMENTO.map((opcao) => (
                              <option key={opcao.value} value={opcao.value}>
                                {opcao.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* LEGENDA: Campos Obrigatórios */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                📋 Requisitos de Mapeamento:
              </h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>
                  • <span className="font-bold">Número do Pedido:</span> Pelo
                  menos um dos campos de número de pedido deve ser mapeado
                </li>
                <li>
                  • <span className="font-bold">Data da Venda:</span> Campo
                  obrigatório
                </li>
                <li>
                  • <span className="font-bold">Nome do Produto:</span> Campo
                  obrigatório
                </li>
                <li>
                  • <span className="font-bold">CNPJ da Ótica:</span> Campo
                  obrigatório
                </li>
                <li>
                  • <span className="font-bold">CPF e Valor:</span> Campos
                  opcionais
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* CARD: Seleção de Campanha */}
        {cabecalhos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                5
              </span>
              Selecionar Campanha
            </h2>

            <div className="space-y-4">
              {/* Dropdown de Campanhas */}
              <div>
                <label
                  htmlFor="campanha-select"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Campanha Ativa <span className="text-red-600">*</span>
                </label>
                {isLoadingCampanhas ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Carregando campanhas...</span>
                  </div>
                ) : (
                  <select
                    id="campanha-select"
                    value={campanhaIdSelecionada}
                    onChange={(e) => setCampanhaIdSelecionada(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Selecione uma campanha...</option>
                    {campanhasDisponiveis.map((campanha) => (
                      <option key={campanha.id} value={campanha.id}>
                        {campanha.titulo}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Informações da Campanha Selecionada */}
              {campanhaIdSelecionada && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-semibold text-green-900">
                      Campanha Selecionada
                    </p>
                  </div>
                  <p className="text-xs text-green-800">
                    {
                      campanhasDisponiveis.find(
                        (c) => c.id === campanhaIdSelecionada
                      )?.titulo
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CARD: Opções de Processamento */}
        {cabecalhos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                6
              </span>
              Opções de Processamento
            </h2>

            <div className="space-y-4">
              {/* Checkbox Modo Simulação */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="modo-simulacao"
                  checked={ehSimulacao}
                  onChange={(e) => setEhSimulacao(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <label
                    htmlFor="modo-simulacao"
                    className="text-sm font-medium text-gray-900 cursor-pointer"
                  >
                    Modo Simulação
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Quando ativado, a planilha será processada apenas para
                    validação, sem alterar dados reais no sistema. Use para
                    testar o mapeamento antes do processamento final.
                  </p>
                </div>
              </div>

              {/* Indicador Visual do Modo */}
              {ehSimulacao ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-yellow-600" />
                    <p className="text-xs font-medium text-yellow-800">
                      Modo Simulação Ativo - Nenhum dado será alterado
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-xs font-medium text-red-800">
                      Modo Real Ativo - Os dados serão processados e gravados no
                      sistema
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CARD: Ação Final - Processar */}
        {cabecalhos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                7
              </span>
              Processar Planilha
            </h2>

            {/* Status de Validação */}
            {!isProcessarHabilitado && (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800 mb-1">
                      Requisitos Pendentes
                    </p>
                    <ul className="text-xs text-orange-700 space-y-1">
                      {!campanhaIdSelecionada && (
                        <li>• Selecione uma campanha ativa</li>
                      )}
                      {!Object.values(mapaColunas).some((valor) =>
                        [
                          CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_OS,
                          CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_OPTICLICK,
                          CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_ONLINE,
                          CAMPOS_MAPEAVEIS.NUMERO_PEDIDO_ENVELOPE,
                        ].includes(valor as any)
                      ) && <li>• Mapeie pelo menos um campo de Número do Pedido</li>}
                      {!Object.values(mapaColunas).includes(
                        CAMPOS_MAPEAVEIS.DATA_VENDA
                      ) && <li>• Mapeie o campo Data da Venda</li>}
                      {!Object.values(mapaColunas).includes(
                        CAMPOS_MAPEAVEIS.NOME_PRODUTO
                      ) && <li>• Mapeie o campo Nome do Produto</li>}
                      {!Object.values(mapaColunas).includes(
                        CAMPOS_MAPEAVEIS.CNPJ_OTICA
                      ) && <li>• Mapeie o campo CNPJ da Ótica</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Botão Processar (ATUALIZADO - Tarefa 41) */}
            <button
              onClick={handleProcessarPlanilha}
              disabled={!isProcessarHabilitado || isLoadingProcessamento}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              {isLoadingProcessamento ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Processando {linhasCompletas.length} linhas...
                </>
              ) : (
                <>
                  <Target className="w-6 h-6" />
                  {isProcessarHabilitado
                    ? `Processar ${linhasCompletas.length} Linhas`
                    : "Configure todos os requisitos acima"}
                </>
              )}
            </button>

            {isProcessarHabilitado && !isLoadingProcessamento && (
              <p className="mt-3 text-xs text-center text-gray-500">
                ✅ Todos os requisitos foram atendidos. Clique para processar a
                planilha.
              </p>
            )}
          </div>
        )}

        {/* ========================================
            CARD: RESULTADOS DO PROCESSAMENTO (NOVO - Tarefa 41)
            ======================================== */}
        {resultadoProcessamento && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Resultados do Processamento
                </h2>
                <p className="text-sm text-gray-600">
                  {resultadoProcessamento.mensagem}
                </p>
              </div>
            </div>

            {/* GRID DE ESTATÍSTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Total Processados */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-700">
                    Total Processados
                  </p>
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-900">
                  {resultadoProcessamento.totalProcessados.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-blue-600 mt-1">linhas da planilha</p>
              </div>

              {/* Validados */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-700">
                    ✅ Validados
                  </p>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-900">
                  {resultadoProcessamento.validado.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {resultadoProcessamento.totalProcessados > 0
                    ? `${(
                        (resultadoProcessamento.validado /
                          resultadoProcessamento.totalProcessados) *
                        100
                      ).toFixed(1)}%`
                    : "0%"}{" "}
                  do total
                </p>
              </div>

              {/* Rejeitados */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border border-red-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-red-700">
                    ❌ Rejeitados
                  </p>
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-3xl font-bold text-red-900">
                  {resultadoProcessamento.rejeitado.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {resultadoProcessamento.totalProcessados > 0
                    ? `${(
                        (resultadoProcessamento.rejeitado /
                          resultadoProcessamento.totalProcessados) *
                        100
                      ).toFixed(1)}%`
                    : "0%"}{" "}
                  do total
                </p>
              </div>

              {/* Conflitos Manuais */}
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl border border-yellow-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-yellow-700">
                    ⚠️ Conflitos
                  </p>
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-3xl font-bold text-yellow-900">
                  {resultadoProcessamento.conflito_manual.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  {resultadoProcessamento.totalProcessados > 0
                    ? `${(
                        (resultadoProcessamento.conflito_manual /
                          resultadoProcessamento.totalProcessados) *
                        100
                      ).toFixed(1)}%`
                    : "0%"}{" "}
                  do total
                </p>
              </div>
            </div>

            {/* INFORMAÇÕES ADICIONAIS */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                ℹ️ Informações Detalhadas:
              </h3>
              <ul className="text-xs text-gray-700 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Validados:</strong> Envios que atenderam a todos os
                    requisitos (CNPJ, regras, sem conflitos). {ehSimulacao ? "Em modo simulação, nenhum dado foi alterado." : "Foram processados e recompensas foram atribuídas."}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Rejeitados:</strong> Envios que falharam em alguma
                    validação (CNPJ inválido, regras não atendidas, pedido não
                    encontrado na planilha).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Conflitos Manuais:</strong> Envios que requerem
                    análise manual (ex: mesmo pedido validado por dois vendedores
                    diferentes).
                  </span>
                </li>
              </ul>
            </div>

            {/* AÇÕES FUTURAS */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleLimparDados}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Nova Validação
              </button>
              <button
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                onClick={() => toast("Funcionalidade em desenvolvimento", { icon: "🚧" })}
              >
                Ver Detalhes no Histórico
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

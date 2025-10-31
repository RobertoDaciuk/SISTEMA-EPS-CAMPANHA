"use client";

import { useState, useMemo, FormEvent } from "react";
import { Send, Loader2, Target, Clock, CheckCircle, XCircle, Check, Lock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/axios";
import toast from "react-hot-toast";

/**
 * ============================================================================
 * TIPOS E INTERFACES
 * ============================================================================
 */

/**
 * Tipo para o status calculado de um requisito em uma cartela específica
 * (Sprint 16.5 - Tarefa 38.5)
 */
type StatusRequisito = "ATIVO" | "COMPLETO" | "BLOQUEADO";

/**
 * Interface para Condição de um Requisito
 */
interface Condicao {
  id: string;
  campo: string;
  operador: string;
  valor: string;
  requisitoId: string;
}

/**
 * Interface para Requisito de uma Cartela
 * (ATUALIZADO Sprint 16.5: Agora inclui regraCartela)
 */
interface Requisito {
  id: string;
  descricao: string;
  quantidade: number;
  tipoUnidade: string;
  ordem: number;
  condicoes: Condicao[];
  regraCartela: {
    numeroCartela: number;
  };
}

/**
 * Interface para Envio de Venda (Histórico do Vendedor)
 * (ATUALIZADO Sprint 16.5: Novo status CONFLITO_MANUAL)
 */
interface EnvioVenda {
  id: string;
  numeroPedido: string;
  status: "EM_ANALISE" | "VALIDADO" | "REJEITADO" | "CONFLITO_MANUAL";
  dataEnvio: string;
  dataValidacao: string | null;
  motivoRejeicao: string | null;
  requisitoId: string;
  numeroCartelaAtendida: number | null;
}

/**
 * Props do componente RequisitoCard
 * (ATUALIZADO Sprint 16.5: Nova prop status, numeroCartelaAtual e idsRequisitosRelacionados)
 */
interface RequisitoCardProps {
  /**
   * Dados completos do requisito a ser exibido
   */
  requisito: Requisito;

  /**
   * ID da campanha (necessário para envio da venda)
   */
  campanhaId: string;

  /**
   * Lista de envios do vendedor autenticado (para esta campanha)
   * Usada para calcular progresso e exibir histórico
   */
  meusEnvios: EnvioVenda[];

  /**
   * Callback chamado após submissão bem-sucedida
   * Dispara refetch dos envios na página pai
   */
  onSubmissaoSucesso: () => void;

  /**
   * Status calculado do requisito (ATIVO, COMPLETO, BLOQUEADO)
   * (Sprint 16.5 - Tarefa 38.5)
   */
  status: StatusRequisito;

  /**
   * Número da cartela atual a qual este requisito pertence
   * (Sprint 16.5 - Correção de Bug: numeroCartelaAtual)
   * OBRIGATÓRIO: Usado para filtrar envios corretos (previne spillover)
   */
  numeroCartelaAtual: number;

  /**
   * Array de IDs de todos os requisitos relacionados (mesma ordem, cartelas diferentes)
   * (Sprint 16.5 - CORREÇÃO CRÍTICA DE SPILLOVER)
   *
   * PROBLEMA:
   * - Requisitos de cartelas diferentes têm IDs diferentes (uuid-1a, uuid-2a, uuid-3a)
   * - Envios apontam para o requisitoId da primeira cartela
   * - Filtro por requisitoId único não encontra spillover
   *
   * SOLUÇÃO:
   * - Page.tsx cria mapa de requisitos agrupados por ordem
   * - Passa array de TODOS os IDs relacionados [uuid-1a, uuid-2a, uuid-3a]
   * - RequisitoCard filtra envios usando .includes() em vez de ===
   *
   * Exemplo:
   * - Requisito "Lentes BlueProtect" (ordem 1) nas 3 cartelas
   * - idsRequisitosRelacionados = [uuid-cartela1-req1, uuid-cartela2-req1, uuid-cartela3-req1]
   */
  idsRequisitosRelacionados: string[];
}

/**
 * ============================================================================
 * COMPONENTE: RequisitoCard
 * ============================================================================
 *
 * Card Interativo de Requisito com Formulário de Submissão
 *
 * Exibe um requisito da campanha e permite ao vendedor
 * submeter números de pedido para validação e gamificação.
 *
 * Funcionalidades:
 * - Exibe descrição, meta (quantidade) e tipo de unidade
 * - Calcula e exibe progresso REAL baseado em envios validados
 * - Barra de progresso visual com percentual
 * - Formulário de submissão de número de pedido
 * - Lista de histórico de envios (status, ícones, cores, motivo)
 * - Estados de loading durante submissão
 * - Feedback visual com toast (sucesso/erro)
 * - Refetch automático após submissão bem-sucedida
 * - Validação básica de input
 * - Integração com API POST /api/envios-venda
 *
 * Refatorações Implementadas (Sprint 16.2):
 * - Filtro de envios por requisito (useMemo)
 * - Cálculo de progresso real (count de VALIDADO)
 * - Renderização de lista de histórico com status visual
 * - Callback de refetch após submissão
 *
 * Refatorações Implementadas (Sprint 16.5 - Tarefa 38.5):
 * - Carimbos visuais (COMPLETO, BLOQUEADO)
 * - Formulário desabilitado para status !== ATIVO
 * - Histórico filtrado (Spillover) baseado no status
 * - Suporte para status CONFLITO_MANUAL
 */
export default function RequisitoCard({
  requisito,
  campanhaId,
  meusEnvios,
  onSubmissaoSucesso,
  status, // NOVA PROP (Sprint 16.5 - Tarefa 38.5)
  numeroCartelaAtual, // NOVA PROP (Sprint 16.5 - Correção Bug)
  idsRequisitosRelacionados, // NOVA PROP (Sprint 16.5 - CORREÇÃO CRÍTICA SPILLOVER)
}: RequisitoCardProps) {
  // ========================================
  // ESTADO: Formulário e Loading
  // ========================================
  const [numeroPedido, setNumeroPedido] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ========================================
  // MEMO: Filtro de Envios deste Requisito (CORREÇÃO CRÍTICA SPILLOVER)
  // ========================================
  /**
   * Filtra a lista completa de envios (meusEnvios) para obter
   * apenas os envios relacionados a ESTE requisito específico.
   *
   * CORREÇÃO SPILLOVER (Sprint 16.5):
   * - ANTES: Filtrava apenas por requisito.id (não encontrava spillover)
   * - DEPOIS: Filtra por QUALQUER ID da lista idsRequisitosRelacionados
   *
   * Exemplo:
   * - Requisito "Lentes" (ordem 1) tem IDs [uuid-1a, uuid-2a, uuid-3a]
   * - Envio #1 tem requisitoId = uuid-1a (Cartela 1)
   * - Envio #3 (spillover) tem requisitoId = uuid-1a (mas numeroCartelaAtendida = 2)
   * - Card da Cartela 2 (uuid-2a) agora ENCONTRA o envio #3 porque uuid-1a está na lista!
   *
   * Usa useMemo para evitar recálculo em cada render.
   * Recalcula quando meusEnvios ou idsRequisitosRelacionados mudam.
   */
  const enviosDoRequisito = useMemo(() => {
    return meusEnvios.filter((envio) =>
      idsRequisitosRelacionados.includes(envio.requisitoId) // ✅ CORRIGIDO!
    );
  }, [meusEnvios, idsRequisitosRelacionados]);

  // ========================================
  // MEMO: Cálculo de Progresso Real (Refinado - Sprint 16.5)
  // ========================================
  /**
   * Conta quantos envios deste requisito estão com status VALIDADO
   * E com numeroCartelaAtendida correspondente à cartela ATUAL.
   * Este é o progresso REAL (não placeholder).
   *
   * IMPORTANTE (Sprint 16.5):
   * - Só conta validados DESTA cartela específica (previne spillover)
   * - Usa numeroCartelaAtual passado como prop (correção de bug)
   *
   * Usa useMemo para performance.
   */
  const progressoAtual = useMemo(() => {
    return enviosDoRequisito.filter(
      (envio) =>
        envio.status === "VALIDADO" &&
        envio.numeroCartelaAtendida === numeroCartelaAtual
    ).length;
  }, [enviosDoRequisito, numeroCartelaAtual]);

  /**
   * Calcula o percentual de progresso para a barra visual.
   * Ex: 1 validado de 2 requisitados = 50%
   */
  const progressoPercentual = (progressoAtual / requisito.quantidade) * 100;

  // ========================================
  // MEMO: Envios Exibidos (Filtro de Spillover - Sprint 16.5 - REFINADO)
  // ========================================
  /**
   * Filtra os envios a serem exibidos no histórico baseado no status.
   *
   * Lógica (Sprint 16.5 - Tarefa 38.5 - LÓGICA COMPLETA DE SPILLOVER):
   *
   * Se COMPLETO:
   * - Mostra APENAS os validados que completaram ESTA cartela
   * - Ordena por data de validação (mais recentes primeiro)
   *
   * Se ATIVO ou BLOQUEADO:
   * - Mostra TODOS os não-validados (spillover de qualquer cartela):
   *   - EM_ANALISE (numeroCartelaAtendida === null)
   *   - REJEITADO (numeroCartelaAtendida === null)
   *   - CONFLITO_MANUAL (numeroCartelaAtendida === null)
   * - + Mostra validados DESTA cartela (e cartelas futuras, caso raro)
   * - Ordena por data de envio (mais recentes primeiro)
   *
   * Exemplo Prático:
   * - Vendedor submete #1, #2, #3 para Requisito A (Cartela 1 precisa de 2)
   * - Admin valida #1 → numeroCartelaAtendida: 1 (conta para Cartela 1)
   * - Admin valida #2 → numeroCartelaAtendida: 1 (conta para Cartela 1, COMPLETA!)
   * - Admin valida #3 → numeroCartelaAtendida: 2 (spillover, conta para Cartela 2)
   *
   * UI Resultante:
   * - Card A (Cartela 1, status COMPLETO): Mostra APENAS #1 e #2 (validados desta cartela)
   * - Card A (Cartela 2, status ATIVO): Mostra #3 (validado desta cartela)
   *
   * Recalcula quando enviosDoRequisito, status ou numeroCartelaAtual mudam.
   */
  const enviosExibidos = useMemo(() => {
    // Log para depuração
    console.log(
      `RequisitoCard (${requisito.descricao}, Cartela ${numeroCartelaAtual}): Status=${status}, Total Envios=${enviosDoRequisito.length}`
    );

    if (status === "COMPLETO") {
      // Mostra APENAS os validados que completaram ESTA cartela
      const filtrados = enviosDoRequisito.filter(
        (e) =>
          e.status === "VALIDADO" &&
          e.numeroCartelaAtendida === numeroCartelaAtual
      );
      console.log("Filtrados (COMPLETO):", filtrados);

      // Ordena por data de validação (mais recentes primeiro)
      return filtrados.sort(
        (a, b) =>
          new Date(b.dataValidacao || b.dataEnvio).getTime() -
          new Date(a.dataValidacao || a.dataEnvio).getTime()
      );
    } else {
      // ATIVO ou BLOQUEADO: Mostra TODOS os não-validados (spillover) + validados desta cartela
      const filtrados = enviosDoRequisito.filter(
        (e) =>
          e.numeroCartelaAtendida === null || // Mantém EM_ANALISE, REJEITADO, CONFLITO_MANUAL (spillover)
          e.numeroCartelaAtendida >= numeroCartelaAtual // Mantém VALIDADO desta cartela ou futuras (caso raro)
      );
      console.log("Filtrados (ATIVO/BLOQ):", filtrados);

      // Ordena por data de envio (mais recentes primeiro)
      return filtrados.sort(
        (a, b) =>
          new Date(b.dataEnvio).getTime() - new Date(a.dataEnvio).getTime()
      );
    }
  }, [enviosDoRequisito, status, numeroCartelaAtual, requisito.descricao]);

  // ========================================
  // HANDLER: Submissão do Formulário
  // ========================================
  /**
   * Envia o número do pedido para validação no backend.
   *
   * Fluxo:
   * 1. Valida input (não vazio)
   * 2. Ativa loading
   * 3. Faz POST /api/envios-venda
   * 4. Exibe toast de sucesso
   * 5. Limpa input
   * 6. **CHAMA CALLBACK onSubmissaoSucesso()** para refetch
   * 7. Desativa loading
   * 8. Tratamento de erros com toast
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!numeroPedido.trim()) {
      toast.error("Por favor, informe o número do pedido.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Chamada à API de envio de vendas
      await api.post("/envios-venda", {
        numeroPedido: numeroPedido.trim(),
        campanhaId,
        requisitoId: requisito.id,
      });

      // Feedback de sucesso
      toast.success(`Pedido '${numeroPedido}' submetido para validação! 🎯`);

      // Limpa o input após sucesso
      setNumeroPedido("");

      // **REFETCH**: Chama callback para atualizar lista de envios na página pai
      onSubmissaoSucesso();
    } catch (error: any) {
      // Tratamento de erros da API
      const mensagemErro =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Erro ao submeter pedido. Tente novamente.";
      toast.error(mensagemErro);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================
  // HELPER: Ícone de Status do Envio (Atualizado - Sprint 16.5)
  // ========================================
  /**
   * Retorna o ícone apropriado para cada status de envio.
   * (ATUALIZADO Sprint 16.5: Adicionado CONFLITO_MANUAL)
   */
  const getIconeStatus = (status: EnvioVenda["status"]) => {
    switch (status) {
      case "EM_ANALISE":
        return <Clock className="h-4 w-4" />;
      case "VALIDADO":
        return <CheckCircle className="h-4 w-4" />;
      case "REJEITADO":
        return <XCircle className="h-4 w-4" />;
      case "CONFLITO_MANUAL":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // ========================================
  // HELPER: Estilo de Status do Envio (Atualizado - Sprint 16.5)
  // ========================================
  /**
   * Retorna as classes CSS apropriadas para cada status de envio.
   * (ATUALIZADO Sprint 16.5: Adicionado CONFLITO_MANUAL)
   */
  const getEstiloStatus = (status: EnvioVenda["status"]) => {
    switch (status) {
      case "EM_ANALISE":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";
      case "VALIDADO":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
      case "REJEITADO":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
      case "CONFLITO_MANUAL":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
      default:
        return "";
    }
  };

  // ========================================
  // HELPER: Texto de Status do Envio (Atualizado - Sprint 16.5)
  // ========================================
  /**
   * Retorna o texto legível para cada status de envio.
   * (ATUALIZADO Sprint 16.5: Adicionado CONFLITO_MANUAL)
   */
  const getTextoStatus = (status: EnvioVenda["status"]) => {
    switch (status) {
      case "EM_ANALISE":
        return "Em Análise";
      case "VALIDADO":
        return "Validado";
      case "REJEITADO":
        return "Rejeitado";
      case "CONFLITO_MANUAL":
        return "Conflito";
      default:
        return status;
    }
  };

  // ========================================
  // RENDERIZAÇÃO
  // ========================================
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md">
      {/* ========================================
          CARIMBOS VISUAIS (COMPLETO, BLOQUEADO) - COM ANIMAÇÃO
          (Sprint 16.5 - Tarefa 38.5 - REFINADO)
          ======================================== */}
      <AnimatePresence>
        {status !== "ATIVO" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm"
          >
            {status === "COMPLETO" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                className="flex flex-col items-center gap-2 rounded-lg bg-green-500/90 px-8 py-6 text-white shadow-lg"
              >
                <Check className="h-12 w-12" />
                <span className="text-lg font-bold">Completo</span>
              </motion.div>
            )}
            {status === "BLOQUEADO" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                className="flex flex-col items-center gap-2 rounded-lg bg-gray-500/90 px-8 py-6 text-white shadow-lg"
              >
                <Lock className="h-12 w-12" />
                <span className="text-lg font-bold">Bloqueado</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6">
        {/* ========================================
            HEADER: Título e Ordem do Requisito
            ======================================== */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold leading-tight text-foreground">
              {requisito.descricao}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Requisito #{requisito.ordem}
            </p>
          </div>
          {/* Ícone decorativo */}
          <Target className="h-5 w-5 flex-shrink-0 text-primary opacity-70" />
        </div>

        {/* ========================================
            PROGRESSO: Barra e Meta (REAL)
            ======================================== */}
        <div className="mb-4 space-y-2">
          {/* Barra de progresso */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(progressoPercentual, 100)}%` }}
            />
          </div>

          {/* Meta e Unidade */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {progressoAtual} / {requisito.quantidade}
            </span>
            <span className="text-muted-foreground">
              {requisito.tipoUnidade}
            </span>
          </div>
        </div>

        {/* ========================================
            FORMULÁRIO: Submissão de Número de Pedido
            (Desabilitado se status !== ATIVO ou se já está COMPLETO)
            (Sprint 16.5 - Tarefa 38.5)
            ======================================== */}
        {status !== "COMPLETO" && (
          <form onSubmit={handleSubmit} className="mb-4 space-y-3">
            {/* Input de número do pedido */}
            <div>
              <label
                htmlFor={`pedido-${requisito.id}`}
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Número do Pedido
              </label>
              <input
                id={`pedido-${requisito.id}`}
                type="text"
                placeholder="Ex: 12345"
                value={numeroPedido}
                onChange={(e) => setNumeroPedido(e.target.value)}
                disabled={status !== "ATIVO" || isSubmitting}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Botão de submissão */}
            <button
              type="submit"
              disabled={status !== "ATIVO" || isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submeter
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================
            HISTÓRICO: Lista de Envios do Requisito
            (Filtrado - Sprint 16.5 - Tarefa 38.5)
            ======================================== */}
        {enviosExibidos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Histórico de Envios
            </h4>
            <div className="space-y-2">
              {enviosExibidos.map((envio) => (
                <div
                  key={envio.id}
                  className={`rounded-lg border p-3 transition-colors ${getEstiloStatus(
                    envio.status
                  )}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Coluna Esquerda: Número do Pedido */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {envio.numeroPedido}
                      </p>

                      {/* Motivo de Rejeição (se houver) */}
                      {envio.status === "REJEITADO" && envio.motivoRejeicao && (
                        <p className="mt-1 text-xs opacity-90">
                          {envio.motivoRejeicao}
                        </p>
                      )}

                      {/* Motivo de Conflito (se houver) */}
                      {envio.status === "CONFLITO_MANUAL" &&
                        envio.motivoRejeicao && (
                          <p className="mt-1 text-xs opacity-90">
                            {envio.motivoRejeicao}
                          </p>
                        )}
                    </div>

                    {/* Coluna Direita: Status com Ícone */}
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {getIconeStatus(envio.status)}
                      <span className="text-xs font-medium">
                        {getTextoStatus(envio.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================
          EFEITO VISUAL: Gradient Hover Glassmorphism
          ======================================== */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

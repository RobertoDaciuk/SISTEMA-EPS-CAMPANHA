"use client";

import { useState, useCallback, ChangeEvent, DragEvent } from "react";
import { read, utils } from "xlsx";
import { UploadCloud, File, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

/**
 * ========================================
 * INTERFACE: Props do Componente
 * ========================================
 */
interface UploadPlanilhaProps {
  /**
   * Callback chamado quando a planilha for carregada com sucesso
   * 
   * @param cabecalhos - Array com os nomes das colunas (1ª linha da planilha)
   * @param linhas - Array de objetos com os dados das linhas
   * @param arquivo - Arquivo original carregado
   */
  onPlanilhaCarregada: (
    cabecalhos: string[],
    linhas: any[],
    arquivo: File
  ) => void;
}

/**
 * ========================================
 * COMPONENTE: UploadPlanilha
 * ========================================
 * 
 * Componente reutilizável para upload e parsing de planilhas Excel
 * 
 * Funcionalidades:
 * - Upload de arquivos .xlsx, .xls, .csv
 * - Suporte a drag-and-drop
 * - Parsing no navegador usando FileReader + xlsx
 * - Extração de cabeçalhos e dados
 * - Estados de loading e erro
 * - Feedback visual durante o processo
 * 
 * @param onPlanilhaCarregada - Callback para retornar os dados parseados
 */
export default function UploadPlanilha({
  onPlanilhaCarregada,
}: UploadPlanilhaProps) {
  // ========================================
  // ESTADOS
  // ========================================
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // ========================================
  // FUNÇÃO: Validar Arquivo
  // ========================================
  /**
   * Valida se o arquivo tem extensão permitida
   * 
   * @param file - Arquivo a ser validado
   * @returns true se válido, false caso contrário
   */
  const validarArquivo = useCallback((file: File): boolean => {
    const extensoesPermitidas = [
      ".xlsx",
      ".xls",
      ".csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    const extensao = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const tipoValido =
      extensoesPermitidas.includes(extensao) ||
      extensoesPermitidas.includes(file.type);

    if (!tipoValido) {
      setErro(
        "Formato de arquivo inválido. Use apenas .xlsx, .xls ou .csv"
      );
      toast.error("Formato de arquivo inválido!");
      return false;
    }

    // Validar tamanho máximo (10MB)
    const tamanhoMaximo = 10 * 1024 * 1024; // 10MB em bytes
    if (file.size > tamanhoMaximo) {
      setErro("Arquivo muito grande. Tamanho máximo: 10MB");
      toast.error("Arquivo muito grande!");
      return false;
    }

    return true;
  }, []);

  // ========================================
  // FUNÇÃO: Processar Arquivo
  // ========================================
  /**
   * Processa o arquivo selecionado:
   * 1. Lê o arquivo com FileReader
   * 2. Faz parsing com a biblioteca xlsx
   * 3. Extrai cabeçalhos e linhas
   * 4. Retorna os dados via callback
   */
  const handleProcessarArquivo = useCallback(() => {
    if (!arquivo) {
      toast.error("Nenhum arquivo selecionado!");
      return;
    }

    setIsLoading(true);
    setErro(null);

    // Criar FileReader para ler o arquivo no navegador
    const reader = new FileReader();

    // ========================================
    // EVENTO: FileReader.onload
    // ========================================
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        // Garantir que temos resultado
        if (!e.target?.result) {
          throw new Error("Erro ao ler o arquivo");
        }

        // ========================================
        // PARSING DA PLANILHA COM XLSX
        // ========================================
        
        // 1. Ler workbook do ArrayBuffer
        const workbook = read(e.target.result, { type: "buffer" });

        // 2. Pegar a primeira aba (sheet)
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 3. Converter para array de arrays (para extrair cabeçalhos)
        const dataArray: any[][] = utils.sheet_to_json(worksheet, {
          header: 1, // Retorna array de arrays
          defval: "", // Valor padrão para células vazias
          raw: false, // Converter números para string
        });

        // Validar se há dados
        if (!dataArray || dataArray.length === 0) {
          throw new Error("Planilha vazia ou sem dados");
        }

        // 4. Extrair cabeçalhos (primeira linha)
        const cabecalhos = dataArray[0] as string[];

        // Validar se há cabeçalhos
        if (!cabecalhos || cabecalhos.length === 0) {
          throw new Error("Planilha sem cabeçalhos na primeira linha");
        }

        // 5. Converter para array de objetos usando os cabeçalhos
        const linhas = utils.sheet_to_json(worksheet, {
          defval: "", // Valor padrão para células vazias
          raw: false, // Converter números para string
        });

        // Validar se há linhas de dados
        if (!linhas || linhas.length === 0) {
          throw new Error("Planilha sem dados além dos cabeçalhos");
        }

        // ========================================
        // SUCESSO: Retornar dados via callback
        // ========================================
        onPlanilhaCarregada(cabecalhos, linhas, arquivo);
        toast.success(`Planilha carregada: ${linhas.length} linhas encontradas`);
        setIsLoading(false);
      } catch (error: any) {
        console.error("Erro ao processar planilha:", error);
        const mensagemErro =
          error.message || "Erro desconhecido ao processar planilha";
        setErro(mensagemErro);
        toast.error(`Erro: ${mensagemErro}`);
        setIsLoading(false);
      }
    };

    // ========================================
    // EVENTO: FileReader.onerror
    // ========================================
    reader.onerror = () => {
      console.error("Erro ao ler arquivo:", reader.error);
      setErro("Erro ao ler o arquivo");
      toast.error("Erro ao ler o arquivo!");
      setIsLoading(false);
    };

    // Iniciar leitura do arquivo como ArrayBuffer
    reader.readAsArrayBuffer(arquivo);
  }, [arquivo, onPlanilhaCarregada]);

  // ========================================
  // HANDLER: Mudança de Input
  // ========================================
  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (validarArquivo(file)) {
        setArquivo(file);
        setErro(null);
      }
    },
    [validarArquivo]
  );

  // ========================================
  // HANDLERS: Drag and Drop
  // ========================================
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      if (validarArquivo(file)) {
        setArquivo(file);
        setErro(null);
      }
    },
    [validarArquivo]
  );

  // ========================================
  // HANDLER: Remover Arquivo
  // ========================================
  const handleRemoverArquivo = useCallback(() => {
    setArquivo(null);
    setErro(null);
  }, []);

  // ========================================
  // RENDERIZAÇÃO
  // ========================================
  return (
    <div className="w-full">
      {/* ========================================
          ÁREA DE DROPZONE
          ======================================== */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-[300px] p-8
          border-2 border-dashed rounded-lg
          transition-all duration-200 ease-in-out
          ${
            isDragging
              ? "border-blue-500 bg-blue-50 scale-[1.02]"
              : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }
          ${arquivo ? "border-green-500 bg-green-50" : ""}
        `}
      >
        {/* ========================================
            ÍCONE E TEXTOS
            ======================================== */}
        {!arquivo && (
          <>
            <UploadCloud
              className={`
                w-16 h-16 mb-4 transition-colors
                ${isDragging ? "text-blue-500" : "text-gray-400"}
              `}
            />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {isDragging
                ? "Solte o arquivo aqui"
                : "Arraste e solte sua planilha"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              ou clique para selecionar
            </p>
            <p className="text-xs text-gray-400">
              Formatos aceitos: .xlsx, .xls, .csv (máx. 10MB)
            </p>
          </>
        )}

        {/* ========================================
            ARQUIVO SELECIONADO
            ======================================== */}
        {arquivo && !isLoading && (
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-lg shadow-sm border border-green-300">
            <File className="w-8 h-8 text-green-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {arquivo.name}
              </p>
              <p className="text-xs text-gray-500">
                {(arquivo.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <button
              onClick={handleRemoverArquivo}
              className="p-1 hover:bg-red-100 rounded transition-colors"
              title="Remover arquivo"
            >
              <X className="w-5 h-5 text-red-500" />
            </button>
          </div>
        )}

        {/* ========================================
            LOADING
            ======================================== */}
        {isLoading && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-gray-700">
              Processando planilha...
            </p>
          </div>
        )}

        {/* ========================================
            INPUT OCULTO
            ======================================== */}
        <input
          id="file-upload"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />
      </div>

      {/* ========================================
          MENSAGEM DE ERRO
          ======================================== */}
      {erro && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">{erro}</p>
        </div>
      )}

      {/* ========================================
          BOTÃO PROCESSAR
          ======================================== */}
      {arquivo && !isLoading && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleProcessarArquivo}
            disabled={!arquivo || isLoading}
            className="
              px-6 py-3 
              bg-blue-600 hover:bg-blue-700 
              text-white font-semibold rounded-lg
              disabled:bg-gray-300 disabled:cursor-not-allowed
              transition-colors duration-200
              flex items-center gap-2
            "
          >
            <UploadCloud className="w-5 h-5" />
            Processar Planilha
          </button>
        </div>
      )}
    </div>
  );
}

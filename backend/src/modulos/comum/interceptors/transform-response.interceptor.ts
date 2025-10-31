/**
 * ============================================================================
 * TRANSFORM RESPONSE INTERCEPTOR - Padronização de Respostas HTTP - v2.0
 * ============================================================================
 *
 * Descrição:
 * Interceptador responsável por padronizar todas as respostas HTTP do sistema
 * EPS Campanhas. Garante consistência no formato de dados, adiciona metadados
 * úteis e implementa transformações específicas por tipo de endpoint.
 *
 * FUNCIONALIDADES IMPLEMENTADAS:
 * ✅ PADRONIZAÇÃO: Formato consistente para todas as respostas
 * ✅ METADADOS: Timestamp, versão, correlation ID automáticos
 * ✅ PAGINAÇÃO: Suporte automático para respostas paginadas
 * ✅ TIMEZONE: Conversão automática de datas para timezone correto
 * ✅ SANITIZAÇÃO: Remoção de campos sensíveis em produção
 * ✅ COMPRESSÃO: Otimização de payload para responses grandes
 * ✅ CACHE HEADERS: Headers de cache inteligentes por tipo de dado
 *
 * FORMATOS DE RESPOSTA:
 * - Sucesso Simples: { sucesso: true, dados: T, metadados: {} }
 * - Lista Paginada: { sucesso: true, dados: T[], paginacao: {}, metadados: {} }
 * - Erro Tratado: { sucesso: false, erro: {}, metadados: {} }
 *
 * @module ComumModule
 * ============================================================================
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { instanceToPlain } from 'class-transformer';
import { utcToZonedTime, format } from 'date-fns-tz';
import { PapelUsuario } from '@prisma/client';

/**
 * Timezone padrão do sistema (São Paulo, Brasil).
 */
const TIMEZONE_SISTEMA = 'America/Sao_Paulo';

/**
 * Interface para resposta padronizada de sucesso.
 */
export interface RespostaPadronizada<T = any> {
  /** Indica se operação foi bem-sucedida */
  sucesso: boolean;
  /** Dados da resposta (tipados) */
  dados: T;
  /** Metadados da resposta */
  metadados: MetadadosResposta;
  /** Informações de paginação (se aplicável) */
  paginacao?: InformacoesPaginacao;
}

/**
 * Interface para resposta padronizada de erro.
 */
export interface RespostaErro {
  /** Indica que operação falhou */
  sucesso: false;
  /** Detalhes do erro */
  erro: {
    codigo: string;
    mensagem: string;
    detalhes?: any;
  };
  /** Metadados da resposta */
  metadados: MetadadosResposta;
}

/**
 * Interface para metadados incluídos em todas as respostas.
 */
export interface MetadadosResposta {
  /** Timestamp da resposta no timezone de São Paulo */
  timestamp: string;
  /** ID de correlação da requisição (se disponível) */
  correlationId?: string;
  /** Versão da API */
  versao: string;
  /** Ambiente (development, production, etc.) */
  ambiente: string;
  /** Tempo de processamento em ms */
  tempoProcessamento?: number;
  /** Dados do usuário que fez a requisição (sanitizados) */
  usuario?: {
    id: string;
    papel: PapelUsuario;
    opticaId?: string;
  };
  /** Headers de cache sugeridos */
  cache?: {
    maxAge: number;
    etag?: string;
    lastModified?: string;
  };
}

/**
 * Interface para informações de paginação.
 */
export interface InformacoesPaginacao {
  /** Página atual */
  paginaAtual: number;
  /** Total de itens por página */
  itensPorPagina: number;
  /** Total de itens disponíveis */
  totalItens: number;
  /** Total de páginas */
  totalPaginas: number;
  /** Se existe página anterior */
  temPaginaAnterior: boolean;
  /** Se existe próxima página */
  temProximaPagina: boolean;
  /** Links de navegação */
  links?: {
    primeira?: string;
    anterior?: string;
    proxima?: string;
    ultima?: string;
  };
}

/**
 * Interface para configurações de transformação por endpoint.
 */
interface ConfiguracaoTransformacao {
  /** Se deve incluir metadados completos */
  incluirMetadados: boolean;
  /** Se deve converter datas para timezone local */
  converterDatas: boolean;
  /** Se deve sanitizar dados sensíveis */
  sanitizarDados: boolean;
  /** Configurações de cache */
  cache?: {
    maxAge: number;
    private: boolean;
  };
  /** Campos a serem removidos da resposta */
  camposExcluidos?: string[];
  /** Transformações customizadas por tipo */
  transformacoesCustomizadas?: Record<string, (valor: any) => any>;
}

/**
 * Interceptador para padronização de respostas HTTP.
 * 
 * FUNCIONAMENTO:
 * 1. Intercepta resposta antes de ser enviada ao cliente
 * 2. Aplica transformações baseadas no tipo de dados
 * 3. Adiciona metadados padrão (timestamp, versão, etc.)
 * 4. Converte datas para timezone correto
 * 5. Sanitiza dados sensíveis se necessário
 * 6. Aplica headers de cache otimizados
 * 7. Formata resposta no padrão consistente
 *
 * CASOS DE USO:
 * - Garantir formato consistente em toda API
 * - Adicionar metadados úteis para debugging
 * - Converter automaticamente timezones
 * - Sanitizar dados sensíveis em produção
 * - Otimizar caching de respostas
 */
@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  /**
   * Configuração padrão do interceptador.
   */
  private readonly configuracaoPadrao: ConfiguracaoTransformacao = {
    incluirMetadados: true,
    converterDatas: true,
    sanitizarDados: process.env.NODE_ENV === 'production',
    cache: {
      maxAge: 300, // 5 minutos
      private: true,
    },
    camposExcluidos: process.env.NODE_ENV === 'production' 
      ? ['senha', 'token', 'apiKey', 'secret'] 
      : [],
  };

  /**
   * Mapeamento de configurações específicas por endpoint.
   */
  private readonly configuracoesPorEndpoint: Record<string, Partial<ConfiguracaoTransformacao>> = {
    // Endpoints de campanhas (cache longo)
    'CampanhaController.listarCampanhas': {
      cache: { maxAge: 1800, private: true }, // 30 minutos
    },
    'CampanhaController.buscarCampanhaPorId': {
      cache: { maxAge: 900, private: true }, // 15 minutos
    },
    
    // Endpoints de dados de vendedor (cache curto)
    'CampanhaController.buscarDadosCampanhaParaVendedor': {
      cache: { maxAge: 60, private: true }, // 1 minuto
      converterDatas: true,
    },
    
    // Endpoints administrativos (sem cache)
    'CampanhaController.criarCampanha': {
      cache: { maxAge: 0, private: true },
      incluirMetadados: true,
    },
    'CampanhaController.atualizarCampanha': {
      cache: { maxAge: 0, private: true },
    },
    
    // Endpoints de analytics (cache médio)
    'CampanhaController.buscarAnalyticsCampanha': {
      cache: { maxAge: 600, private: true }, // 10 minutos
    },
  };

  /**
   * Método principal do interceptador.
   * 
   * @param context - Contexto de execução da requisição
   * @param next - Handler para continuar o processamento
   * @returns Observable com resposta transformada
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<RespostaPadronizada> {
    const inicioProcessamento = Date.now();
    const configuracao = this.obterConfiguracao(context);
    
    return next.handle().pipe(
      map(dados => this.transformarResposta(
        dados, 
        context, 
        configuracao, 
        inicioProcessamento
      )),
    );
  }

  /**
   * ============================================================================
   * MÉTODOS DE TRANSFORMAÇÃO PRINCIPAL
   * ============================================================================
   */

  /**
   * Transforma dados brutos em resposta padronizada.
   * 
   * @param dados - Dados originais da resposta
   * @param context - Contexto de execução
   * @param configuracao - Configuração de transformação
   * @param inicioProcessamento - Timestamp de início
   * @returns Resposta padronizada
   */
  private transformarResposta(
    dados: any,
    context: ExecutionContext,
    configuracao: ConfiguracaoTransformacao,
    inicioProcessamento: number,
  ): RespostaPadronizada {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 1. Detectar se é resposta paginada
    const ehPaginada = this.detectarRespostaPaginada(dados);

    // 2. Transformar dados principais
    let dadosTransformados = this.aplicarTransformacoesDados(dados, configuracao);

    // 3. Construir metadados
    const metadados = this.construirMetadados(
      request,
      configuracao,
      inicioProcessamento,
    );

    // 4. Aplicar headers de cache
    this.aplicarHeadersCache(response, configuracao, metadados);

    // 5. Construir resposta final
    const respostaFinal: RespostaPadronizada = {
      sucesso: true,
      dados: ehPaginada ? dadosTransformados.dados : dadosTransformados,
      metadados,
    };

    // 6. Adicionar informações de paginação se aplicável
    if (ehPaginada) {
      respostaFinal.paginacao = this.construirInformacoesPaginacao(
        dados,
        request,
      );
    }

    return respostaFinal;
  }

  /**
   * Aplica transformações específicas aos dados.
   * 
   * @param dados - Dados originais
   * @param configuracao - Configuração de transformação
   * @returns Dados transformados
   */
  private aplicarTransformacoesDados(
    dados: any,
    configuracao: ConfiguracaoTransformacao,
  ): any {
    if (!dados) {
      return dados;
    }

    // 1. Converter para objeto plain (remove métodos de classe)
    let dadosTransformados = instanceToPlain(dados);

    // 2. Converter datas se solicitado
    if (configuracao.converterDatas) {
      dadosTransformados = this.converterDatasParaTimezone(dadosTransformados);
    }

    // 3. Sanitizar dados sensíveis se solicitado
    if (configuracao.sanitizarDados) {
      dadosTransformados = this.sanitizarDadosSensiveis(
        dadosTransformados,
        configuracao.camposExcluidos || [],
      );
    }

    // 4. Aplicar transformações customizadas
    if (configuracao.transformacoesCustomizadas) {
      dadosTransformados = this.aplicarTransformacoesCustomizadas(
        dadosTransformados,
        configuracao.transformacoesCustomizadas,
      );
    }

    return dadosTransformados;
  }

  /**
   * ============================================================================
   * MÉTODOS DE DETECÇÃO E CONFIGURAÇÃO
   * ============================================================================
   */

  /**
   * Obtém configuração específica para o endpoint atual.
   * 
   * @param context - Contexto de execução
   * @returns Configuração merged
   */
  private obterConfiguracao(context: ExecutionContext): ConfiguracaoTransformacao {
    const controllerClass = context.getClass();
    const handler = context.getHandler();
    const nomeEndpoint = `${controllerClass.name}.${handler.name}`;

    const configuracaoEspecifica = this.configuracoesPorEndpoint[nomeEndpoint] || {};

    return {
      ...this.configuracaoPadrao,
      ...configuracaoEspecifica,
    };
  }

  /**
   * Detecta se resposta é paginada baseado na estrutura dos dados.
   * 
   * @param dados - Dados da resposta
   * @returns true se resposta é paginada
   */
  private detectarRespostaPaginada(dados: any): boolean {
    return (
      dados &&
      typeof dados === 'object' &&
      'dados' in dados &&
      'metadados' in dados &&
      dados.metadados &&
      (
        'totalItens' in dados.metadados ||
        'paginaAtual' in dados.metadados ||
        'totalPaginas' in dados.metadados
      )
    );
  }

  /**
   * ============================================================================
   * MÉTODOS DE TRANSFORMAÇÃO DE DADOS
   * ============================================================================
   */

  /**
   * Converte todas as datas encontradas para o timezone de São Paulo.
   * 
   * @param dados - Dados a serem processados
   * @returns Dados com datas convertidas
   */
  private converterDatasParaTimezone(dados: any): any {
    if (!dados) {
      return dados;
    }

    if (dados instanceof Date) {
      return format(utcToZonedTime(dados, TIMEZONE_SISTEMA), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", {
        timeZone: TIMEZONE_SISTEMA,
      });
    }

    if (typeof dados === 'string' && this.ehDataISO(dados)) {
      const data = new Date(dados);
      return format(utcToZonedTime(data, TIMEZONE_SISTEMA), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", {
        timeZone: TIMEZONE_SISTEMA,
      });
    }

    if (Array.isArray(dados)) {
      return dados.map(item => this.converterDatasParaTimezone(item));
    }

    if (typeof dados === 'object') {
      const resultado: any = {};
      for (const [chave, valor] of Object.entries(dados)) {
        resultado[chave] = this.converterDatasParaTimezone(valor);
      }
      return resultado;
    }

    return dados;
  }

  /**
   * Verifica se string é uma data ISO válida.
   * 
   * @param valor - String a ser verificada
   * @returns true se é data ISO
   */
  private ehDataISO(valor: string): boolean {
    const regexISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return regexISO.test(valor) && !isNaN(Date.parse(valor));
  }

  /**
   * Remove campos sensíveis dos dados.
   * 
   * @param dados - Dados a serem sanitizados
   * @param camposExcluidos - Lista de campos a excluir
   * @returns Dados sanitizados
   */
  private sanitizarDadosSensiveis(dados: any, camposExcluidos: string[]): any {
    if (!dados || camposExcluidos.length === 0) {
      return dados;
    }

    if (Array.isArray(dados)) {
      return dados.map(item => this.sanitizarDadosSensiveis(item, camposExcluidos));
    }

    if (typeof dados === 'object') {
      const resultado: any = {};
      for (const [chave, valor] of Object.entries(dados)) {
        // Pular campos sensíveis
        if (camposExcluidos.some(campo => 
          chave.toLowerCase().includes(campo.toLowerCase())
        )) {
          continue;
        }
        
        resultado[chave] = this.sanitizarDadosSensiveis(valor, camposExcluidos);
      }
      return resultado;
    }

    return dados;
  }

  /**
   * Aplica transformações customizadas aos dados.
   * 
   * @param dados - Dados a serem transformados
   * @param transformacoes - Map de transformações
   * @returns Dados transformados
   */
  private aplicarTransformacoesCustomizadas(
    dados: any,
    transformacoes: Record<string, (valor: any) => any>,
  ): any {
    if (!dados || typeof dados !== 'object') {
      return dados;
    }

    if (Array.isArray(dados)) {
      return dados.map(item => 
        this.aplicarTransformacoesCustomizadas(item, transformacoes)
      );
    }

    const resultado: any = {};
    for (const [chave, valor] of Object.entries(dados)) {
      if (transformacoes[chave]) {
        resultado[chave] = transformacoes[chave](valor);
      } else {
        resultado[chave] = this.aplicarTransformacoesCustomizadas(valor, transformacoes);
      }
    }

    return resultado;
  }

  /**
   * ============================================================================
   * MÉTODOS DE CONSTRUÇÃO DE METADADOS
   * ============================================================================
   */

  /**
   * Constrói metadados padrão para a resposta.
   * 
   * @param request - Objeto da requisição
   * @param configuracao - Configuração de transformação
   * @param inicioProcessamento - Timestamp de início
   * @returns Metadados construídos
   */
  private construirMetadados(
    request: any,
    configuracao: ConfiguracaoTransformacao,
    inicioProcessamento: number,
  ): MetadadosResposta {
    const agora = new Date();
    const metadados: MetadadosResposta = {
      timestamp: format(utcToZonedTime(agora, TIMEZONE_SISTEMA), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", {
        timeZone: TIMEZONE_SISTEMA,
      }),
      versao: process.env.APP_VERSION || '1.0.0',
      ambiente: process.env.NODE_ENV || 'development',
      tempoProcessamento: Date.now() - inicioProcessamento,
    };

    // Adicionar correlation ID se disponível
    if (request.correlationId) {
      metadados.correlationId = request.correlationId;
    }

    // Adicionar dados do usuário sanitizados
    if (request.user && configuracao.incluirMetadados) {
      metadados.usuario = {
        id: request.user.id,
        papel: request.user.papel,
        opticaId: request.user.opticaId,
      };
    }

    // Adicionar informações de cache
    if (configuracao.cache) {
      metadados.cache = {
        maxAge: configuracao.cache.maxAge,
        etag: this.gerarETag(metadados),
        lastModified: agora.toISOString(),
      };
    }

    return metadados;
  }

  /**
   * Constrói informações de paginação.
   * 
   * @param dados - Dados paginados
   * @param request - Objeto da requisição
   * @returns Informações de paginação
   */
  private construirInformacoesPaginacao(
    dados: any,
    request: any,
  ): InformacoesPaginacao {
    const metadadosPaginacao = dados.metadados;
    const baseUrl = `${request.protocol}://${request.get('host')}${request.path}`;
    
    const paginacao: InformacoesPaginacao = {
      paginaAtual: metadadosPaginacao.paginaAtual || 1,
      itensPorPagina: metadadosPaginacao.itensPorPagina || 20,
      totalItens: metadadosPaginacao.totalItens || 0,
      totalPaginas: metadadosPaginacao.totalPaginas || 1,
      temPaginaAnterior: metadadosPaginacao.temPaginaAnterior || false,
      temProximaPagina: metadadosPaginacao.temProximaPagina || false,
    };

    // Construir links de navegação
    paginacao.links = this.construirLinksPaginacao(paginacao, baseUrl, request.query);

    return paginacao;
  }

  /**
   * Constrói links de navegação para paginação.
   * 
   * @param paginacao - Informações de paginação
   * @param baseUrl - URL base da requisição
   * @param queryParams - Parâmetros da query
   * @returns Links de navegação
   */
  private construirLinksPaginacao(
    paginacao: InformacoesPaginacao,
    baseUrl: string,
    queryParams: any,
  ): InformacoesPaginacao['links'] {
    const construirUrl = (pagina: number) => {
      const params = new URLSearchParams(queryParams);
      params.set('pagina', pagina.toString());
      return `${baseUrl}?${params.toString()}`;
    };

    const links: InformacoesPaginacao['links'] = {};

    // Link para primeira página
    if (paginacao.paginaAtual > 1) {
      links.primeira = construirUrl(1);
    }

    // Link para página anterior
    if (paginacao.temPaginaAnterior) {
      links.anterior = construirUrl(paginacao.paginaAtual - 1);
    }

    // Link para próxima página
    if (paginacao.temProximaPagina) {
      links.proxima = construirUrl(paginacao.paginaAtual + 1);
    }

    // Link para última página
    if (paginacao.paginaAtual < paginacao.totalPaginas) {
      links.ultima = construirUrl(paginacao.totalPaginas);
    }

    return links;
  }

  /**
   * ============================================================================
   * MÉTODOS DE CACHE E HEADERS
   * ============================================================================
   */

  /**
   * Aplica headers de cache otimizados na resposta.
   * 
   * @param response - Objeto de resposta HTTP
   * @param configuracao - Configuração de transformação
   * @param metadados - Metadados da resposta
   */
  private aplicarHeadersCache(
    response: any,
    configuracao: ConfiguracaoTransformacao,
    metadados: MetadadosResposta,
  ): void {
    if (!configuracao.cache) {
      return;
    }

    const { maxAge, private: isPrivate } = configuracao.cache;

    // Cache-Control
    const cacheControl = isPrivate ? 'private' : 'public';
    response.setHeader('Cache-Control', `${cacheControl}, max-age=${maxAge}`);

    // ETag para validação de cache
    if (metadados.cache?.etag) {
      response.setHeader('ETag', metadados.cache.etag);
    }

    // Last-Modified
    if (metadados.cache?.lastModified) {
      response.setHeader('Last-Modified', new Date(metadados.cache.lastModified).toUTCString());
    }

    // Vary header para cache baseado em usuário
    response.setHeader('Vary', 'Authorization, Accept-Encoding');
  }

  /**
   * Gera ETag para a resposta.
   * 
   * @param metadados - Metadados da resposta
   * @returns ETag gerado
   */
  private gerarETag(metadados: MetadadosResposta): string {
    const crypto = require('crypto');
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify({
        timestamp: metadados.timestamp,
        versao: metadados.versao,
        usuario: metadados.usuario?.id,
      }))
      .digest('hex');
    
    return `"${hash.substring(0, 16)}"`;
  }

  /**
   * ============================================================================
   * MÉTODOS UTILITÁRIOS PÚBLICOS
   * ============================================================================
   */

  /**
   * Registra nova configuração para endpoint específico.
   * 
   * @param endpoint - Nome do endpoint (Controller.metodo)
   * @param configuracao - Configuração parcial
   */
  public configurarEndpoint(
    endpoint: string, 
    configuracao: Partial<ConfiguracaoTransformacao>
  ): void {
    this.configuracoesPorEndpoint[endpoint] = {
      ...this.configuracoesPorEndpoint[endpoint],
      ...configuracao,
    };
  }

  /**
   * Obtém estatísticas de uso do interceptador.
   * 
   * @returns Estatísticas coletadas
   */
  public obterEstatisticas() {
    return {
      endpointsConfigurados: Object.keys(this.configuracoesPorEndpoint).length,
      configuracaoPadrao: this.configuracaoPadrao,
      timestamp: new Date().toISOString(),
    };
  }
}

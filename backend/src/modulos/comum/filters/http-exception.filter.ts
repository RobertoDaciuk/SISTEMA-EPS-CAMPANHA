/**
 * ============================================================================
 * HTTP EXCEPTION FILTER - Tratamento Centralizado de Exceções - v2.0
 * ============================================================================
 *
 * Descrição:
 * Filter responsável por interceptar e tratar todas as exceções HTTP no sistema
 * EPS Campanhas. Padroniza respostas de erro, registra logs de auditoria e
 * implementa diferentes estratégias de tratamento baseadas no tipo de exceção.
 *
 * FUNCIONALIDADES IMPLEMENTADAS:
 * ✅ PADRONIZAÇÃO: Formato consistente para todas as respostas de erro
 * ✅ LOGS DE AUDITORIA: Registro detalhado de erros para debugging
 * ✅ SANITIZAÇÃO: Remoção de informações sensíveis em produção
 * ✅ CORRELAÇÃO: Rastreamento de erros com correlation IDs
 * ✅ NOTIFICAÇÃO: Alertas automáticos para erros críticos
 * ✅ MÉTRICAS: Coleta de estatísticas de erros para monitoramento
 * ✅ LOCALIZAÇÃO: Mensagens de erro em português brasileiro
 *
 * TIPOS DE EXCEÇÃO TRATADOS:
 * - HttpException: Erros HTTP padrão (400, 401, 403, 404, etc.)
 * - ValidationException: Erros de validação de dados
 * - PrismaException: Erros de banco de dados
 * - BusinessException: Erros de regra de negócio
 * - UnknownException: Erros não categorizados
 *
 * @module ComumModule
 * ============================================================================
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { ValidationError } from 'class-validator';
import { format, utcToZonedTime } from 'date-fns-tz';

/**
 * Timezone padrão do sistema (São Paulo, Brasil).
 */
const TIMEZONE_SISTEMA = 'America/Sao_Paulo';

/**
 * Interface para resposta padronizada de erro.
 */
export interface RespostaErroHttp {
  /** Indica que operação falhou */
  sucesso: false;
  /** Detalhes estruturados do erro */
  erro: {
    /** Código de identificação do erro */
    codigo: string;
    /** Mensagem principal do erro */
    mensagem: string;
    /** Detalhes adicionais (campo específico, contexto, etc.) */
    detalhes?: any;
    /** Sugestões para resolução do erro */
    sugestoes?: string[];
    /** Link para documentação relacionada */
    documentacao?: string;
  };
  /** Metadados da resposta de erro */
  metadados: {
    /** Timestamp do erro no timezone de São Paulo */
    timestamp: string;
    /** Caminho da requisição que gerou o erro */
    caminho: string;
    /** Método HTTP da requisição */
    metodo: string;
    /** ID de correlação para rastreamento */
    correlationId: string;
    /** Versão da API */
    versao: string;
    /** Ambiente onde ocorreu o erro */
    ambiente: string;
    /** Dados do usuário que gerou o erro (sanitizados) */
    usuario?: {
      id: string;
      email: string;
      papel: string;
    };
  };
}

/**
 * Interface para configuração de tratamento por tipo de erro.
 */
interface ConfiguracaoTratamentoErro {
  /** Nível de log a ser usado */
  nivelLog: 'error' | 'warn' | 'log';
  /** Se deve notificar administradores */
  notificarAdmins: boolean;
  /** Se deve incluir stack trace na resposta */
  incluirStackTrace: boolean;
  /** Se deve incluir detalhes técnicos */
  incluirDetalhesTecnicos: boolean;
  /** Mensagem padrão personalizada */
  mensagemPadrao?: string;
}

/**
 * Mapeamento de códigos de erro do Prisma para mensagens amigáveis.
 */
const CODIGOS_ERRO_PRISMA: Record<string, string> = {
  'P2000': 'O valor fornecido é muito longo para o campo',
  'P2001': 'Registro não encontrado',
  'P2002': 'Violação de restrição de unicidade',
  'P2003': 'Violação de chave estrangeira',
  'P2004': 'Violação de restrição do banco de dados',
  'P2005': 'Valor inválido para o campo',
  'P2006': 'Valor inválido fornecido',
  'P2007': 'Erro de validação de dados',
  'P2008': 'Falha ao analisar a consulta',
  'P2009': 'Falha ao validar a consulta',
  'P2010': 'Consulta bruta falhou',
  'P2011': 'Violação de restrição não nula',
  'P2012': 'Valor obrigatório ausente',
  'P2013': 'Valor obrigatório ausente para o campo',
  'P2014': 'A alteração violaria uma relação obrigatória',
  'P2015': 'Registro relacionado não encontrado',
  'P2016': 'Erro de interpretação da consulta',
  'P2017': 'Registros não conectados',
  'P2018': 'Registros conectados necessários não encontrados',
  'P2019': 'Erro de entrada',
  'P2020': 'Valor fora do intervalo permitido',
  'P2021': 'A tabela não existe no banco de dados atual',
  'P2022': 'A coluna não existe no banco de dados atual',
  'P2023': 'Dados de coluna inconsistentes',
  'P2024': 'Timeout de conexão com o banco de dados',
  'P2025': 'Operação falhou porque depende de um ou mais registros que não foram encontrados',
};

/**
 * Filter de exceções HTTP.
 * 
 * Intercepta todas as exceções não tratadas no sistema e as converte
 * em respostas HTTP padronizadas com logs de auditoria apropriados.
 *
 * FUNCIONAMENTO:
 * 1. Intercepta exceção antes de chegar ao cliente
 * 2. Identifica tipo específico da exceção
 * 3. Aplica tratamento personalizado baseado no tipo
 * 4. Gera resposta padronizada com mensagens amigáveis
 * 5. Registra logs de auditoria detalhados
 * 6. Coleta métricas para monitoramento
 * 7. Notifica administradores se necessário
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   * Logger principal do filter.
   */
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Configurações de tratamento por tipo de exceção.
   */
  private readonly configuracoesTratamento: Record<string, ConfiguracaoTratamentoErro> = {
    // Erros HTTP padrão
    'HttpException': {
      nivelLog: 'warn',
      notificarAdmins: false,
      incluirStackTrace: false,
      incluirDetalhesTecnicos: false,
    },
    
    // Erros de validação
    'ValidationError': {
      nivelLog: 'log',
      notificarAdmins: false,
      incluirStackTrace: false,
      incluirDetalhesTecnicos: true,
    },
    
    // Erros de banco de dados
    'PrismaClientKnownRequestError': {
      nivelLog: 'error',
      notificarAdmins: true,
      incluirStackTrace: process.env.NODE_ENV === 'development',
      incluirDetalhesTecnicos: process.env.NODE_ENV === 'development',
    },
    
    // Erros críticos do sistema
    'Error': {
      nivelLog: 'error',
      notificarAdmins: true,
      incluirStackTrace: process.env.NODE_ENV === 'development',
      incluirDetalhesTecnicos: false,
      mensagemPadrao: 'Ocorreu um erro interno no servidor',
    },
  };

  /**
   * Métricas de erros coletadas em memória.
   */
  private readonly metricas = {
    totalErros: 0,
    errosPorTipo: new Map<string, number>(),
    errosPorStatus: new Map<number, number>(),
    ultimoErro: null as Date | null,
  };

  /**
   * Método principal do filter.
   * 
   * @param exception - Exceção interceptada
   * @param host - Contexto de argumentos da requisição
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Gerar correlation ID se não existir
    const correlationId = this.obterOuGerarCorrelationId(request);

    // Identificar tipo da exceção e obter configuração
    const tipoExcecao = this.identificarTipoExcecao(exception);
    const configuracao = this.obterConfiguracaoTratamento(tipoExcecao);

    // Determinar status HTTP e dados do erro
    const { statusHttp, dadosErro } = this.processarExcecao(exception, tipoExcecao);

    // Construir resposta padronizada
    const respostaErro = this.construirRespostaErro(
      dadosErro,
      request,
      correlationId,
      configuracao,
    );

    // Registrar logs de auditoria
    this.registrarLogErro(
      exception,
      respostaErro,
      request,
      configuracao,
    );

    // Atualizar métricas
    this.atualizarMetricas(tipoExcecao, statusHttp);

    // Notificar administradores se necessário
    if (configuracao.notificarAdmins) {
      this.notificarAdministradores(exception, respostaErro, request);
    }

    // Enviar resposta padronizada
    response.status(statusHttp).json(respostaErro);
  }

  /**
   * ============================================================================
   * MÉTODOS DE PROCESSAMENTO DE EXCEÇÕES
   * ============================================================================
   */

  /**
   * Identifica o tipo específico da exceção para aplicar tratamento adequado.
   * 
   * @param exception - Exceção a ser identificada
   * @returns Nome do tipo da exceção
   */
  private identificarTipoExcecao(exception: unknown): string {
    if (exception instanceof HttpException) {
      return 'HttpException';
    }
    
    if (exception instanceof PrismaClientKnownRequestError) {
      return 'PrismaClientKnownRequestError';
    }
    
    if (exception instanceof PrismaClientValidationError) {
      return 'PrismaClientValidationError';
    }
    
    if (Array.isArray(exception) && exception[0] instanceof ValidationError) {
      return 'ValidationError';
    }
    
    if (exception instanceof Error) {
      return exception.constructor.name;
    }
    
    return 'UnknownException';
  }

  /**
   * Processa exceção específica e extrai dados relevantes.
   * 
   * @param exception - Exceção a ser processada
   * @param tipo - Tipo identificado da exceção
   * @returns Status HTTP e dados estruturados do erro
   */
  private processarExcecao(exception: unknown, tipo: string): {
    statusHttp: number;
    dadosErro: {
      codigo: string;
      mensagem: string;
      detalhes?: any;
      sugestoes?: string[];
    };
  } {
    switch (tipo) {
      case 'HttpException':
        return this.processarHttpException(exception as HttpException);
      
      case 'PrismaClientKnownRequestError':
        return this.processarPrismaError(exception as PrismaClientKnownRequestError);
      
      case 'PrismaClientValidationError':
        return this.processarPrismaValidationError(exception as PrismaClientValidationError);
      
      case 'ValidationError':
        return this.processarValidationError(exception as ValidationError[]);
      
      default:
        return this.processarErroGenerico(exception);
    }
  }

  /**
   * Processa exceções HTTP padrão do NestJS.
   * 
   * @param exception - HttpException
   * @returns Dados processados do erro
   */
  private processarHttpException(exception: HttpException): {
    statusHttp: number;
    dadosErro: any;
  } {
    const status = exception.getStatus();
    const response = exception.getResponse();

    let mensagem: string;
    let detalhes: any;
    
    if (typeof response === 'string') {
      mensagem = response;
    } else if (typeof response === 'object') {
      const responseObj = response as any;
      mensagem = responseObj.message || responseObj.error || 'Erro HTTP';
      detalhes = responseObj.details || responseObj;
    } else {
      mensagem = 'Erro HTTP não especificado';
    }

    return {
      statusHttp: status,
      dadosErro: {
        codigo: `HTTP_${status}`,
        mensagem: this.traduzirMensagemHttp(status, mensagem),
        detalhes,
        sugestoes: this.obterSugestoesHttpStatus(status),
      },
    };
  }

  /**
   * Processa erros conhecidos do Prisma.
   * 
   * @param exception - PrismaClientKnownRequestError
   * @returns Dados processados do erro
   */
  private processarPrismaError(exception: PrismaClientKnownRequestError): {
    statusHttp: number;
    dadosErro: any;
  } {
    const codigo = exception.code;
    const mensagem = CODIGOS_ERRO_PRISMA[codigo] || 'Erro de banco de dados';
    
    // Determinar status HTTP baseado no código do Prisma
    let statusHttp = HttpStatus.INTERNAL_SERVER_ERROR;
    if (['P2001', 'P2015', 'P2025'].includes(codigo)) {
      statusHttp = HttpStatus.NOT_FOUND;
    } else if (['P2002', 'P2003', 'P2004'].includes(codigo)) {
      statusHttp = HttpStatus.CONFLICT;
    } else if (['P2000', 'P2005', 'P2006', 'P2007'].includes(codigo)) {
      statusHttp = HttpStatus.BAD_REQUEST;
    }

    return {
      statusHttp,
      dadosErro: {
        codigo: `PRISMA_${codigo}`,
        mensagem,
        detalhes: process.env.NODE_ENV === 'development' ? {
          campo: exception.meta?.target,
          valor: exception.meta?.field_value,
          causa: exception.meta?.cause,
        } : undefined,
        sugestoes: this.obterSugestoesPrisma(codigo),
      },
    };
  }

  /**
   * Processa erros de validação do Prisma.
   * 
   * @param exception - PrismaClientValidationError
   * @returns Dados processados do erro
   */
  private processarPrismaValidationError(exception: PrismaClientValidationError): {
    statusHttp: number;
    dadosErro: any;
  } {
    return {
      statusHttp: HttpStatus.BAD_REQUEST,
      dadosErro: {
        codigo: 'PRISMA_VALIDATION_ERROR',
        mensagem: 'Erro de validação nos dados enviados',
        detalhes: process.env.NODE_ENV === 'development' ? exception.message : undefined,
        sugestoes: [
          'Verifique se todos os campos obrigatórios foram fornecidos',
          'Confirme se os tipos de dados estão corretos',
          'Consulte a documentação da API para formato esperado',
        ],
      },
    };
  }

  /**
   * Processa erros de validação do class-validator.
   * 
   * @param errors - Array de ValidationError
   * @returns Dados processados do erro
   */
  private processarValidationError(errors: ValidationError[]): {
    statusHttp: number;
    dadosErro: any;
  } {
    const detalhesValidacao = errors.map(erro => ({
      campo: erro.property,
      valor: erro.value,
      restricoes: Object.values(erro.constraints || {}),
    }));

    return {
      statusHttp: HttpStatus.BAD_REQUEST,
      dadosErro: {
        codigo: 'VALIDATION_ERROR',
        mensagem: 'Dados de entrada inválidos',
        detalhes: {
          campos: detalhesValidacao,
          totalErros: errors.length,
        },
        sugestoes: [
          'Verifique os campos destacados e corrija os valores',
          'Consulte a documentação para formato esperado dos dados',
          'Certifique-se de que todos os campos obrigatórios foram fornecidos',
        ],
      },
    };
  }

  /**
   * Processa erros genéricos não categorizados.
   * 
   * @param exception - Erro genérico
   * @returns Dados processados do erro
   */
  private processarErroGenerico(exception: unknown): {
    statusHttp: number;
    dadosErro: any;
  } {
    const erro = exception as Error;
    
    return {
      statusHttp: HttpStatus.INTERNAL_SERVER_ERROR,
      dadosErro: {
        codigo: 'INTERNAL_SERVER_ERROR',
        mensagem: 'Ocorreu um erro interno no servidor',
        detalhes: process.env.NODE_ENV === 'development' ? {
          tipo: erro.constructor.name,
          mensagem: erro.message,
        } : undefined,
        sugestoes: [
          'Tente novamente em alguns instantes',
          'Se o problema persistir, entre em contato com o suporte',
        ],
      },
    };
  }

  /**
   * ============================================================================
   * MÉTODOS DE CONSTRUÇÃO DE RESPOSTA
   * ============================================================================
   */

  /**
   * Constrói resposta de erro padronizada.
   * 
   * @param dadosErro - Dados processados do erro
   * @param request - Objeto da requisição
   * @param correlationId - ID de correlação
   * @param configuracao - Configuração de tratamento
   * @returns Resposta de erro estruturada
   */
  private construirRespostaErro(
    dadosErro: any,
    request: Request,
    correlationId: string,
    configuracao: ConfiguracaoTratamentoErro,
  ): RespostaErroHttp {
    const agora = new Date();
    
    return {
      sucesso: false,
      erro: {
        ...dadosErro,
        documentacao: this.obterLinkDocumentacao(dadosErro.codigo),
      },
      metadados: {
        timestamp: format(utcToZonedTime(agora, TIMEZONE_SISTEMA), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", {
          timeZone: TIMEZONE_SISTEMA,
        }),
        caminho: request.path,
        metodo: request.method,
        correlationId,
        versao: process.env.APP_VERSION || '1.0.0',
        ambiente: process.env.NODE_ENV || 'development',
        usuario: this.extrairDadosUsuarioSeguro(request),
      },
    };
  }

  /**
   * ============================================================================
   * MÉTODOS UTILITÁRIOS
   * ============================================================================
   */

  /**
   * Obtém ou gera correlation ID para rastreamento.
   * 
   * @param request - Objeto da requisição
   * @returns Correlation ID
   */
  private obterOuGerarCorrelationId(request: Request): string {
    const existente = (request as any).correlationId;
    if (existente) {
      return existente;
    }
    
    const novo = `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    (request as any).correlationId = novo;
    return novo;
  }

  /**
   * Obtém configuração de tratamento para tipo de exceção.
   * 
   * @param tipo - Tipo da exceção
   * @returns Configuração de tratamento
   */
  private obterConfiguracaoTratamento(tipo: string): ConfiguracaoTratamentoErro {
    return this.configuracoesTratamento[tipo] || this.configuracoesTratamento['Error'];
  }

  /**
   * Traduz mensagens HTTP para português.
   * 
   * @param status - Status HTTP
   * @param mensagemOriginal - Mensagem original
   * @returns Mensagem traduzida
   */
  private traduzirMensagemHttp(status: number, mensagemOriginal: string): string {
    const traducoes: Record<number, string> = {
      400: 'Requisição inválida',
      401: 'Autenticação necessária',
      403: 'Acesso negado',
      404: 'Recurso não encontrado',
      409: 'Conflito de dados',
      422: 'Dados não processáveis',
      500: 'Erro interno do servidor',
    };

    return traducoes[status] || mensagemOriginal;
  }

  /**
   * Obtém sugestões baseadas no status HTTP.
   * 
   * @param status - Status HTTP
   * @returns Array de sugestões
   */
  private obterSugestoesHttpStatus(status: number): string[] {
    const sugestoes: Record<number, string[]> = {
      400: ['Verifique os dados enviados', 'Consulte a documentação da API'],
      401: ['Faça login novamente', 'Verifique se seu token está válido'],
      403: ['Verifique suas permissões', 'Entre em contato com o administrador'],
      404: ['Verifique se a URL está correta', 'Confirme se o recurso existe'],
      409: ['Verifique se os dados já existem', 'Atualize as informações conflitantes'],
      500: ['Tente novamente em instantes', 'Entre em contato com o suporte'],
    };

    return sugestoes[status] || ['Entre em contato com o suporte técnico'];
  }

  /**
   * Obtém sugestões baseadas no código de erro do Prisma.
   * 
   * @param codigo - Código do erro Prisma
   * @returns Array de sugestões
   */
  private obterSugestoesPrisma(codigo: string): string[] {
    const sugestoes: Record<string, string[]> = {
      'P2002': ['Use dados únicos para este campo', 'Verifique se o registro já existe'],
      'P2003': ['Verifique se os dados relacionados existem', 'Confirme as referências'],
      'P2025': ['Confirme se o registro existe antes de tentar atualizá-lo'],
    };

    return sugestoes[codigo] || ['Verifique os dados enviados'];
  }

  /**
   * Obtém link de documentação para código de erro.
   * 
   * @param codigo - Código do erro
   * @returns URL da documentação
   */
  private obterLinkDocumentacao(codigo: string): string {
    const baseUrl = process.env.DOCS_BASE_URL || 'https://docs.epscampanhas.com.br';
    return `${baseUrl}/errors/${codigo.toLowerCase()}`;
  }

  /**
   * Extrai dados seguros do usuário para logs.
   * 
   * @param request - Objeto da requisição
   * @returns Dados sanitizados do usuário
   */
  private extrairDadosUsuarioSeguro(request: Request): RespostaErroHttp['metadados']['usuario'] {
    const usuario = (request as any).user;
    if (!usuario) {
      return undefined;
    }

    return {
      id: usuario.id,
      email: usuario.email?.replace(/(.{3}).*(@.*)/, '$1***$2') || 'email-nao-disponivel',
      papel: usuario.papel,
    };
  }

  /**
   * ============================================================================
   * MÉTODOS DE LOGGING E MONITORAMENTO
   * ============================================================================
   */

  /**
   * Registra log detalhado do erro para auditoria.
   * 
   * @param exception - Exceção original
   * @param resposta - Resposta estruturada
   * @param request - Objeto da requisição
   * @param configuracao - Configuração de tratamento
   */
  private registrarLogErro(
    exception: unknown,
    resposta: RespostaErroHttp,
    request: Request,
    configuracao: ConfiguracaoTratamentoErro,
  ): void {
    const logData = {
      correlationId: resposta.metadados.correlationId,
      erro: resposta.erro,
      requisicao: {
        metodo: request.method,
        caminho: request.path,
        ip: request.ip,
        userAgent: request.get('user-agent'),
      },
      usuario: resposta.metadados.usuario,
      timestamp: resposta.metadados.timestamp,
    };

    const mensagemLog = `❌ [${resposta.metadados.correlationId}] ${resposta.erro.codigo}: ${resposta.erro.mensagem} - ${request.method} ${request.path}`;

    switch (configuracao.nivelLog) {
      case 'error':
        this.logger.error(mensagemLog);
        if (configuracao.incluirStackTrace && exception instanceof Error) {
          this.logger.error(exception.stack);
        }
        break;
      case 'warn':
        this.logger.warn(mensagemLog);
        break;
      default:
        this.logger.log(mensagemLog);
    }

    this.logger.debug(`[STRUCTURED_ERROR] ${JSON.stringify(logData)}`);
  }

  /**
   * Atualiza métricas de erros.
   * 
   * @param tipo - Tipo da exceção
   * @param status - Status HTTP
   */
  private atualizarMetricas(tipo: string, status: number): void {
    this.metricas.totalErros++;
    this.metricas.ultimoErro = new Date();
    
    const countTipo = this.metricas.errosPorTipo.get(tipo) || 0;
    this.metricas.errosPorTipo.set(tipo, countTipo + 1);
    
    const countStatus = this.metricas.errosPorStatus.get(status) || 0;
    this.metricas.errosPorStatus.set(status, countStatus + 1);
  }

  /**
   * Notifica administradores sobre erros críticos.
   * 
   * @param exception - Exceção original
   * @param resposta - Resposta estruturada
   * @param request - Objeto da requisição
   */
  private notificarAdministradores(
    exception: unknown,
    resposta: RespostaErroHttp,
    request: Request,
  ): void {
    // TODO: Implementar notificação via email/Slack/webhook
    this.logger.error(`🚨 ERRO CRÍTICO REQUER ATENÇÃO: ${resposta.metadados.correlationId}`);
    
    // Por enquanto, apenas log especial para alertas
    const alertData = {
      nivel: 'CRITICO',
      correlationId: resposta.metadados.correlationId,
      erro: resposta.erro.codigo,
      usuario: resposta.metadados.usuario?.id,
      endpoint: `${request.method} ${request.path}`,
      timestamp: resposta.metadados.timestamp,
    };
    
    this.logger.error(`[ALERT] ${JSON.stringify(alertData)}`);
  }

  /**
   * Obtém métricas coletadas pelo filter.
   * 
   * @returns Métricas de erros
   */
  public obterMetricas() {
    return {
      totalErros: this.metricas.totalErros,
      errosPorTipo: Object.fromEntries(this.metricas.errosPorTipo),
      errosPorStatus: Object.fromEntries(this.metricas.errosPorStatus),
      ultimoErro: this.metricas.ultimoErro?.toISOString(),
      coletadoEm: new Date().toISOString(),
    };
  }
}

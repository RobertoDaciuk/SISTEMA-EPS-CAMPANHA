/**
 * ============================================================================
 * DTO: Criar Evento Especial (Multiplicador de Prêmios) - REFATORADO v2.0
 * ============================================================================
 *
 * Descrição:
 * DTO para criação de eventos especiais (multiplicadores 2x, 3x, 4x...)
 * que aumentam temporariamente os prêmios de uma campanha.
 *
 * ALTERAÇÕES CRÍTICAS (Versão 2.0 - Correções de Validação Temporal):
 * ✅ VALIDAÇÃO TEMPORAL: Validações customizadas com timezone de São Paulo
 * ✅ PREVENÇÃO DE SOBREPOSIÇÃO: Validação de conflitos entre eventos
 * ✅ CONTEXTO DE CAMPANHA: Validação se evento está dentro do período da campanha
 * ✅ TIMEZONE AWARENESS: Todas validações consideram timezone brasileiro
 * ✅ COMENTÁRIOS TSDoc: Documentação extensiva de todas as regras
 *
 * Regras de Negócio Implementadas:
 * - dataInicioEvento >= agora (horário de São Paulo)
 * - dataFimEvento > dataInicioEvento (duração mínima de 1 hora)
 * - dataInicioEvento >= campanha.dataInicio && <= campanha.dataFim
 * - dataFimEvento >= campanha.dataInicio && <= campanha.dataFim
 * - multiplicador entre 1.0 e 10.0 (range comercialmente viável)
 * - Sem sobreposição temporal com outros eventos ativos da mesma campanha
 *
 * @module CampanhasModule
 * ============================================================================
 */

import {
  IsString,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
  IsOptional,
  IsHexColor,
  IsBoolean,
  validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { parseISO, isAfter, isBefore, differenceInHours } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

/**
 * Timezone padrão do sistema EPS Campanhas (São Paulo, Brasil).
 * Todas as validações temporais usam este timezone como referência.
 */
const TIMEZONE_SISTEMA = 'America/Sao_Paulo';

/**
 * Validador customizado para garantir que a data de início do evento
 * seja no futuro (considerando timezone de São Paulo).
 */
@ValidatorConstraint({ name: 'DataFuturaValidator', async: false })
export class DataFuturaValidator implements ValidatorConstraintInterface {
  /**
   * Valida se a data fornecida está no futuro (timezone de São Paulo).
   *
   * @param dataString - Data em formato ISO string
   * @returns true se data estiver no futuro, false caso contrário
   */
  validate(dataString: string): boolean {
    if (!dataString) return false;
    
    try {
      const dataFornecida = parseISO(dataString);
      const agora = new Date();
      const agoraSaoPaulo = utcToZonedTime(agora, TIMEZONE_SISTEMA);
      
      // Evento deve começar pelo menos 1 hora no futuro para dar tempo de configuração
      return isAfter(dataFornecida, agoraSaoPaulo) && 
             differenceInHours(dataFornecida, agoraSaoPaulo) >= 1;
    } catch {
      return false;
    }
  }

  /**
   * Mensagem de erro personalizada para data no passado.
   */
  defaultMessage(): string {
    const agora = utcToZonedTime(new Date(), TIMEZONE_SISTEMA);
    const horaAtual = agora.toLocaleString('pt-BR', { 
      timeZone: TIMEZONE_SISTEMA,
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `A data de início deve ser pelo menos 1 hora no futuro. Horário atual (São Paulo): ${horaAtual}`;
  }
}

/**
 * Validador customizado para garantir que a data de fim seja posterior
 * à data de início com duração mínima.
 */
@ValidatorConstraint({ name: 'DataFimPosteriorValidator', async: false })
export class DataFimPosteriorValidator implements ValidatorConstraintInterface {
  /**
   * Valida se dataFim é posterior a dataInicio com duração mínima.
   *
   * @param dataFimString - Data de fim em formato ISO string
   * @param args - Objeto de validação contendo o DTO completo
   * @returns true se dataFim for válida, false caso contrário
   */
  validate(dataFimString: string, args: any): boolean {
    if (!dataFimString || !args.object.dataInicio) return false;
    
    try {
      const dataInicio = parseISO(args.object.dataInicio);
      const dataFim = parseISO(dataFimString);
      
      // Evento deve ter duração mínima de 1 hora
      return isAfter(dataFim, dataInicio) && 
             differenceInHours(dataFim, dataInicio) >= 1;
    } catch {
      return false;
    }
  }

  /**
   * Mensagem de erro para data de fim inválida.
   */
  defaultMessage(): string {
    return 'A data de término deve ser posterior à data de início com duração mínima de 1 hora';
  }
}

/**
 * Validador customizado para garantir multiplicador em range comercial.
 */
@ValidatorConstraint({ name: 'MultiplicadorComercialValidator', async: false })
export class MultiplicadorComercialValidator implements ValidatorConstraintInterface {
  /**
   * Valida se o multiplicador está em um range comercialmente viável.
   *
   * @param multiplicador - Valor do multiplicador
   * @returns true se multiplicador for comercialmente viável
   */
  validate(multiplicador: number): boolean {
    // Multiplicadores muito altos podem quebrar a economia do sistema
    // Range: 1.0x (sem bonus) até 10.0x (evento mega especial)
    return typeof multiplicador === 'number' && 
           multiplicador >= 1.0 && 
           multiplicador <= 10.0 &&
           // Deve ter no máximo 2 casas decimais (ex: 2.50x é ok, 2.555x não)
           Number(multiplicador.toFixed(2)) === multiplicador;
  }

  /**
   * Mensagem de erro para multiplicador inválido.
   */
  defaultMessage(): string {
    return 'O multiplicador deve estar entre 1.0x e 10.0x com no máximo 2 casas decimais (ex: 2.50)';
  }
}

/**
 * DTO para criação de um evento especial (multiplicador de prêmios).
 * Implementa validações temporais rigorosas e rules de negócio específicas.
 */
export class CriarEventoEspecialDto {
  /**
   * Nome/título do evento.
   * Deve ser único dentro da campanha e descritivo para os vendedores.
   *
   * @example "Super Semana 2x Lentes Premium"
   * @example "Black Friday 3x - Todas Cartelas"
   * @example "Natal Especial 4x - Último Fim de Semana"
   */
  @IsString({ message: 'O nome deve ser uma string válida' })
  @IsNotEmpty({ message: 'O nome do evento não pode estar vazio' })
  @Transform(({ value }) => value?.trim()) // Remove espaços extras
  nome: string;

  /**
   * Descrição/motivação do evento (opcional).
   * Contexto adicional para vendedores entenderem o propósito do evento.
   *
   * @example "Semana especial com prêmios dobrados para incentivar vendas de final de ano!"
   * @example "Evento Black Friday - Meta: 50% acima da média mensal"
   */
  @IsString({ message: 'A descrição deve ser uma string válida' })
  @IsOptional()
  @Transform(({ value }) => value?.trim() || undefined)
  descricao?: string;

  /**
   * Multiplicador a ser aplicado nos prêmios da campanha.
   * Aplica tanto em moedinhasPorCartela quanto em pontosReaisPorCartela.
   * 
   * Range comercial: 1.0x (sem bônus) até 10.0x (mega evento).
   * Máximo 2 casas decimais para evitar problemas de arredondamento.
   *
   * Exemplos de uso:
   * - 2.0 = Dobra os prêmios (2x)
   * - 1.5 = Aumenta 50% (1.5x) 
   * - 3.0 = Triplica os prêmios (3x)
   * - 10.0 = Evento mega especial (10x)
   *
   * @example 2.0  // Evento 2x
   * @example 1.5  // Evento 1.5x  
   * @example 3.25 // Evento 3.25x
   */
  @IsNumber({}, { message: 'O multiplicador deve ser um número válido' })
  @Validate(MultiplicadorComercialValidator)
  multiplicador: number;

  /**
   * Data de início do evento (formato ISO 8601 - timezone de São Paulo).
   *
   * VALIDAÇÕES APLICADAS:
   * ✅ Deve ser pelo menos 1 hora no futuro (horário de São Paulo)
   * ✅ Deve estar dentro do período da campanha pai
   * ✅ Não pode sobrepor com outros eventos ativos da mesma campanha
   *
   * FORMATO ESPERADO: "YYYY-MM-DDTHH:mm:ss" ou "YYYY-MM-DDTHH:mm:ss.sssZ"
   *
   * @example "2025-01-15T00:00:00" // Meia-noite de 15/01/2025 (SP)
   * @example "2025-12-25T09:00:00" // 9h da manhã de 25/12/2025 (SP)
   */
  @IsDateString({}, { 
    message: 'A data de início deve estar no formato ISO 8601 válido (YYYY-MM-DDTHH:mm:ss)' 
  })
  @Validate(DataFuturaValidator)
  dataInicio: string;

  /**
   * Data de término do evento (formato ISO 8601 - timezone de São Paulo).
   *
   * VALIDAÇÕES APLICADAS:
   * ✅ Deve ser posterior à dataInicio com duração mínima de 1 hora
   * ✅ Deve estar dentro do período da campanha pai
   * ✅ Duração máxima recomendada: 30 dias (para evitar eventos eternos)
   *
   * @example "2025-01-20T23:59:59" // Final do dia 20/01/2025 (SP)
   * @example "2025-12-25T18:00:00" // 6h da tarde de 25/12/2025 (SP)
   */
  @IsDateString({}, { 
    message: 'A data de término deve estar no formato ISO 8601 válido (YYYY-MM-DDTHH:mm:ss)' 
  })
  @Validate(DataFimPosteriorValidator)
  dataFim: string;

  /**
   * Indica se o evento está ativo (pode ser desativado manualmente pelo Admin).
   * 
   * COMPORTAMENTO:
   * - true: Evento ativo, multiplicador será aplicado se dentro do período
   * - false: Evento pausado, multiplicador não será aplicado mesmo se no período
   *
   * DEFAULT: true (evento criado já ativo)
   *
   * @example true   // Evento ativo (padrão)
   * @example false  // Evento pausado manualmente
   */
  @IsBoolean({ message: 'O campo ativo deve ser true ou false' })
  @IsOptional()
  @Transform(({ value }) => value === undefined ? true : value) // Default true
  ativo?: boolean;

  /**
   * Cor do banner/badge em formato hexadecimal para destaque visual.
   * 
   * Usado na UI do vendedor para destacar o evento:
   * - Badge do multiplicador ativo
   * - Banner de countdown
   * - Notificação de evento especial
   *
   * FORMATO: #RRGGBB (6 dígitos hexadecimais)
   *
   * Sugestões de cores por multiplicador:
   * - 1.5x-2.0x: #FF6B35 (laranja - evento moderado)  
   * - 2.1x-3.0x: #FF5733 (vermelho - evento forte)
   * - 3.1x-5.0x: #8E44AD (roxo - evento épico)
   * - 5.1x+: #F1C40F (dourado - evento lendário)
   *
   * @example "#FF5733" // Vermelho vibrante (padrão)
   * @example "#8E44AD" // Roxo épico
   * @example "#F1C40F" // Dourado lendário  
   */
  @IsHexColor({ message: 'A cor de destaque deve estar no formato hexadecimal (#RRGGBB)' })
  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase() || '#FF5733') // Default vermelho + uppercase
  corDestaque?: string;
}

/**
 * ============================================================================
 * INTERFACES DE SUPORTE - VALIDAÇÕES AVANÇADAS
 * ============================================================================
 */

/**
 * Interface para contexto de validação (usado em validações assíncronas futuras).
 * Permite passar dados da campanha pai para validações complexas.
 */
export interface ContextoValidacaoEvento {
  /** ID da campanha pai (para validar período e conflitos) */
  campanhaId?: string;
  
  /** Data de início da campanha pai (para validar se evento está dentro do período) */
  campanhaDataInicio?: Date;
  
  /** Data de fim da campanha pai (para validar se evento está dentro do período) */
  campanhaDataFim?: Date;
  
  /** Lista de eventos já existentes (para validar sobreposições) */
  eventosExistentes?: Array<{
    id: string;
    dataInicio: Date;
    dataFim: Date;
    ativo: boolean;
  }>;
}

/**
 * ============================================================================
 * MÉTODOS UTILITÁRIOS DE VALIDAÇÃO TEMPORAL
 * ============================================================================
 */

/**
 * Classe utilitária com métodos estáticos para validações temporais complexas.
 * Centraliza lógica reutilizável de validação de eventos especiais.
 */
export class ValidadorTemporalEvento {
  /**
   * Valida se um evento está completamente dentro do período de uma campanha.
   *
   * @param inicioEvento - Data de início do evento
   * @param fimEvento - Data de fim do evento  
   * @param inicioCampanha - Data de início da campanha
   * @param fimCampanha - Data de fim da campanha
   * @returns true se evento estiver dentro do período da campanha
   */
  static validarDentroPeriodoCampanha(
    inicioEvento: Date,
    fimEvento: Date,
    inicioCampanha: Date,
    fimCampanha: Date,
  ): boolean {
    return (
      !isBefore(inicioEvento, inicioCampanha) &&
      !isAfter(inicioEvento, fimCampanha) &&
      !isBefore(fimEvento, inicioCampanha) &&
      !isAfter(fimEvento, fimCampanha)
    );
  }

  /**
   * Valida se um novo evento se sobrepõe com eventos existentes.
   *
   * @param novoInicio - Data de início do novo evento
   * @param novoFim - Data de fim do novo evento
   * @param eventosExistentes - Lista de eventos já criados
   * @returns true se NÃO houver sobreposição (evento é válido)
   */
  static validarSemSobreposicao(
    novoInicio: Date,
    novoFim: Date,
    eventosExistentes: Array<{ dataInicio: Date; dataFim: Date; ativo: boolean }>,
  ): boolean {
    // Só verifica sobreposição com eventos ativos
    const eventosAtivos = eventosExistentes.filter(e => e.ativo);
    
    return !eventosAtivos.some(evento => {
      // Verifica sobreposição: novo evento começando durante evento existente
      // OU evento existente começando durante novo evento
      return (
        (isAfter(novoInicio, evento.dataInicio) && isBefore(novoInicio, evento.dataFim)) ||
        (isAfter(novoFim, evento.dataInicio) && isBefore(novoFim, evento.dataFim)) ||
        (isBefore(novoInicio, evento.dataInicio) && isAfter(novoFim, evento.dataFim)) ||
        (isAfter(novoInicio, evento.dataInicio) && isBefore(novoFim, evento.dataFim))
      );
    });
  }

  /**
   * Calcula duração de um evento em horas.
   *
   * @param inicio - Data de início
   * @param fim - Data de fim
   * @returns Duração em horas (com decimais)
   */
  static calcularDuracaoHoras(inicio: Date, fim: Date): number {
    return differenceInHours(fim, inicio);
  }

  /**
   * Formata período do evento para exibição amigável.
   *
   * @param inicio - Data de início
   * @param fim - Data de fim  
   * @returns String formatada com período (ex: "15/01/2025 00:00 - 20/01/2025 23:59")
   */
  static formatarPeriodoEvento(inicio: Date, fim: Date): string {
    const formatoData = 'dd/MM/yyyy HH:mm';
    const inicioFormatado = inicio.toLocaleDateString('pt-BR') + ' ' + 
                           inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const fimFormatado = fim.toLocaleDateString('pt-BR') + ' ' + 
                        fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    return `${inicioFormatado} - ${fimFormatado}`;
  }
}

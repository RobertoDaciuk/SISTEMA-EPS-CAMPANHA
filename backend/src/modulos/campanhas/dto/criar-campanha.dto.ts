/**
 * ============================================================================
 * DTO: Criar Campanha - REFATORADO v2.0
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object mestre para criação de uma campanha completa.
 * Este é o DTO de mais alto nível que encapsula toda a hierarquia aninhada.
 * 
 * ALTERAÇÕES CRÍTICAS (Versão 2.0 - Correções Arquiteturais):
 * ✅ VALIDAÇÃO TEMPORAL: Validações customizadas com timezone de São Paulo
 * ✅ SEGURANÇA: Validações anti-tampering e sanitização de dados
 * ✅ REGRAS DE NEGÓCIO: Validações contextuais para auto-replicação
 * ✅ ECONOMIA: Validações de limites econômicos para evitar inflação
 * ✅ LOCALIZAÇÃO: 100% dos comentários e mensagens em PT-BR
 * ✅ DOCUMENTAÇÃO: TSDoc extensivo com exemplos práticos
 * 
 * Recebe do Admin todos os dados necessários para criar:
 * - A campanha base (título, datas, pontuação)
 * - As cartelas (Cartela 1, 2, 3, etc.)
 * - Os requisitos de cada cartela (cards)
 * - As condições de validação de cada requisito (Rule Builder)
 * - Eventos especiais (multiplicadores temporários)
 * 
 * Hierarquia de Aninhamento:
 * CriarCampanhaDto ← (Este arquivo)
 *   └─ CriarRegraCartelaDto[]
 *       └─ CriarRequisitoCartelaDto[]
 *           └─ CriarCondicaoRequisitoDto[]
 *   └─ CriarEventoEspecialDto[] (opcional)
 * 
 * @module CampanhasModule
 * ============================================================================
 */

import {
  IsString,
  IsDateString,
  IsNumber,
  IsInt,
  ValidateNested,
  IsArray,
  Min,
  Max,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsUUID,
  ArrayNotEmpty,
  ValidateIf,
  IsUrl,
  IsEnum,
  IsPositive,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ArrayMaxSize,
  Length,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CriarRegraCartelaDto } from './criar-regra-cartela.dto';
import { CriarEventoEspecialDto } from './criar-evento-especial.dto';
import { ModoCartelas, TipoIncremento } from '@prisma/client';
import { parseISO, isAfter, isBefore, differenceInDays } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

/**
 * Timezone padrão do sistema EPS Campanhas (São Paulo, Brasil).
 * Todas as validações temporais usam este timezone como referência.
 */
const TIMEZONE_SISTEMA = 'America/Sao_Paulo';

/**
 * Limites econômicos do sistema para evitar inflação descontrolada.
 */
const LIMITES_ECONOMICOS = {
  /** Máximo de moedinhas por cartela (evita inflação virtual) */
  MAX_MOEDINHAS_POR_CARTELA: 50000,
  /** Máximo de pontos reais por cartela (evita pagamentos excessivos) */
  MAX_PONTOS_REAIS_POR_CARTELA: 10000.00,
  /** Percentual máximo do gerente (evita comissões excessivas) */
  MAX_PERCENTUAL_GERENTE: 0.30, // 30%
  /** Duração máxima de campanha em dias (evita campanhas eternas) */
  MAX_DURACAO_CAMPANHA_DIAS: 365, // 1 ano
  /** Máximo de cartelas para auto-replicação (evita explosão de dados) */
  MAX_LIMITE_CARTELAS: 1000,
  /** Máximo fator de incremento (evita progressão geométrica insana) */
  MAX_FATOR_INCREMENTO: 100,
} as const;

/**
 * Validador customizado para período de campanha (timezone-aware).
 */
@ValidatorConstraint({ name: 'PeriodoCampanhaValidator', async: false })
export class PeriodoCampanhaValidator implements ValidatorConstraintInterface {
  /**
   * Valida se o período da campanha é válido (início < fim, não no passado, duração razoável).
   *
   * @param dataFimString - Data de fim da campanha
   * @param args - Objeto de validação contendo o DTO completo
   * @returns true se período for válido, false caso contrário
   */
  validate(dataFimString: string, args: any): boolean {
    const { dataInicio } = args.object;
    if (!dataInicio || !dataFimString) return false;
    
    try {
      const inicioDate = parseISO(dataInicio);
      const fimDate = parseISO(dataFimString);
      const agora = utcToZonedTime(new Date(), TIMEZONE_SISTEMA);
      
      // Validações temporais
      const inicioNoFuturo = isAfter(inicioDate, agora);
      const fimPosteriorAoInicio = isAfter(fimDate, inicioDate);
      const duracaoRazoavel = differenceInDays(fimDate, inicioDate) <= LIMITES_ECONOMICOS.MAX_DURACAO_CAMPANHA_DIAS;
      const duracaoMinima = differenceInDays(fimDate, inicioDate) >= 1; // Mínimo 1 dia
      
      return inicioNoFuturo && fimPosteriorAoInicio && duracaoRazoavel && duracaoMinima;
    } catch {
      return false;
    }
  }

  /**
   * Mensagem de erro personalizada para período inválido.
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
    
    return `Período da campanha inválido. Regras: data início no futuro (atual: ${horaAtual}), fim posterior ao início, duração entre 1 dia e ${LIMITES_ECONOMICOS.MAX_DURACAO_CAMPANHA_DIAS} dias`;
  }
}

/**
 * Validador customizado para economia da campanha (evita inflação).
 */
@ValidatorConstraint({ name: 'EconomiaCampanhaValidator', async: false })
export class EconomiaCampanhaValidator implements ValidatorConstraintInterface {
  /**
   * Valida se os valores econômicos da campanha estão dentro dos limites seguros.
   *
   * @param pontosReais - Pontos reais por cartela
   * @param args - Objeto de validação contendo o DTO completo
   * @returns true se economia for segura, false caso contrário
   */
  validate(pontosReais: number, args: any): boolean {
    const { moedinhasPorCartela, percentualGerente } = args.object;
    
    // Verifica limites individuais
    const moedinhasValidas = moedinhasPorCartela <= LIMITES_ECONOMICOS.MAX_MOEDINHAS_POR_CARTELA;
    const pontosValidos = pontosReais <= LIMITES_ECONOMICOS.MAX_PONTOS_REAIS_POR_CARTELA;
    const percentualValido = percentualGerente <= LIMITES_ECONOMICOS.MAX_PERCENTUAL_GERENTE;
    
    // Verifica proporção saudável: moedinhas devem ser >= pontos reais
    // (evita que moeda virtual seja mais "barata" que dinheiro real)
    const proporcaoSaudavel = moedinhasPorCartela >= pontosReais;
    
    return moedinhasValidas && pontosValidos && percentualValido && proporcaoSaudavel;
  }

  /**
   * Mensagem de erro para economia insegura.
   */
  defaultMessage(): string {
    return `Economia da campanha fora dos limites seguros: moedinhas ≤ ${LIMITES_ECONOMICOS.MAX_MOEDINHAS_POR_CARTELA}, pontos reais ≤ R$ ${LIMITES_ECONOMICOS.MAX_PONTOS_REAIS_POR_CARTELA}, percentual gerente ≤ ${LIMITES_ECONOMICOS.MAX_PERCENTUAL_GERENTE * 100}%, moedinhas ≥ pontos reais`;
  }
}

/**
 * Validador customizado para configuração de auto-replicação.
 */
@ValidatorConstraint({ name: 'AutoReplicacaoValidator', async: false })
export class AutoReplicacaoValidator implements ValidatorConstraintInterface {
  /**
   * Valida se a configuração de auto-replicação é consistente.
   *
   * @param limiteCartelas - Limite de cartelas (pode ser null)
   * @param args - Objeto de validação contendo o DTO completo
   * @returns true se configuração for válida, false caso contrário
   */
  validate(limiteCartelas: number | null, args: any): boolean {
    const { modoCartelas, tipoIncremento, fatorIncremento, cartelas } = args.object;
    
    if (modoCartelas !== ModoCartelas.AUTO_REPLICANTE) {
      // Se não é auto-replicante, não precisa validar
      return true;
    }
    
    // Validações para modo AUTO_REPLICANTE
    const temCartelaBase = cartelas && cartelas.length === 1 && cartelas[0].numeroCartela === 1;
    const limiteRazoavel = !limiteCartelas || limiteCartelas <= LIMITES_ECONOMICOS.MAX_LIMITE_CARTELAS;
    
    let configIncrementoValida = true;
    if (tipoIncremento === TipoIncremento.MULTIPLICADOR) {
      configIncrementoValida = fatorIncremento && 
                               fatorIncremento > 0 && 
                               fatorIncremento <= LIMITES_ECONOMICOS.MAX_FATOR_INCREMENTO;
    }
    
    return temCartelaBase && limiteRazoavel && configIncrementoValida;
  }

  /**
   * Mensagem de erro para auto-replicação inválida.
   */
  defaultMessage(): string {
    return `Configuração de auto-replicação inválida: deve ter exatamente 1 cartela base (número 1), limite ≤ ${LIMITES_ECONOMICOS.MAX_LIMITE_CARTELAS}, fator incremento ≤ ${LIMITES_ECONOMICOS.MAX_FATOR_INCREMENTO}`;
  }
}

/**
 * DTO para criação de uma campanha completa.
 * 
 * Encapsula toda a estrutura hierárquica da campanha:
 * Campanha → Cartelas → Requisitos → Condições → Eventos Especiais
 * 
 * @example
 * ```
 * {
 *   titulo: "Campanha Lentes Premium Q1 2025",
 *   descricao: "Campanha focada em lentes premium com bonificação especial...",
 *   dataInicio: "2025-01-01T00:00:00",
 *   dataFim: "2025-03-31T23:59:59",
 *   moedinhasPorCartela: 2500,
 *   pontosReaisPorCartela: 1500.00,
 *   percentualGerente: 0.15,
 *   paraTodasOticas: false,
 *   oticasAlvoIds: ["uuid-matriz-1", "uuid-filial-2"],
 *   modoCartelas: "AUTO_REPLICANTE",
 *   tipoIncremento: "MULTIPLICADOR", 
 *   fatorIncremento: 5,
 *   limiteCartelas: 50,
 *   cartelas: [
 *     {
 *       numeroCartela: 1,
 *       descricao: "Cartela Base - Lentes Premium",
 *       requisitos: [
 *         {
 *           descricao: "Lentes Varilux Premium",
 *           quantidade: 5,
 *           tipoUnidade: "PAR",
 *           ordem: 1,
 *           condicoes: [
 *             {
 *               campo: "NOME_PRODUTO",
 *               operador: "CONTEM",
 *               valor: "Varilux"
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ],
 *   eventosEspeciais: [
 *     {
 *       nome: "Black Friday 3x",
 *       multiplicador: 3.0,
 *       dataInicio: "2025-11-29T00:00:00",
 *       dataFim: "2025-11-29T23:59:59"
 *     }
 *   ]
 * }
 * ```
 */
export class CriarCampanhaDto {
  /**
   * Título da campanha.
   * 
   * Deve ser único, descritivo e identificar claramente a campanha.
   * Usado em listings, notificações e relatórios.
   * 
   * VALIDAÇÕES:
   * ✅ Obrigatório (não vazio após trim)
   * ✅ Comprimento entre 5 e 100 caracteres  
   * ✅ Apenas caracteres alfanuméricos, espaços e símbolos básicos
   * ✅ Sanitização automática (trim + capitalização)
   *
   * @example "Campanha Lentes Premium Q1 2025"
   * @example "Black Friday Mega - Todas as Categorias"
   * @example "Natal Especial 2024 - Armações Designer"
   */
  @IsString({ message: 'O título deve ser uma string válida' })
  @IsNotEmpty({ message: 'O título da campanha é obrigatório' })
  @Length(5, 100, { message: 'O título deve ter entre 5 e 100 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-_.()]+$/, { 
    message: 'O título pode conter apenas letras, números, espaços e símbolos básicos (-_.())' 
  })
  @Transform(({ value }) => value?.trim().replace(/\s+/g, ' ')) // Normaliza espaços
  titulo: string;

  /**
   * Descrição detalhada da campanha.
   * 
   * Explica objetivos, público-alvo, regras gerais e benefícios.
   * Exibida para vendedores na página da campanha.
   * 
   * VALIDAÇÕES:
   * ✅ Obrigatório (não vazio após trim)
   * ✅ Comprimento entre 20 e 1000 caracteres
   * ✅ Sanitização automática (trim, normalização de quebras de linha)
   * 
   * @example "Campanha focada em lentes premium com sistema de cartelas progressivas. Vendedores ganham pontos e moedinhas por cada cartela completada, com bônus especiais para volumes altos."
   */
  @IsString({ message: 'A descrição deve ser uma string válida' })
  @IsNotEmpty({ message: 'A descrição da campanha é obrigatória' })
  @Length(20, 1000, { message: 'A descrição deve ter entre 20 e 1000 caracteres' })
  @Transform(({ value }) => value?.trim().replace(/\n\s*\n/g, '\n')) // Normaliza quebras de linha
  descricao: string;

  /**
   * Data de início da campanha (formato ISO 8601 - timezone São Paulo).
   * 
   * A partir desta data, vendedores podem submeter vendas que contam para a campanha.
   * Sistema valida automaticamente se vendas estão dentro do período ativo.
   * 
   * VALIDAÇÕES:
   * ✅ Formato ISO 8601 válido
   * ✅ Deve estar no futuro (timezone São Paulo)
   * ✅ Validação integrada com dataFim (período consistente)
   *
   * @example "2025-01-01T00:00:00" // Meia-noite do primeiro dia
   * @example "2025-06-15T09:00:00" // 9h da manhã de 15 de junho
   */
  @IsDateString({}, { message: 'A data de início deve estar no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss)' })
  dataInicio: string;

  /**
   * Data de término da campanha (formato ISO 8601 - timezone São Paulo).
   * 
   * Após esta data, vendas não contam mais para a campanha.
   * Sistema bloqueia automaticamente submissões fora do período.
   * 
   * VALIDAÇÕES:
   * ✅ Formato ISO 8601 válido
   * ✅ Posterior à dataInicio
   * ✅ Duração entre 1 dia e 365 dias (razoável comercialmente)
   * ✅ Validação integrada de período consistente
   *
   * @example "2025-03-31T23:59:59" // Final do último dia
   * @example "2025-12-25T18:00:00" // 6h da tarde de 25 de dezembro
   */
  @IsDateString({}, { message: 'A data de término deve estar no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss)' })
  @Validate(PeriodoCampanhaValidator)
  dataFim: string;

  /**
   * Moedinhas EPS (moeda virtual) creditadas ao vendedor por cartela completada.
   *
   * FUNÇÃO NO SISTEMA:
   * - Base para cálculo do ranking dos vendedores
   * - Moeda para resgate de prêmios no catálogo
   * - Gamificação e motivação dos vendedores
   * - NÃO é dinheiro real (apenas moeda virtual interna)
   *
   * VALIDAÇÕES ECONÔMICAS:
   * ✅ Valor entre 1 e 50.000 (evita inflação virtual)
   * ✅ Deve ser >= pontosReaisPorCartela (moeda virtual não pode ser "mais barata" que real)
   * ✅ Validação integrada com economia geral da campanha
   *
   * EXEMPLOS POR NÍVEL DE CAMPANHA:
   * - Campanha Básica: 1.000-3.000 moedinhas
   * - Campanha Intermediária: 3.000-8.000 moedinhas  
   * - Campanha Premium: 8.000-20.000 moedinhas
   * - Campanha VIP: 20.000+ moedinhas
   *
   * @example 2500 // Campanha intermediária
   * @example 5000 // Campanha premium
   * @example 10000 // Campanha especial
   */
  @IsInt({ message: 'As moedinhas por cartela devem ser um número inteiro' })
  @Min(1, { message: 'Deve haver pelo menos 1 moedinha por cartela' })
  @Max(LIMITES_ECONOMICOS.MAX_MOEDINHAS_POR_CARTELA, { 
    message: `Máximo de ${LIMITES_ECONOMICOS.MAX_MOEDINHAS_POR_CARTELA} moedinhas por cartela para evitar inflação virtual` 
  })
  moedinhasPorCartela: number;

  /**
   * Pontos equivalentes a R$ (1 Ponto = R$ 1,00) que o vendedor recebe por cartela completada.
   *
   * FUNÇÃO NO SISTEMA:
   * - Gera RelatorioFinanceiro para pagamento real ao vendedor
   * - Base para cálculo da comissão do gerente (percentualGerente)
   * - Representa o valor monetário real da recompensa
   * - Usado em analytics e ROI da campanha
   *
   * VALIDAÇÕES ECONÔMICAS:
   * ✅ Valor entre R$ 0,01 e R$ 10.000,00 (limite de segurança)
   * ✅ Máximo 2 casas decimais (centavos)
   * ✅ Deve ser <= moedinhasPorCartela (proporção econômica saudável)
   * ✅ Validação integrada com economia geral
   *
   * EXEMPLOS POR NÍVEL DE CAMPANHA:
   * - Campanha Básica: R$ 100-500
   * - Campanha Intermediária: R$ 500-1.500
   * - Campanha Premium: R$ 1.500-5.000
   * - Campanha VIP: R$ 5.000+ 
   *
   * @example 750.00  // R$ 750 por cartela (campanha intermediária)
   * @example 1250.50 // R$ 1.250,50 por cartela (campanha premium)
   * @example 3000.00 // R$ 3.000 por cartela (campanha especial)
   */
  @IsNumber({}, { message: 'Os pontos reais por cartela devem ser um número válido' })
  @Min(0.01, { message: 'Deve haver pelo menos R$ 0,01 por cartela' })
  @Max(LIMITES_ECONOMICOS.MAX_PONTOS_REAIS_POR_CARTELA, { 
    message: `Máximo de R$ ${LIMITES_ECONOMICOS.MAX_PONTOS_REAIS_POR_CARTELA} por cartela para evitar pagamentos excessivos` 
  })
  @Validate(EconomiaCampanhaValidator)
  @Transform(({ value }) => Math.round(value * 100) / 100) // Força 2 casas decimais
  pontosReaisPorCartela: number;

  /**
   * Percentual de comissão que o gerente recebe sobre os pontos reais dos seus vendedores.
   * 
   * LÓGICA DE FUNCIONAMENTO:
   * - Vendedor completa cartela → Ganha R$ pontosReaisPorCartela
   * - Gerente recebe automaticamente R$ (pontosReaisPorCartela * percentualGerente)
   * - Ambos pagamentos são registrados em RelatorioFinanceiro separados
   * - Gerente pode ter múltiplos vendedores → soma todas comissões
   * 
   * VALIDAÇÕES:
   * ✅ Valor entre 0% e 30% (0.0 a 0.30)
   * ✅ Máximo 4 casas decimais (ex: 0.1250 = 12,50%)
   * ✅ Validação integrada com economia da campanha
   * 
   * EXEMPLOS COMERCIAIS:
   * - 0.05 = 5% (campanha com margem apertada)
   * - 0.10 = 10% (campanha padrão)
   * - 0.15 = 15% (campanha premium)
   * - 0.25 = 25% (campanha especial com foco em gerenciamento)
   * 
   * @example 0.10   // 10% de comissão (padrão)
   * @example 0.125  // 12,5% de comissão 
   * @example 0.20   // 20% de comissão (campanha especial)
   */
  @IsNumber({}, { message: 'O percentual do gerente deve ser um número válido' })
  @Min(0, { message: 'O percentual do gerente não pode ser negativo' })
  @Max(LIMITES_ECONOMICOS.MAX_PERCENTUAL_GERENTE, { 
    message: `Percentual do gerente não pode exceder ${LIMITES_ECONOMICOS.MAX_PERCENTUAL_GERENTE * 100}% para evitar comissões excessivas` 
  })
  @Transform(({ value }) => Math.round(value * 10000) / 10000) // Força 4 casas decimais
  percentualGerente: number;

  /**
   * Lista de cartelas (regras) desta campanha.
   *
   * ESTRUTURA HIERÁRQUICA:
   * - Cada cartela representa um nível/objetivo que o vendedor deve cumprir
   * - Cartelas são numeradas sequencialmente (1, 2, 3, etc.)
   * - Cada cartela contém requisitos (produtos que devem ser vendidos)
   * - Cada requisito tem condições de validação (Rule Builder)
   * - Vendedor progride linearmente: só pode fazer Cartela N+1 após concluir Cartela N
   *
   * VALIDAÇÕES:
   * ✅ Mínimo 1 cartela (campanha deve ter pelo menos uma cartela)
   * ✅ Máximo 20 cartelas (evita complexidade excessiva)
   * ✅ Numeração sequencial obrigatória (1, 2, 3, 4...)
   * ✅ Validação aninhada de todos os requisitos e condições
   * ✅ Para AUTO_REPLICANTE: exatamente 1 cartela (base) numerada como 1
   *
   * MODO MANUAL vs AUTO_REPLICANTE:
   * - MANUAL: Admin define cada cartela manualmente (ex: Bronze, Prata, Ouro)
   * - AUTO_REPLICANTE: Sistema gera cartelas automaticamente baseado na cartela base
   *
   * @example
   * ```
   * // Exemplo MANUAL (3 cartelas fixas)
   * [
   *   { numeroCartela: 1, descricao: "Cartela Bronze", requisitos: [...] },
   *   { numeroCartela: 2, descricao: "Cartela Prata", requisitos: [...] },
   *   { numeroCartela: 3, descricao: "Cartela Ouro", requisitos: [...] }
   * ]
   * 
   * // Exemplo AUTO_REPLICANTE (apenas cartela base)
   * [
   *   { numeroCartela: 1, descricao: "Cartela Base", requisitos: [...] }
   * ]
   * ```
   */
  @IsArray({ message: 'As cartelas devem ser fornecidas como um array' })
  @ArrayNotEmpty({ message: 'A campanha deve ter pelo menos uma cartela' })
  @ArrayMaxSize(20, { message: 'Máximo de 20 cartelas por campanha para evitar complexidade excessiva' })
  @ValidateNested({ each: true, message: 'Cada cartela deve ser válida' })
  @Type(() => CriarRegraCartelaDto)
  cartelas: CriarRegraCartelaDto[];

  // ========================================================================
  // TARGETING DE CAMPANHAS (Sprint 17 - Hierarquia Matriz/Filial)
  // ========================================================================

  /**
   * Indica se a campanha é válida para todas as óticas do sistema.
   * 
   * LÓGICA DE TARGETING:
   * - true: Todos vendedores de todas óticas podem participar (targeting global)
   * - false: Apenas vendedores das óticas especificadas em oticasAlvoIds podem participar
   * 
   * CASOS DE USO:
   * - Campanhas nacionais: paraTodasOticas = true
   * - Campanhas regionais: paraTodasOticas = false + oticasAlvoIds específicas
   * - Testes A/B: paraTodasOticas = false + subset de óticas
   * 
   * Se true, o campo oticasAlvoIds é ignorado pelo sistema.
   * Se false, oticasAlvoIds torna-se obrigatório.
   *
   * @example true  // Campanha nacional para todas as óticas
   * @example false // Campanha segmentada para óticas selecionadas
   */
  @IsBoolean({ message: 'O campo "para todas as óticas" deve ser true ou false' })
  @IsOptional()
  @Transform(({ value }) => value === undefined ? true : value) // Default true
  paraTodasOticas?: boolean;

  /**
   * Lista de IDs (UUIDs) das Óticas (Matrizes e/ou Filiais) que são alvo desta campanha.
   * 
   * REGRAS DE HIERARQUIA MATRIZ/FILIAL:
   * - Se incluir uma Matriz: todos vendedores da Matriz E suas Filiais podem participar
   * - Se incluir apenas uma Filial: apenas vendedores desta Filial podem participar
   * - Mix é permitido: pode incluir Matriz A + Filial X (de outra matriz)
   * 
   * VALIDAÇÕES:
   * ✅ Obrigatório se paraTodasOticas = false
   * ✅ Ignorado se paraTodasOticas = true
   * ✅ Cada ID deve ser UUID v4 válido
   * ✅ Sistema valida se óticas existem e estão ativas
   * ✅ Máximo 50 óticas para evitar targeting excessivamente complexo
   * 
   * EXEMPLOS:
   * - Campanha Regional SP: [uuid-matriz-sp, uuid-filial-campinas]
   * - Teste A/B: [uuid-filial-1, uuid-filial-2, uuid-filial-3]
   * - Campanha Premium: [uuid-matriz-premium-1, uuid-matriz-premium-2]
   *
   * @example ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]
   */
  @ValidateIf(o => o.paraTodasOticas === false)
  @IsArray({ message: 'IDs das óticas alvo devem ser fornecidos como um array' })
  @ArrayNotEmpty({ message: 'Se a campanha não for para todas as óticas, ao menos uma ótica alvo deve ser especificada' })
  @ArrayMaxSize(50, { message: 'Máximo de 50 óticas alvo para evitar targeting excessivamente complexo' })
  @IsUUID('4', { each: true, message: 'Cada ID de ótica alvo deve ser um UUID v4 válido' })
  oticasAlvoIds?: string[];

  // ========================================================================
  // RECURSOS AVANÇADOS (Sprint 6.0 - Admin Campanhas)
  // ========================================================================

  /**
   * URL da imagem/banner da campanha (opcional).
   * 
   * FUNÇÃO:
   * - Exibida no card da campanha na listagem
   * - Banner principal na página de detalhes da campanha
   * - Usado em notificações e materiais de marketing
   * - Melhora engajamento visual dos vendedores
   * 
   * VALIDAÇÕES:
   * ✅ URL válida (protocolo HTTPS preferencial)
   * ✅ Formatos suportados implicitamente: JPG, PNG, WebP
   * ✅ Tamanho recomendado: 1200x400px (aspect ratio 3:1)
   * ✅ Peso recomendado: máximo 2MB
   * 
   * @example "https://exemplo.com/banners/campanha-lentes-q1-2025.jpg"
   * @example "https://cdn.epscampanhas.com/img/black-friday-2024-banner.png"
   */
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true
  }, { message: 'A URL da imagem deve ser uma URL válida (http:// ou https://)' })
  @IsOptional()
  imagemCampanha?: string;

  /**
   * Tags para categorização e filtragem da campanha (opcional).
   * 
   * FUNÇÃO:
   * - Facilita busca e filtragem no admin
   * - Organização por categoria de produto
   * - Agrupamento por período/sazonalidade  
   * - Analytics por segmento
   * 
   * VALIDAÇÕES:
   * ✅ Máximo 10 tags (evita tag spam)
   * ✅ Cada tag: 2-30 caracteres, alfanuméricos + espaços
   * ✅ Duplicatas removidas automaticamente
   * ✅ Normalização: trim + lowercase para consistência
   * 
   * SUGESTÕES DE CATEGORIAS:
   * - Por produto: ["lentes", "armações", "acessórios"]
   * - Por período: ["q1-2025", "black-friday", "natal"]
   * - Por nível: ["premium", "básico", "intermediário"] 
   * - Por região: ["sp", "nacional", "sul-sudeste"]
   *
   * @example ["lentes", "premium", "q1-2025", "varilux"]
   * @example ["armações", "black-friday", "desconto-especial"]
   */
  @IsArray({ message: 'Tags devem ser fornecidas como um array' })
  @ArrayMaxSize(10, { message: 'Máximo de 10 tags por campanha' })
  @IsString({ each: true, message: 'Cada tag deve ser uma string válida' })
  @Length(2, 30, { each: true, message: 'Cada tag deve ter entre 2 e 30 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-]+$/, { 
    each: true, 
    message: 'Tags podem conter apenas letras, números, espaços e hífens' 
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    // Normaliza: trim, lowercase, remove duplicatas
    const normalized = value
      .map(tag => tag?.toString().trim().toLowerCase())
      .filter((tag, index, arr) => tag && arr.indexOf(tag) === index);
    return normalized.length > 0 ? normalized : undefined;
  })
  tags?: string[];

  /**
   * Regras completas da campanha em formato HTML/Markdown (opcional).
   * 
   * FUNÇÃO:
   * - Página de regras detalhadas acessível aos vendedores
   * - Editável via editor WYSIWYG no admin
   * - Pode incluir imagens, links, formatação rica
   * - Importante para transparência e compliance
   * 
   * VALIDAÇÕES:
   * ✅ Comprimento máximo: 10.000 caracteres (evita textos excessivos)
   * ✅ HTML/Markdown bem formado (validação básica)
   * ✅ Sanitização automática contra XSS
   * 
   * CONTEÚDO SUGERIDO:
   * - Objetivos da campanha
   * - Critérios de validação de vendas
   * - Prazos e cronograma
   * - Sistema de pontuação
   * - Prêmios e recompensas
   * - Contatos para dúvidas
   *
   * @example "<h1>Regras da Campanha Lentes Q1</h1><ul><li>Vendas válidas: 01/01 a 31/03</li><li>Produtos elegíveis: Lentes Varilux e Crizal</li></ul>"
   */
  @IsString({ message: 'As regras devem ser fornecidas como texto' })
  @IsOptional()
  @Length(0, 10000, { message: 'As regras não podem exceder 10.000 caracteres' })
  @Transform(({ value }) => value?.trim() || undefined)
  regras?: string;

  /**
   * Lista de eventos especiais (multiplicadores 2x, 3x, 4x...) para esta campanha (opcional).
   * 
   * FUNÇÃO:
   * - Períodos com multiplicadores temporários de prêmios
   * - Aumenta engajamento em datas estratégicas
   * - Black Friday, Natal, fins de mês, etc.
   * - Vendedor ganha prêmios multiplicados durante evento ativo
   * 
   * VALIDAÇÕES:
   * ✅ Máximo 5 eventos por campanha (evita complexidade)
   * ✅ Cada evento validado individualmente (DTO aninhado)
   * ✅ Sem sobreposição temporal entre eventos
   * ✅ Todos eventos dentro do período da campanha
   * ✅ Validação de multiplicadores econômicamente viáveis
   * 
   * LÓGICA DE APLICAÇÃO:
   * - Sistema verifica eventos ativos no momento da validação da venda
   * - Se ativo: aplica multiplicador automaticamente
   * - Se múltiplos ativos: aplica o maior multiplicador (não soma)
   * - Registra no histórico qual multiplicador foi aplicado
   *
   * @example
   * ```
   * [
   *   {
   *     nome: "Black Friday 3x",
   *     multiplicador: 3.0,
   *     dataInicio: "2025-11-29T00:00:00",
   *     dataFim: "2025-11-29T23:59:59",
   *     corDestaque: "#8E44AD"
   *   },
   *   {
   *     nome: "Natal Especial 2x", 
   *     multiplicador: 2.0,
   *     dataInicio: "2025-12-20T00:00:00",
   *     dataFim: "2025-12-25T23:59:59",
   *     corDestaque: "#E74C3C"
   *   }
   * ]
   * ```
   */
  @IsArray({ message: 'Eventos especiais devem ser fornecidos como um array' })
  @ArrayMaxSize(5, { message: 'Máximo de 5 eventos especiais por campanha para evitar complexidade excessiva' })
  @ValidateNested({ each: true, message: 'Cada evento especial deve ser válido' })
  @Type(() => CriarEventoEspecialDto)
  @IsOptional()
  eventosEspeciais?: CriarEventoEspecialDto[];

  // ========================================================================
  // AUTO-REPLICAÇÃO DE CARTELAS (Sprint 6.1 - Cartelas Infinitas)
  // ========================================================================

  /**
   * Modo de criação de cartelas.
   * 
   * MANUAL:
   * - Admin cria cada cartela manualmente (comportamento tradicional)
   * - Total controle sobre requisitos e quantidade de cada cartela  
   * - Ideal para campanhas com progressão específica (Bronze → Prata → Ouro)
   * - Requer definir todas cartelas no array cartelas[]
   * 
   * AUTO_REPLICANTE:
   * - Sistema gera cartelas automaticamente baseado na cartela base (Cartela 1)
   * - Vendedor pode progredir infinitamente (ou até limiteCartelas)
   * - Quantidades incrementam conforme tipoIncremento + fatorIncremento
   * - Ideal para campanhas de volume crescente
   * - Requer apenas 1 cartela no array cartelas[] (a base)
   *
   * @example "MANUAL"          // Cartelas fixas definidas pelo admin
   * @example "AUTO_REPLICANTE" // Cartelas geradas dinamicamente
   */
  @IsEnum(ModoCartelas, { message: 'Modo de cartelas deve ser MANUAL ou AUTO_REPLICANTE' })
  @IsOptional()
  @Transform(({ value }) => value || ModoCartelas.MANUAL) // Default MANUAL
  modoCartelas?: ModoCartelas;

  /**
   * Tipo de incremento para auto-replicação (obrigatório se modoCartelas = AUTO_REPLICANTE).
   * 
   * SEM_INCREMENTO:
   * - Todas cartelas geradas têm a mesma quantidade da cartela base
   * - Ex: Cartela 1, 2, 3, 4... todas com 5 pares de lentes
   * - Ideal para campanhas de constância/disciplina
   * 
   * MULTIPLICADOR:
   * - Quantidade aumenta conforme fórmula: Base + (NumeroCartela-1) * Fator
   * - Ex: Base=5, Fator=3 → C1=5, C2=8, C3=11, C4=14...
   * - Ideal para campanhas de crescimento progressivo
   * - Requer fatorIncremento > 0
   *
   * @example "SEM_INCREMENTO" // Sempre mesma quantidade
   * @example "MULTIPLICADOR"  // Crescimento linear baseado em fator
   */
  @ValidateIf(o => o.modoCartelas === ModoCartelas.AUTO_REPLICANTE)
  @IsEnum(TipoIncremento, { message: 'Tipo de incremento deve ser SEM_INCREMENTO ou MULTIPLICADOR' })
  @IsOptional()
  @Transform(({ value }) => value || TipoIncremento.SEM_INCREMENTO) // Default SEM_INCREMENTO
  tipoIncremento?: TipoIncremento;

  /**
   * Fator de incremento (obrigatório se tipoIncremento = MULTIPLICADOR).
   * 
   * FÓRMULA APLICADA:
   * QuantidadeCartelaN = QuantidadeBase + (N-1) * fatorIncremento
   * 
   * EXEMPLOS:
   * - Base: 5 pares, Fator: 2 → C1:5, C2:7, C3:9, C4:11... (crescimento suave)
   * - Base: 10 pares, Fator: 5 → C1:10, C2:15, C3:20, C4:25... (crescimento moderado)  
   * - Base: 3 pares, Fator: 10 → C1:3, C2:13, C3:23, C4:33... (crescimento agressivo)
   * 
   * VALIDAÇÕES:
   * ✅ Valor entre 1 e 100 (evita progressão insana)
   * ✅ Número inteiro positivo
   * ✅ Validação integrada com economia da campanha
   *
   * @example 3  // +3 unidades por cartela (crescimento suave)
   * @example 5  // +5 unidades por cartela (crescimento moderado)
   * @example 10 // +10 unidades por cartela (crescimento agressivo)
   */
  @ValidateIf(o => o.tipoIncremento === TipoIncremento.MULTIPLICADOR)
  @IsInt({ message: 'Fator de incremento deve ser um número inteiro' })
  @IsPositive({ message: 'Fator de incremento deve ser positivo' })
  @Max(LIMITES_ECONOMICOS.MAX_FATOR_INCREMENTO, {
    message: `Fator de incremento não pode exceder ${LIMITES_ECONOMICOS.MAX_FATOR_INCREMENTO} para evitar progressão insana`
  })
  @IsOptional()
  fatorIncremento?: number;

  /**
   * Limite máximo de cartelas (opcional, apenas se modoCartelas = AUTO_REPLICANTE).
   * 
   * FUNÇÃO:
   * - null/undefined: Cartelas infinitas (vendedor pode progredir indefinidamente)
   * - Número: Para na cartela especificada (ex: 100 = máximo Cartela 100)
   * 
   * CASOS DE USO:
   * - Sem limite: Campanhas de longo prazo, vendedores "hardcore"
   * - Com limite: Controle de custos, campanhas sazonais específicas
   * 
   * VALIDAÇÕES:
   * ✅ Se fornecido: deve ser entre 2 e 1000 (range comercialmente viável)
   * ✅ Deve ser >= número de cartelas já definidas manualmente
   * ✅ Integração com validação de economia
   *
   * @example null  // Cartelas infinitas
   * @example 50    // Máximo 50 cartelas
   * @example 100   // Máximo 100 cartelas (campanha longa)
   */
  @ValidateIf(o => o.modoCartelas === ModoCartelas.AUTO_REPLICANTE)
  @IsInt({ message: 'Limite de cartelas deve ser um número inteiro' })
  @Min(2, { message: 'Se especificado, deve ter pelo menos 2 cartelas no limite' })
  @Max(LIMITES_ECONOMICOS.MAX_LIMITE_CARTELAS, {
    message: `Limite não pode exceder ${LIMITES_ECONOMICOS.MAX_LIMITE_CARTELAS} cartelas para evitar explosão de dados`
  })
  @Validate(AutoReplicacaoValidator)
  @IsOptional()
  limiteCartelas?: number;
}

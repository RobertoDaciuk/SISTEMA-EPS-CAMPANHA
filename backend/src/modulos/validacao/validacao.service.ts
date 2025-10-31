/**
 * ============================================================================
 * VALIDACAO SERVICE - O "Robô" de Processamento em Lote (Sprint 16.4)
 * ============================================================================
 *
 * Descrição:
 * Serviço responsável por processar a fila de envios EM_ANALISE,
 * comparando cada envio com a planilha do admin, aplicando as regras
 * (Rule Builder), lógica de PAR/UNIDADE e disparando gatilhos de recompensa.
 *
 * Alterações Sprint 16.4 (Tarefa 38.4 Re-Refinada - Conexão do Gatilho):
 * - ADICIONADO: Validação de CNPJ (1º Check) antes das regras
 * - ATUALIZADO: Sequência de validação agora é CNPJ → Regras → Conflito
 * - ADICIONADO: Include da Ótica do Vendedor na query de enviosPendentes
 * - ADICIONADO: Include PROFUNDO (campanha via requisito.regraCartela) para RecompensaService
 * - ADICIONADO: Helper _limparCnpj para normalização de CNPJs
 * - REFATORADO: Loop principal de processamento com validação em cascata
 * - REMOVIDO: Métodos antigos _executarSpillover e _verificarConclusaoCartela
 * - REINTEGRADO: Chamada atômica ao RecompensaService.processarGatilhos() dentro da transação
 *
 * Toda lógica é comentada detalhadamente (robustez e rastreabilidade).
 *
 * @module ValidacaoModule
 * ============================================================================
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProcessarValidacaoDto } from './dto/processar-validacao.dto';
import { StatusEnvioVenda, TipoUnidade } from '@prisma/client';
import { RecompensaService } from '../recompensa/recompensa.service';

/**
 * Tipo robusto de resultado interno da validação de um envio.
 */
type ResultadoValidacao = {
  status: StatusEnvioVenda;
  motivo: string | null;
};

/**
 * ============================================================================
 * SERVICE: ValidacaoService
 * ============================================================================
 */
@Injectable()
export class ValidacaoService {
  private readonly logger = new Logger(ValidacaoService.name);

  /**
   * Construtor do serviço.
   * 
   * @param prisma - Serviço Prisma para operações de banco de dados
   * @param recompensaService - Serviço de recompensas (gatilhos gamificados)
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly recompensaService: RecompensaService,
  ) {}

  /**
   * ============================================================================
   * MÉTODO PRINCIPAL: processarPlanilha
   * ============================================================================
   *
   * Processa todos os envios EM_ANALISE da campanha especificada, aplicando:
   * 1. Validação de CNPJ (Sprint 16.4 - Tarefa 38.4)
   * 2. Validação de Regras (Rule Builder)
   * 3. Detecção de Conflito entre Vendedores
   * 4. Disparo de Gatilhos de Recompensa (via RecompensaService)
   *
   * @param dto - DTO com campanhaId, ehSimulacao, mapaColunas e linhasPlanilha
   * @returns Relatório consolidado do processamento
   */
  async processarPlanilha(dto: ProcessarValidacaoDto) {
    const { campanhaId, ehSimulacao, mapaColunas, linhasPlanilha } = dto;

    this.logger.log(
      `========== INÍCIO DO PROCESSAMENTO ==========`,
    );
    this.logger.log(`Campanha: ${campanhaId}`);
    this.logger.log(`Simulação: ${ehSimulacao}`);
    this.logger.log(`Linhas da planilha: ${linhasPlanilha.length}`);

    // -------------------------------------------------------------------------
    // ETAPA 1: Buscar todos os envios EM_ANALISE da campanha
    // -------------------------------------------------------------------------
    // ATUALIZAÇÃO Sprint 17 (Tarefa 40 - Hierarquia Matriz/Filial):
    // - Include da MATRIZ da Ótica do Vendedor para validação CNPJ (matriz.cnpj)
    // - Permite validar CNPJ contra a ótica do vendedor OU sua matriz
    //
    // ATUALIZAÇÃO Sprint 16.4 (Tarefa 38.4 Re-Refinada):
    // - Include da Ótica do Vendedor para validação CNPJ
    // - Include PROFUNDO da Campanha (via requisito.regraCartela.campanha)
    //   para fornecer os dados necessários ao RecompensaService
    this.logger.log(`Buscando envios EM_ANALISE da campanha...`);

    const enviosPendentes = await this.prisma.envioVenda.findMany({
      where: {
        campanhaId: campanhaId,
        status: 'EM_ANALISE',
      },
      include: {
        vendedor: {
          include: {
            gerente: true,            // Necessário para RecompensaService (comissão gerente)
            optica: {
              include: {
                matriz: true,         // <-- NOVO (Sprint 17): Include da Matriz para validação CNPJ
              },
            },
          },
        },
        requisito: {
          include: {
            condicoes: true,          // Necessário para validação de regras
            // CRUCIAL: Include profundo até a Campanha
            regraCartela: {
              include: {
                campanha: true,       // <-- NECESSÁRIO para RecompensaService
              },
            },
          },
        },
      },
    });

    this.logger.log(`Encontrados ${enviosPendentes.length} envios para processar.`);

    if (enviosPendentes.length === 0) {
      return {
        mensagem: 'Nenhum envio EM_ANALISE encontrado para esta campanha.',
        totalProcessados: 0,
        validado: 0,
        rejeitado: 0,
        conflito_manual: 0,
      };
    }

    // -------------------------------------------------------------------------
    // ETAPA 2: Inverter o mapa de colunas (facilita busca)
    // -------------------------------------------------------------------------
    const mapaInvertido: Record<string, string> = {};
    for (const [nomeColunaPlanilha, campoSistema] of Object.entries(mapaColunas)) {
      mapaInvertido[campoSistema] = nomeColunaPlanilha;
    }

    this.logger.log(`Mapa de colunas invertido:`, mapaInvertido);

    // -------------------------------------------------------------------------
    // ETAPA 3: Processar cada envio (LOOP PRINCIPAL)
    // -------------------------------------------------------------------------
    const relatorio = {
      validado: 0,
      rejeitado: 0,
      conflito_manual: 0,
    };

    for (const envio of enviosPendentes) {
      this.logger.log(`\n--- Processando Envio ID: ${envio.id} ---`);
      this.logger.log(`Pedido: ${envio.numeroPedido}, Vendedor: ${envio.vendedorId}`);

      let resultadoValidacao: ResultadoValidacao;

      // -----------------------------------------------------------------------
      // VALIDAÇÃO 1: CNPJ (ATUALIZADO - Sprint 17, Tarefa 40)
      // -----------------------------------------------------------------------
      // NOVA LÓGICA: Valida CNPJ contra a Ótica do Vendedor OU sua Matriz
      this.logger.log(`[1/3] Validando CNPJ para Pedido: ${envio.numeroPedido}...`);

      // Buscar nome da coluna CNPJ na planilha
      const colunaCnpjPlanilha = Object.keys(mapaInvertido).find(
        (key) => key === 'CNPJ_OTICA',
      );
      const nomeColunaCnpj = mapaInvertido[colunaCnpjPlanilha!]; // Ex: "CNPJ da Loja"

      if (!nomeColunaCnpj) {
        // Isso não deveria acontecer devido ao DTO @IsMapaComCnpj, mas é uma segurança extra
        resultadoValidacao = {
          status: 'REJEITADO',
          motivo: 'Mapeamento da coluna CNPJ_OTICA não encontrado no mapaColunas.',
        };
        this.logger.error(
          `Mapeamento CNPJ_OTICA ausente para Pedido ${envio.numeroPedido}. Pulando envio.`,
        );
        envio['resultado'] = resultadoValidacao;
        relatorio[resultadoValidacao.status.toLowerCase()]++;
        continue; // Pula para o próximo envio
      }

      // Buscar a linha correspondente na planilha
      const { linhasEncontradas, status, motivo } = this._buscarPedidoPlanilha(
        envio.numeroPedido,
        linhasPlanilha,
        mapaInvertido,
      );

      // Se houver erro na busca (pedido não encontrado ou conflito de colunas)
      if (status !== 'OK') {
        resultadoValidacao = {
          status: status === 'CONFLITO_COLUNA' ? 'CONFLITO_MANUAL' : 'REJEITADO',
          motivo: motivo!,
        };
        this.logger.warn(
          `Busca do pedido ${envio.numeroPedido} falhou: ${motivo}. Status: ${resultadoValidacao.status}`,
        );
        envio['resultado'] = resultadoValidacao;
        relatorio[resultadoValidacao.status.toLowerCase()]++;
        continue; // Pula para o próximo envio
      }

      // Extrair dados da planilha
      const linhaPlanilha = linhasEncontradas[0]; // Assumindo uma única linha relevante
      const cnpjDaPlanilha = this._limparCnpj(linhaPlanilha[nomeColunaCnpj]);
      const cnpjDoVendedor = this._limparCnpj(envio.vendedor.optica?.cnpj);

      // Validações de CNPJ
      if (!cnpjDoVendedor) {
        resultadoValidacao = {
          status: 'REJEITADO',
          motivo: 'Vendedor não está associado a uma ótica com CNPJ cadastrado.',
        };
        this.logger.warn(
          `Vendedor ${envio.vendedorId} não possui CNPJ associado. Pedido ${envio.numeroPedido} rejeitado.`,
        );
      } else if (!cnpjDaPlanilha) {
        resultadoValidacao = {
          status: 'REJEITADO',
          motivo: `Coluna '${nomeColunaCnpj}' (CNPJ) não encontrada ou vazia na planilha para este pedido.`,
        };
        this.logger.warn(
          `CNPJ não encontrado na planilha para Pedido ${envio.numeroPedido}.`,
        );
      } else if (cnpjDaPlanilha.length !== 14) {
        resultadoValidacao = {
          status: 'REJEITADO',
          motivo: `CNPJ '${cnpjDaPlanilha}' na planilha é inválido (não possui 14 dígitos numéricos).`,
        };
        this.logger.warn(
          `CNPJ inválido na planilha para Pedido ${envio.numeroPedido}: ${cnpjDaPlanilha}`,
        );
      } else if (cnpjDaPlanilha === cnpjDoVendedor) {
        // -----------------------------------------------------------------------
        // CNPJ BATEU COM O DA ÓTICA DO VENDEDOR (Filial ou Matriz)
        // -----------------------------------------------------------------------
        this.logger.log(
          `✓ CNPJ validado (direto) para Pedido: ${envio.numeroPedido} (${cnpjDoVendedor})`,
        );
        // Prossegue para VALIDAÇÃO 2: REGRAS (código após este bloco)
      } else {
        // -----------------------------------------------------------------------
        // CNPJ NÃO BATEU COM O DA ÓTICA, VERIFICAR MATRIZ (Sprint 17)
        // -----------------------------------------------------------------------
        this.logger.log(
          `CNPJ da planilha (${cnpjDaPlanilha}) não bate com Ótica do Vendedor (${cnpjDoVendedor}). Verificando Matriz...`,
        );

        const matriz = envio.vendedor.optica?.matriz;
        const cnpjDaMatriz = this._limparCnpj(matriz?.cnpj);

        if (matriz && cnpjDaMatriz && cnpjDaPlanilha === cnpjDaMatriz) {
          // -----------------------------------------------------------------------
          // CNPJ BATEU COM O DA MATRIZ
          // -----------------------------------------------------------------------
          this.logger.log(
            `✓ CNPJ validado (via Matriz ${matriz.nome}) para Pedido: ${envio.numeroPedido} (${cnpjDaMatriz})`,
          );
          // Prossegue para VALIDAÇÃO 2: REGRAS (código após este bloco)
        } else {
          // -----------------------------------------------------------------------
          // CNPJ NÃO BATEU NEM COM FILIAL NEM COM MATRIZ
          // -----------------------------------------------------------------------
          this.logger.warn(
            `CNPJ divergente para Pedido: ${envio.numeroPedido}. Planilha: ${cnpjDaPlanilha}, Vendedor: ${cnpjDoVendedor}, Matriz: ${cnpjDaMatriz || 'N/A'}`,
          );
          resultadoValidacao = {
            status: 'REJEITADO',
            motivo: `CNPJ da venda (${cnpjDaPlanilha}) não corresponde à ótica do vendedor (${cnpjDoVendedor}) nem à sua matriz (${cnpjDaMatriz || 'N/A'}).`,
          };
        }
      }

      // -----------------------------------------------------------------------
      // VALIDAÇÃO 2: REGRAS (Só chega aqui se CNPJ for válido)
      // -----------------------------------------------------------------------
      if (!resultadoValidacao) {
        // Se ainda não definiu resultado, significa que CNPJ foi validado
        this.logger.log(`[2/3] Aplicando regras de negócio (Rule Builder)...`);

        const resultadoRegras = this._aplicarRegras(
          linhasEncontradas,
          envio.requisito,
          mapaInvertido,
        );

        if (!resultadoRegras.sucesso) {
          // -----------------------------------------------------------------------
          // REGRAS FALHARAM - TENTAR MULTI-CARD ALLOCATION (Sprint 6.1)
          // -----------------------------------------------------------------------
          // Se o card escolhido pelo vendedor falhou, vamos tentar todos os outros
          // cards da mesma cartela para ver se algum valida com sucesso.
          // Isso permite spillover correto mesmo quando vendedor escolhe card errado.
          this.logger.log(
            `[2.1/3] Card escolhido falhou. Tentando Multi-Card Allocation...`,
          );

          const resultadoMultiCard = await this._tentarAlocarMultiCard(
            envio,
            linhasEncontradas,
            mapaInvertido,
          );

          if (resultadoMultiCard.sucesso) {
            // ✅ SUCESSO! Encontrou um card alternativo que valida
            this.logger.log(
              `✓ Multi-Card Allocation bem-sucedida! Realocando para Requisito ID ${resultadoMultiCard.requisitoAlternativo!.id}`,
            );
            // Reatribuir o requisito do envio para o requisito que validou
            envio.requisito = resultadoMultiCard.requisitoAlternativo!;
            envio.requisitoId = resultadoMultiCard.requisitoAlternativo!.id;
            // Prosseguir para validação 3 (conflito)
          } else {
            // ❌ FALHA TOTAL - Nenhum card validou
            resultadoValidacao = {
              status: 'REJEITADO',
              motivo: `Produto não atende nenhum requisito da cartela. Tentativas: ${resultadoMultiCard.motivosTentativas}`,
            };
            this.logger.warn(
              `Multi-Card Allocation falhou para Pedido ${envio.numeroPedido}. Nenhum requisito validou.`,
            );
          }
        } else {
          // -----------------------------------------------------------------------
          // REGRAS VÁLIDAS! Prosseguir para VALIDAÇÃO 3: CONFLITO ENTRE VENDEDORES
          // -----------------------------------------------------------------------
          this.logger.log(
            `✓ Regras validadas com sucesso para Pedido: ${envio.numeroPedido}`,
          );
          this.logger.log(
            `[3/3] Verificando conflito entre vendedores para Pedido: ${envio.numeroPedido}...`,
          );

          // Buscar se já existe outro envio VALIDADO do mesmo pedido por outro vendedor
          const conflitoOutroVendedor = await this.prisma.envioVenda.findFirst({
            where: {
              numeroPedido: envio.numeroPedido,
              campanhaId: envio.campanhaId,
              status: 'VALIDADO',
              vendedorId: { not: envio.vendedorId }, // Outro vendedor
            },
          });

          if (conflitoOutroVendedor) {
            // Conflito detectado: outro vendedor já tem este pedido validado
            resultadoValidacao = {
              status: 'CONFLITO_MANUAL',
              motivo: `Conflito interno detectado: outro vendedor (ID: ${conflitoOutroVendedor.vendedorId}) já possui este pedido validado.`,
            };
            this.logger.warn(
              `⚠ CONFLITO detectado para Pedido ${envio.numeroPedido}: Vendedor ${conflitoOutroVendedor.vendedorId} já validou.`,
            );
          } else {
            // -----------------------------------------------------------------------
            // TUDO VÁLIDO! Status final: VALIDADO
            // -----------------------------------------------------------------------
            resultadoValidacao = {
              status: 'VALIDADO',
              motivo: null,
            };
            this.logger.log(
              `✓✓✓ Pedido ${envio.numeroPedido} VALIDADO com sucesso! (CNPJ + Regras + Sem Conflito)`,
            );
          }
        }
      }

      // -----------------------------------------------------------------------
      // ETAPA 4: Armazenar resultado no envio (para posterior persistência)
      // -----------------------------------------------------------------------
      envio['resultado'] = resultadoValidacao;
      relatorio[resultadoValidacao.status.toLowerCase()]++;
      this.logger.log(
        `Resultado do Envio ID ${envio.id}: ${resultadoValidacao.status} - ${resultadoValidacao.motivo || 'OK'}`,
      );
    }

    // -------------------------------------------------------------------------
    // ETAPA 5: Persistir resultados no banco (se não for simulação)
    // -------------------------------------------------------------------------
    if (!ehSimulacao) {
      this.logger.log(`\n========== PERSISTINDO RESULTADOS NO BANCO ==========`);
      await this._persistirResultados(enviosPendentes);
    } else {
      this.logger.log(`\n========== MODO SIMULAÇÃO: Nenhuma alteração persistida ==========`);
    }

    // -------------------------------------------------------------------------
    // ETAPA 6: Retornar relatório consolidado
    // -------------------------------------------------------------------------
    this.logger.log(`\n========== FIM DO PROCESSAMENTO ==========`);
    this.logger.log(`Total processados: ${enviosPendentes.length}`);
    this.logger.log(`Validados: ${relatorio.validado}`);
    this.logger.log(`Rejeitados: ${relatorio.rejeitado}`);
    this.logger.log(`Conflitos Manuais: ${relatorio.conflito_manual}`);

    return {
      mensagem: ehSimulacao
        ? 'Simulação concluída. Nenhuma alteração foi persistida.'
        : 'Processamento concluído com sucesso.',
      totalProcessados: enviosPendentes.length,
      validado: relatorio.validado,
      rejeitado: relatorio.rejeitado,
      conflito_manual: relatorio.conflito_manual,
    };
  }

  /**
   * ============================================================================
   * HELPER: _limparCnpj
   * ============================================================================
   *
   * Normaliza um CNPJ removendo todos os caracteres não-numéricos.
   *
   * ADICIONADO: Sprint 16.4 (Tarefa 38.4)
   *
   * @param cnpj - CNPJ bruto (pode conter pontos, traços, barras)
   * @returns CNPJ limpo (apenas números) ou null se inválido
   *
   * @example
   * _limparCnpj("12.345.678/0001-90") // "12345678000190"
   * _limparCnpj("12345678000190")     // "12345678000190"
   * _limparCnpj(null)                 // null
   * _limparCnpj("")                   // null
   */
  private _limparCnpj(cnpj: string | null | undefined): string | null {
    if (!cnpj) {
      return null;
    }

    const cnpjLimpo = String(cnpj).replace(/\D/g, '');
    return cnpjLimpo.length > 0 ? cnpjLimpo : null;
  }

  /**
   * ============================================================================
   * HELPER: _buscarPedidoPlanilha
   * ============================================================================
   *
   * Busca um pedido específico dentro das linhas da planilha,
   * verificando todas as colunas mapeadas para NUMERO_PEDIDO_OS.
   *
   * Retorna:
   * - 'OK': Pedido encontrado em uma única coluna (sem conflito)
   * - 'CONFLITO_COLUNA': Pedido encontrado em múltiplas colunas diferentes
   * - 'PEDIDO_NAO_ENCONTRADO': Pedido não foi encontrado na planilha
   *
   * @param numeroPedido - Número do pedido a buscar (ex: "#100")
   * @param linhasPlanilha - Array de objetos representando linhas da planilha
   * @param mapaInvertido - Mapa invertido (campo_sistema -> nome_coluna_planilha)
   * @returns Objeto com status, motivo e linhasEncontradas
   */
  private _buscarPedidoPlanilha(
    numeroPedido: string,
    linhasPlanilha: any[],
    mapaInvertido: Record<string, string>,
  ): {
    status: 'OK' | 'CONFLITO_COLUNA' | 'PEDIDO_NAO_ENCONTRADO';
    motivo: string | null;
    linhasEncontradas: any[];
  } {
    const colunasComPedido = new Set<string>();
    const linhasEncontradas: any[] = [];

    // Buscar todas as colunas mapeadas para NUMERO_PEDIDO_OS
    const colunasPedido = Object.keys(mapaInvertido).filter(
      (key) => key === 'NUMERO_PEDIDO_OS',
    );

    if (colunasPedido.length === 0) {
      return {
        status: 'PEDIDO_NAO_ENCONTRADO',
        motivo: 'Nenhuma coluna mapeada para NUMERO_PEDIDO_OS.',
        linhasEncontradas: [],
      };
    }

    // Iterar sobre as linhas da planilha
    for (const linha of linhasPlanilha) {
      for (const campoSistema of colunasPedido) {
        const nomeColuna = mapaInvertido[campoSistema];
        const valorCelula = String(linha[nomeColuna] || '').trim();

        if (valorCelula === numeroPedido) {
          colunasComPedido.add(nomeColuna);
          linhasEncontradas.push(linha);
        }
      }
    }

    // Análise de resultados
    if (colunasComPedido.size === 0) {
      return {
        status: 'PEDIDO_NAO_ENCONTRADO',
        motivo: `Pedido '${numeroPedido}' não encontrado na planilha.`,
        linhasEncontradas: [],
      };
    }

    if (colunasComPedido.size > 1) {
      return {
        status: 'CONFLITO_COLUNA',
        motivo: `Pedido '${numeroPedido}' encontrado em múltiplas colunas: ${Array.from(colunasComPedido).join(', ')}.`,
        linhasEncontradas: [],
      };
    }

    // Pedido encontrado em uma única coluna (OK)
    return {
      status: 'OK',
      motivo: null,
      linhasEncontradas: linhasEncontradas,
    };
  }

  /**
   * ============================================================================
   * HELPER: _tentarAlocarMultiCard
   * ============================================================================
   *
   * Tenta alocar o envio para qualquer requisito (card) da mesma cartela.
   *
   * Cenário: Vendedor escolheu o card errado ao enviar venda, mas o produto
   * na verdade atende as regras de OUTRO card da mesma cartela.
   *
   * Este método busca TODOS os requisitos da mesma cartela (mesmo numeroCartela)
   * e tenta validar contra cada um deles. Se algum validar, retorna sucesso
   * com o requisito alternativo encontrado.
   *
   * ADICIONADO: Sprint 6.1 (Fix de Multi-Card Allocation)
   *
   * @param envio - Envio a ser validado (contém requisito.regraCartela.numeroCartela)
   * @param linhasEncontradas - Linhas da planilha correspondentes ao pedido
   * @param mapaInvertido - Mapa invertido (campo_sistema -> nome_coluna_planilha)
   * @returns Objeto com sucesso, requisitoAlternativo (se houver) e motivosTentativas
   */
  private async _tentarAlocarMultiCard(
    envio: any,
    linhasEncontradas: any[],
    mapaInvertido: Record<string, string>,
  ): Promise<{
    sucesso: boolean;
    requisitoAlternativo?: any;
    motivosTentativas: string;
  }> {
    const numeroCartelaAtual = envio.requisito.regraCartela.numeroCartela;
    const requisitoOriginalId = envio.requisito.id;

    this.logger.log(
      `Multi-Card Allocation: Buscando todos os requisitos da Cartela ${numeroCartelaAtual}...`,
    );

    // Buscar TODOS os requisitos da mesma cartela (mesmo numeroCartela)
    const todosRequisitos = await this.prisma.requisitoCartela.findMany({
      where: {
        regraCartela: {
          numeroCartela: numeroCartelaAtual,
          campanhaId: envio.campanhaId,
        },
        id: { not: requisitoOriginalId }, // Excluir o requisito que já tentamos
      },
      include: {
        condicoes: true, // Necessário para _aplicarRegras
        regraCartela: true, // Necessário para logs
      },
    });

    this.logger.log(
      `Encontrados ${todosRequisitos.length} requisitos alternativos para testar.`,
    );

    const motivosTentativas: string[] = [];

    // Tentar validar contra cada requisito alternativo
    for (const requisitoAlternativo of todosRequisitos) {
      this.logger.log(
        `Testando requisito alternativo ID ${requisitoAlternativo.id} (${requisitoAlternativo.descricao})...`,
      );

      const resultadoRegras = this._aplicarRegras(
        linhasEncontradas,
        requisitoAlternativo,
        mapaInvertido,
      );

      if (resultadoRegras.sucesso) {
        // ✅ SUCESSO! Encontrou um requisito alternativo que valida
        this.logger.log(
          `✓ Requisito alternativo ID ${requisitoAlternativo.id} validou com sucesso!`,
        );
        return {
          sucesso: true,
          requisitoAlternativo: requisitoAlternativo,
          motivosTentativas: 'N/A (validação bem-sucedida)',
        };
      } else {
        // ❌ Falhou neste requisito, registrar motivo e continuar tentando
        motivosTentativas.push(
          `Requisito "${requisitoAlternativo.descricao}": ${resultadoRegras.motivo}`,
        );
        this.logger.log(
          `✗ Requisito alternativo ID ${requisitoAlternativo.id} falhou: ${resultadoRegras.motivo}`,
        );
      }
    }

    // ❌ FALHA TOTAL - Nenhum requisito alternativo validou
    this.logger.log(`Nenhum requisito alternativo validou. Total de tentativas: ${todosRequisitos.length}`);
    return {
      sucesso: false,
      motivosTentativas: motivosTentativas.join(' | '),
    };
  }

  /**
   * ============================================================================
   * HELPER: _aplicarRegras
   * ============================================================================
   *
   * Aplica as regras de validação (Rule Builder) do requisito ao pedido.
   * Verifica todas as condições definidas no RequisitoCartela.
   *
   * @param linhasEncontradas - Linhas da planilha correspondentes ao pedido
   * @param requisito - RequisitoCartela com condições a verificar
   * @param mapaInvertido - Mapa invertido (campo_sistema -> nome_coluna_planilha)
   * @returns Objeto com sucesso (boolean) e motivo (string | null)
   */
  private _aplicarRegras(
    linhasEncontradas: any[],
    requisito: any,
    mapaInvertido: Record<string, string>,
  ): { sucesso: boolean; motivo: string | null } {
    // Implementação simplificada: assumindo que todas as condições devem ser satisfeitas
    if (!requisito || !requisito.condicoes || requisito.condicoes.length === 0) {
      return { sucesso: true, motivo: null };
    }

    for (const condicao of requisito.condicoes) {
      const campoVerificacao = condicao.campo;
      const operador = condicao.operador;
      const valorEsperado = condicao.valor;

      const nomeColuna = mapaInvertido[campoVerificacao];

      if (!nomeColuna) {
        return {
          sucesso: false,
          motivo: `Campo '${campoVerificacao}' não mapeado na planilha.`,
        };
      }

      const valorReal = linhasEncontradas[0][nomeColuna];

      // Lógica de comparação baseada no operador
      let condicaoAtendida = false;

      switch (operador) {
        case 'IGUAL_A':
          condicaoAtendida = String(valorReal).trim() === String(valorEsperado).trim();
          break;
        case 'NAO_IGUAL_A':
          condicaoAtendida = String(valorReal).trim() !== String(valorEsperado).trim();
          break;
        case 'CONTEM':
          condicaoAtendida = String(valorReal).includes(String(valorEsperado));
          break;
        case 'NAO_CONTEM':
          condicaoAtendida = !String(valorReal).includes(String(valorEsperado));
          break;
        case 'MAIOR_QUE':
          condicaoAtendida = parseFloat(valorReal) > parseFloat(valorEsperado);
          break;
        case 'MENOR_QUE':
          condicaoAtendida = parseFloat(valorReal) < parseFloat(valorEsperado);
          break;
        default:
          return {
            sucesso: false,
            motivo: `Operador '${operador}' não reconhecido.`,
          };
      }

      if (!condicaoAtendida) {
        return {
          sucesso: false,
          motivo: `Condição não satisfeita: ${campoVerificacao} ${operador} '${valorEsperado}' (valor encontrado: '${valorReal}').`,
        };
      }
    }

    return { sucesso: true, motivo: null };
  }

  /**
   * ============================================================================
   * HELPER: _persistirResultados
   * ============================================================================
   *
   * Persiste os resultados da validação no banco de dados.
   * Para envios VALIDADOS, executa a lógica de recompensas de forma ATÔMICA.
   *
   * REFATORADO: Sprint 16.4 (Tarefa 38.4 Re-Refinada)
   * - REMOVIDO: Métodos antigos _executarSpillover e _verificarConclusaoCartela
   * - REINTEGRADO: Chamada atômica ao RecompensaService.processarGatilhos() dentro da transação
   *
   * @param enviosPendentes - Array de envios processados com resultado anexado
   */
  private async _persistirResultados(enviosPendentes: any[]) {
    for (const envio of enviosPendentes) {
      const resultado: ResultadoValidacao = envio['resultado'];

      if (resultado.status === 'VALIDADO') {
        // -----------------------------------------------------------------------
        // VALIDADO: Usar transação para operações atômicas (Validação + Recompensa)
        // -----------------------------------------------------------------------
        await this.prisma.$transaction(async (tx) => {
          // -----------------------------------------------------------------------
          // PASSO 1A: CALCULAR SPILLOVER (CORRIGIDO Sprint 16.5 - Tarefa 38.8)
          // -----------------------------------------------------------------------
          /**
           * Conta quantos envios VALIDADOS já existem do mesmo vendedor para o mesmo requisito.
           * Usa essa contagem para calcular em qual cartela este envio deve ser alocado.
           *
           * Lógica de Spillover:
           * - Se requisito precisa de 2 vendas por cartela:
           *   - Venda 1: countValidado=0 → numeroCartela = floor(0/2) + 1 = 1
           *   - Venda 2: countValidado=1 → numeroCartela = floor(1/2) + 1 = 1 (Cartela 1 COMPLETA!)
           *   - Venda 3: countValidado=2 → numeroCartela = floor(2/2) + 1 = 2 (Spillover!)
           *   - Venda 4: countValidado=3 → numeroCartela = floor(3/2) + 1 = 2
           *   - Venda 5: countValidado=4 → numeroCartela = floor(4/2) + 1 = 3 (Spillover!)
           *
           * Importante: Conta apenas envios VALIDADO (não EM_ANALISE nem REJEITADO)
           */
          const countValidado = await tx.envioVenda.count({
            where: {
              vendedorId: envio.vendedorId,
              requisitoId: envio.requisito.id,
              status: 'VALIDADO', // Conta apenas validados
            },
          });

          const quantidadeRequisito = envio.requisito.quantidade;
          const numeroCartelaAtendida = Math.floor(countValidado / quantidadeRequisito) + 1;

          this.logger.log(
            `[SPILLOVER] Envio ${envio.id}: countValidado=${countValidado}, quantidade=${quantidadeRequisito}, numeroCartela=${numeroCartelaAtendida}`,
          );

          // -----------------------------------------------------------------------
          // PASSO 1B: ATUALIZAR STATUS DO ENVIO PARA VALIDADO (COM SPILLOVER CORRETO)
          // -----------------------------------------------------------------------
          const envioAtualizado = await tx.envioVenda.update({
            where: { id: envio.id },
            data: {
              status: 'VALIDADO',
              motivoRejeicao: null,
              dataValidacao: new Date(),
              numeroCartelaAtendida: numeroCartelaAtendida, // ✅ CORRIGIDO: Usa spillover calculado
            },
          });

          this.logger.log(
            `Envio ID ${envio.id} atualizado para VALIDADO (Cartela ${numeroCartelaAtendida}).`,
          );

          // -----------------------------------------------------------------------
          // PASSO 2: GATILHO DE RECOMPENSA (Dispara o motor de recompensa de forma ATÔMICA)
          // -----------------------------------------------------------------------
          this.logger.log(`Disparando gatilhos de recompensa para Envio ID ${envioAtualizado.id}...`);

          // Extrai os dados hidratados necessários para o RecompensaService
          // Atenção: Garanta que a estrutura do 'include' está correta para evitar erros aqui
          const campanha = envio.requisito.regraCartela.campanha;
          const vendedor = envio.vendedor; // Já inclui 'gerente' e 'optica' do include principal

          if (!campanha || !vendedor) {
            this.logger.error(
              `Dados incompletos para processar recompensa do Envio ID ${envio.id}. Campanha ou Vendedor ausentes.`,
            );
            // Lance um erro para quebrar a transação, pois algo está errado
            throw new Error(`Falha ao obter dados completos para recompensa do Envio ${envio.id}.`);
          }

          // Passa o 'tx' (TransactionClient) para garantir atomicidade total
          await this.recompensaService.processarGatilhos(
            tx,
            envioAtualizado, // Passa o envio JÁ ATUALIZADO para VALIDADO
            campanha,
            vendedor,
          );

          this.logger.log(`Gatilhos de recompensa processados para Envio ID ${envioAtualizado.id}.`);
        });
      } else {
        // -----------------------------------------------------------------------
        // REJEITADO ou CONFLITO_MANUAL: Atualizar status diretamente
        // -----------------------------------------------------------------------
        await this.prisma.envioVenda.update({
          where: { id: envio.id },
          data: {
            status: resultado.status,
            motivoRejeicao: resultado.motivo,
          },
        });

        this.logger.log(
          `Envio ID ${envio.id} atualizado para ${resultado.status}. Motivo: ${resultado.motivo}`,
        );
      }
    }
  }
}

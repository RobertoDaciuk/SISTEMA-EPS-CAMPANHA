/**
 * ============================================================================
 * VALIDACAO CONTROLLER - Rotas HTTP do Robô Admin (Sprint 16.4)
 * ============================================================================
 * 
 * Descrição:
 * Controlador responsável por expor rotas HTTP seguras para
 * processamento em lote das vendas submetidas (somente Admin).
 * 
 * Alterações Sprint 16.4 (Tarefa 38.4):
 * - ATUALIZADO: Uso do ProcessarValidacaoDto atualizado que agora
 *   exige obrigatoriamente o mapeamento de CNPJ_OTICA via decorator
 *   customizado @IsMapaComCnpj.
 * - O NestJS validará automaticamente o DTO na camada de entrada,
 *   garantindo que requests sem CNPJ_OTICA retornem 400 Bad Request.
 * 
 * Rotas:
 * - POST /api/validacao/processar - Roda o "robô" da planilha/processamento
 * 
 * Segurança:
 * - JwtAuthGuard: Requer autenticação JWT válida
 * - PapeisGuard: Requer papel 'ADMIN' (somente admins podem processar)
 * 
 * @module ValidacaoModule
 * ============================================================================
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ValidacaoService } from './validacao.service';
import { ProcessarValidacaoDto } from './dto/processar-validacao.dto';
import { JwtAuthGuard } from '../comum/guards/jwt-auth.guard';
import { PapeisGuard } from '../comum/guards/papeis.guard';
import { Papeis } from '../comum/decorators/papeis.decorator';

/**
 * ============================================================================
 * CONTROLLER: ValidacaoController
 * ============================================================================
 * 
 * Rota base: /api/validacao
 * Acesso: Somente ADMIN
 */
@Controller('validacao')
@UseGuards(JwtAuthGuard, PapeisGuard)
export class ValidacaoController {
  private readonly logger = new Logger(ValidacaoController.name);

  constructor(private readonly validacaoService: ValidacaoService) {}

  /**
   * ==========================================================================
   * POST /api/validacao/processar
   * ==========================================================================
   * 
   * Processa em lote todos os envios EM_ANALISE de uma campanha,
   * aplicando a validação completa em 3 camadas:
   * 
   * 1. **Validação de CNPJ** (Sprint 16.4):
   *    - Compara o CNPJ da planilha com o CNPJ da Ótica do Vendedor
   *    - Requer que mapaColunas contenha "CNPJ_OTICA" (validado pelo DTO)
   * 
   * 2. **Validação de Regras**:
   *    - Aplica as condições do Rule Builder do RequisitoCartela
   * 
   * 3. **Detecção de Conflito**:
   *    - Verifica se outro vendedor já validou o mesmo pedido
   * 
   * Segurança:
   * - @Papeis('ADMIN'): Apenas usuários com papel ADMIN podem executar
   * - JwtAuthGuard: Requer token JWT válido
   * - PapeisGuard: Verifica o papel do usuário autenticado
   * 
   * Validação Automática (Sprint 16.4):
   * - O DTO ProcessarValidacaoDto valida automaticamente que:
   *   - campanhaId é UUID válido
   *   - ehSimulacao é boolean
   *   - mapaColunas é objeto e CONTÉM mapeamento para "CNPJ_OTICA"
   *   - linhasPlanilha é array
   * - Se qualquer validação falhar, retorna 400 Bad Request ANTES de
   *   chamar o service.
   * 
   * @param dto - ProcessarValidacaoDto com dados da planilha e configurações
   * @returns Relatório consolidado do processamento
   * 
   * @example Request Body
   * {
   *   "campanhaId": "550e8400-e29b-41d4-a716-446655440000",
   *   "ehSimulacao": false,
   *   "mapaColunas": {
   *     "Número do Pedido (OS)": "NUMERO_PEDIDO_OS",
   *     "CNPJ da Loja": "CNPJ_OTICA",
   *     "Produto": "NOME_PRODUTO",
   *     "Valor": "VALOR_VENDA"
   *   },
   *   "linhasPlanilha": [
   *     {
   *       "Número do Pedido (OS)": "#100",
   *       "CNPJ da Loja": "12345678000190",
   *       "Produto": "Lente X",
   *       "Valor": "250.00"
   *     },
   *     {
   *       "Número do Pedido (OS)": "#101",
   *       "CNPJ da Loja": "98765432000199",
   *       "Produto": "Lente Y",
   *       "Valor": "300.00"
   *     }
   *   ]
   * }
   * 
   * @example Response Success
   * {
   *   "mensagem": "Processamento concluído com sucesso.",
   *   "totalProcessados": 10,
   *   "validado": 7,
   *   "rejeitado": 2,
   *   "conflito_manual": 1
   * }
   * 
   * @example Response Error (Sem CNPJ_OTICA)
   * {
   *   "statusCode": 400,
   *   "message": [
   *     "O mapaColunas é obrigatório e deve incluir um mapeamento para \"CNPJ_OTICA\"."
   *   ],
   *   "error": "Bad Request"
   * }
   */
  @Post('processar')
  @Papeis('ADMIN')
  @HttpCode(HttpStatus.OK)
  async processarPlanilha(@Body() dto: ProcessarValidacaoDto) {
    this.logger.log(
      `[POST /api/validacao/processar] Iniciando processamento. Campanha: ${dto.campanhaId}, Simulação: ${dto.ehSimulacao}`,
    );

    try {
      // Delegar processamento ao service
      const resultado = await this.validacaoService.processarPlanilha(dto);

      this.logger.log(
        `[POST /api/validacao/processar] Processamento concluído. Total: ${resultado.totalProcessados}, Validados: ${resultado.validado}, Rejeitados: ${resultado.rejeitado}, Conflitos: ${resultado.conflito_manual}`,
      );

      return resultado;
    } catch (erro) {
      this.logger.error(
        `[POST /api/validacao/processar] Erro durante processamento: ${erro.message}`,
        erro.stack,
      );
      throw erro;
    }
  }
}

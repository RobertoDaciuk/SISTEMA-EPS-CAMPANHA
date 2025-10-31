/**
 * ============================================================================
 * ENVIO VENDA CONTROLLER
 * ============================================================================
 * 
 * Controlador de Envios de Venda.
 * - Permite submissão apenas por vendedores.
 * - Listagem polimórfica: Admin, Gerente, Vendedor.
 * - Admin pode validar/rejeitar manualmente qualquer envio.
 * - Nova rota GET /minhas: Histórico pessoal do vendedor para uma campanha.
 * 
 * @module EnvioVendaModule
 * ============================================================================
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EnvioVendaService } from './envio-venda.service';
import { CriarEnvioVendaDto } from './dto/criar-envio-venda.dto';
import { ListarEnviosFiltroDto } from './dto/listar-envios-filtro.dto';
import { ListarMinhasEnvioVendaDto } from './dto/listar-minhas-envio-venda.dto';
import { RejeitarManualDto } from './dto/rejeitar-manual.dto';
import { JwtAuthGuard } from '../comum/guards/jwt-auth.guard';
import { PapeisGuard } from '../comum/guards/papeis.guard';
import { Papeis } from '../comum/decorators/papeis.decorator';

/**
 * Rotas para submissão, listagem e intervenção manual
 * de envios de venda.
 */
@Controller('envios-venda')
export class EnvioVendaController {
  constructor(private readonly envioVendaService: EnvioVendaService) {}

  /**
   * Submissão de envio de venda (apenas para vendedores autenticados).
   * POST /api/envios-venda
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('VENDEDOR')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dto: CriarEnvioVendaDto, @Req() req: any) {
    return this.envioVendaService.criar(dto, req.user.id);
  }

  /**
   * Listagem polimórfica de envios - todos autenticados podem acessar.
   * GET /api/envios-venda
   * - Vendedor: só os próprios.
   * - Gerente: só da equipe.
   * - Admin: vê tudo (com filtros opcionais).
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async listar(@Req() req: any, @Query() filtros: ListarEnviosFiltroDto) {
    return this.envioVendaService.listar(req.user, filtros);
  }

  /**
   * ============================================================================
   * GET /api/envios-venda/minhas (VENDEDOR) - NOVA ROTA
   * ============================================================================
   * 
   * Rota dedicada para vendedores listarem seu próprio histórico de envios
   * para uma campanha específica.
   * 
   * Diferenças vs GET /:
   * - Não é polimórfica (apenas VENDEDOR)
   * - Exige campanhaId obrigatório (validado por DTO)
   * - Retorna campos otimizados para UI (sem relacionamentos)
   * - Ordenação por data de envio (mais recentes primeiro)
   * 
   * Segurança (Data Tenancy):
   * - Guard: JwtAuthGuard + PapeisGuard
   * - Papel permitido: VENDEDOR
   * - vendedorId extraído do token (req.user.id) e aplicado no serviço
   * - Impossível para um vendedor ver envios de outro vendedor
   * 
   * Query Parameters Obrigatórios (ListarMinhasEnvioVendaDto):
   * - campanhaId: string (UUID) - ID da campanha para filtrar envios
   * 
   * Resposta Sucesso (200):
   * - Array de envios do vendedor autenticado para a campanha especificada
   * - Campos retornados: id, numeroPedido, status, dataEnvio, dataValidacao,
   *   motivoRejeicao, requisitoId, numeroCartelaAtendida
   * 
   * Resposta Erro:
   * - 400: campanhaId não fornecido ou inválido (não é UUID)
   * - 401: Não autenticado
   * - 403: Usuário não é VENDEDOR
   * 
   * Exemplo de Uso (Frontend):
   * ```
   * GET /api/envios-venda/minhas?campanhaId=550e8400-e29b-41d4-a716-446655440000
   * ```
   * 
   * Caso de Uso:
   * Página /campanhas/[id] do frontend precisa exibir o histórico de
   * submissões do vendedor logado para aquela campanha específica.
   * 
   * @param req Request com user autenticado (req.user.id)
   * @param query Query parameters validados (campanhaId obrigatório)
   * @returns Array de envios do vendedor para a campanha
   */
  @Get('minhas')
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('VENDEDOR')
  async listarMinhas(@Req() req: any, @Query() query: ListarMinhasEnvioVendaDto) {
    const vendedorId = req.user.id;
    return this.envioVendaService.listarMinhasPorCampanha(
      vendedorId,
      query.campanhaId,
    );
  }

  /**
   * ADMIN: Validação manual de um envio individual.
   * PATCH /api/envios-venda/:id/validar-manual
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('ADMIN')
  @Patch(':id/validar-manual')
  async validarManual(@Param('id') id: string) {
    return this.envioVendaService.validarManual(id);
  }

  /**
   * ADMIN: Rejeição manual de um envio individual.
   * PATCH /api/envios-venda/:id/rejeitar-manual
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('ADMIN')
  @Patch(':id/rejeitar-manual')
  async rejeitarManual(@Param('id') id: string, @Body() dto: RejeitarManualDto) {
    return this.envioVendaService.rejeitarManual(id, dto);
  }
}

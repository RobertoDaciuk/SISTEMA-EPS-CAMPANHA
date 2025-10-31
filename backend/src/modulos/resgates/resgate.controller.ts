import { Controller, Post, Body, UseGuards, Req, Get, Query, Patch, Param } from '@nestjs/common';
import { JwtAuthGuard } from './../comum/guards/jwt-auth.guard';
import { PapeisGuard } from './../comum/guards/papeis.guard';
import { Papeis } from './../comum/decorators/papeis.decorator';
import { PapelUsuario } from '@prisma/client';
import { ResgateService } from './resgate.service';
import { SolicitarResgateDto } from './dto/solicitar-resgate.dto';
import { ListarResgatesFiltroDto } from './dto/listar-resgates.filtro.dto';
import { CancelarResgateDto } from './dto/cancelar-resgate.dto';

/**
 * Controlador do módulo de Resgates — separação clara de rotas para vendedores e admins.
 */
@Controller('resgates')
export class ResgateController {
  constructor(private readonly resgateService: ResgateService) {}

  /**
   * VENDEDOR: Solicita um resgate (Protected).
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.VENDEDOR)
  @Post('solicitar')
  async solicitar(@Body() dto: SolicitarResgateDto, @Req() req) {
    const vendedorId = req.user.id;
    return this.resgateService.solicitar(dto, vendedorId);
  }

  /**
   * VENDEDOR: Lista o histórico de resgates do vendedor logado.
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.VENDEDOR)
  @Get('meus-resgates')
  async meusResgates(@Req() req) {
    const vendedorId = req.user.id;
    return this.resgateService.meusResgates(vendedorId);
  }

  /**
   * ADMIN: Lista resgates, com filtros.
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @Get()
  async listarAdmin(@Query() filtros: ListarResgatesFiltroDto) {
    return this.resgateService.listarAdmin(filtros);
  }

  /**
   * ADMIN: Marca resgate como enviado.
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @Patch(':id/marcar-enviado')
  async marcarEnviado(@Param('id') id: string) {
    return this.resgateService.marcarEnviado(id);
  }

  /**
   * ADMIN: Cancela/estorna um resgate (transação atômica).
   */
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @Patch(':id/cancelar')
  async cancelarEstorno(@Param('id') id: string, @Body() dto: CancelarResgateDto) {
    return this.resgateService.cancelarEstorno(id, dto);
  }
}

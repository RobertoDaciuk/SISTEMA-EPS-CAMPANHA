import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Body,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from './../comum/guards/jwt-auth.guard';
import { PapeisGuard } from './../comum/guards/papeis.guard';
import { Papeis } from './../comum/decorators/papeis.decorator';
import { PapelUsuario } from '@prisma/client';
import { RelatorioFinanceiroService } from './relatorio-financeiro.service';
import { ListarRelatoriosFiltroDto } from './dto/listar-relatorios.filtro.dto';
import { MarcarEmMassaDto } from './dto/marcar-em-massa.dto';

/**
 * Controlador seguro para relatórios financeiros, exclusivo para Admin.
 */
@UseGuards(JwtAuthGuard, PapeisGuard)
@Papeis(PapelUsuario.ADMIN)
@Controller('relatorios-financeiros')
export class RelatorioFinanceiroController {
  constructor(private readonly relatorioService: RelatorioFinanceiroService) {}

  @Get()
  async listar(@Query() filtros: ListarRelatoriosFiltroDto) {
    return this.relatorioService.listar(filtros);
  }

  @Get('kpis')
  async getKpis() {
    return this.relatorioService.getKpis();
  }

  @Get('exportar')
  async exportarCsv(
    @Query() filtros: ListarRelatoriosFiltroDto,
    @Res() res: Response,
  ) {
    const csvString = await this.relatorioService.exportarCsv(filtros);
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`relatorio-financeiro-${new Date().toISOString()}.csv`);
    // Adiciona BOM para garantir a codificação correta no Excel
    return res.send('\uFEFF' + csvString);
  }

  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.relatorioService.buscarPorId(id);
  }

  @Patch(':id/marcar-como-pago')
  async marcarComoPago(@Param('id') id: string) {
    return this.relatorioService.marcarComoPago(id);
  }

  @Patch('marcar-em-massa')
  async marcarPagosEmMassa(@Body() dto: MarcarEmMassaDto) {
    return this.relatorioService.marcarPagosEmMassa(dto);
  }
}
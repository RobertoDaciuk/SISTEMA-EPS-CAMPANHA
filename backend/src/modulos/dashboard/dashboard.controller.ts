import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './../comum/guards/jwt-auth.guard';
import { PapeisGuard } from './../comum/guards/papeis.guard';
import { Papeis } from './../comum/decorators/papeis.decorator';
import { PapelUsuario } from '@prisma/client';
import { DashboardService } from './dashboard.service';

/**
 * Controlador das rotas de resumo/dashboard, separado por papel de acesso.
 */
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Dashboard do Vendedor (KPIs próprios).
   */
  @Get('vendedor')
  @UseGuards(PapeisGuard)
  @Papeis(PapelUsuario.VENDEDOR)
  async getVendedorDashboard(@Req() req) {
    return this.dashboardService.getVendedorKpis(req.user.id);
  }

  /**
   * Dashboard do Gerente.
   */
  @Get('gerente')
  @UseGuards(PapeisGuard)
  @Papeis(PapelUsuario.GERENTE)
  async getGerenteDashboard(@Req() req) {
    return this.dashboardService.getGerenteKpis(req.user.id);
  }

  /**
   * Dashboard do Admin (KPIs globais).
   */
  @Get('admin')
  @UseGuards(PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  async getAdminDashboard() {
    return this.dashboardService.getAdminKpis();
  }
}

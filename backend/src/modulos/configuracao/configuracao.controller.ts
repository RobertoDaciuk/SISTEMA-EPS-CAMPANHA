import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './../comum/guards/jwt-auth.guard';
import { PapeisGuard } from './../comum/guards/papeis.guard';
import { Papeis } from './../comum/decorators/papeis.decorator';
import { PapelUsuario } from '@prisma/client';
import { ConfiguracaoService } from './configuracao.service';
import { AtualizarConfiguracoesDto } from './dto/atualizar-configuracoes.dto';

/**
 * Controller de Configurações Globais - acesso restrito ao ADMIN.
 */
@UseGuards(JwtAuthGuard, PapeisGuard)
@Papeis(PapelUsuario.ADMIN)
@Controller('configuracoes')
export class ConfiguracaoController {
  constructor(private readonly service: ConfiguracaoService) {}

  /**
   * Lista todas as configurações.
   */
  @Get()
  async listar() {
    return this.service.listar();
  }

  /**
   * Atualiza (ou cria) lote de configurações via upsert transacional.
   * @param dto DTO de configurações
   */
  @Patch()
  async atualizarEmLote(@Body() dto: AtualizarConfiguracoesDto) {
    return this.service.atualizarEmLote(dto);
  }
}

import {
  Controller, Get, Param, Body, Post, Patch, Delete, UploadedFile, UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './../comum/guards/jwt-auth.guard';
import { PapeisGuard } from './../comum/guards/papeis.guard';
import { Papeis } from './../comum/decorators/papeis.decorator';
import { PapelUsuario } from '@prisma/client';
import { PremioService } from './premio.service';
import { CriarPremioDto } from './dto/criar-premio.dto';
import { AtualizarPremioDto } from './dto/atualizar-premio.dto';
import { FileInterceptor } from '@nestjs/platform-express';

/**
 * Controlador de prêmios com acesso polimórfico.
 * GETs: todos logados.
 * POST, PATCH, DELETE: apenas ADMIN.
 */
@Controller('premios')
export class PremioController {
  constructor(private readonly premioService: PremioService) {}

  // Vitrine para todos logados (VENDEDOR, GERENTE, ADMIN)
  @UseGuards(JwtAuthGuard)
  @Get()
  async listar() {
    return this.premioService.listar();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.premioService.buscarPorId(id);
  }

  // ADMIN vê tudo (inclusive sem estoque)
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @Get('admin/todos')
  async listarTodosAdmin() {
    return this.premioService.listarTodosAdmin();
  }

  // CRUD restrito a ADMIN
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @Post()
  async criar(@Body() dto: CriarPremioDto) {
    return this.premioService.criar(dto);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @Patch(':id')
  async atualizar(@Param('id') id: string, @Body() dto: AtualizarPremioDto) {
    return this.premioService.atualizar(id, dto);
  }

  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(PapelUsuario.ADMIN)
  @Delete(':id')
  async remover(@Param('id') id: string) {
    return this.premioService.remover(id);
  }

    /**
   * Upload de imagem do prêmio (ADMIN). Atualiza campo imageUrl.
   */
  @Post(':id/upload-imagem')
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImagem(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    ) file: Express.Multer.File,
  ) {
    return this.premioService.uploadImagem(id, file);
  }
}

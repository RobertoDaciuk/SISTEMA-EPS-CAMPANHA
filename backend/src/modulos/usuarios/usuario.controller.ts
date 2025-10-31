/**
 * ============================================================================
 * USUARIO CONTROLLER - Rotas HTTP do Módulo de Usuários
 * ============================================================================
 *
 * Controlador responsável por expor endpoints HTTP para gerenciamento de
 * usuários pelo Admin. Todas as rotas são PROTEGIDAS e requerem:
 * - Autenticação (token JWT válido)
 * - Papel ADMIN
 *
 * Base URL: /api/usuarios
 *
 * Proteção de Segurança:
 * - @UseGuards(JwtAuthGuard): Verifica se usuário está autenticado
 * - @UseGuards(PapeisGuard): Verifica se usuário tem papel necessário
 * - @Papeis('ADMIN'): Define que apenas ADMIN pode acessar
 *
 * @module UsuariosModule
 * ============================================================================
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CriarUsuarioAdminDto } from './dto/criar-usuario-admin.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { ListarUsuariosFiltroDto } from './dto/listar-usuarios.filtro.dto';
import { JwtAuthGuard } from '../comum/guards/jwt-auth.guard';
import { PapeisGuard } from '../comum/guards/papeis.guard';
import { Papeis } from '../comum/decorators/papeis.decorator';

/**
 * Controlador de rotas de gerenciamento de usuários.
 * Prefixo de rota: /api/usuarios
 * Proteção: TODAS as rotas requerem autenticação + papel ADMIN
 */
@Controller('usuarios')
@UseGuards(JwtAuthGuard, PapeisGuard)
@Papeis('ADMIN')
export class UsuarioController {
  /** Logger dedicado para rastrear requisições HTTP. */
  private readonly logger = new Logger(UsuarioController.name);

  /** Construtor do controlador. */
  constructor(private readonly usuarioService: UsuarioService) {}

  /**
   * Lista todos os usuários com filtros opcionais.
   * Rota: GET /api/usuarios
   * Query params: ?nomeOuEmail&status&papel&opticaId
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listar(@Query() filtros: ListarUsuariosFiltroDto) {
    this.logger.log(
      `[ADMIN] Listando usuários - Filtros: ${JSON.stringify(filtros)}`,
    );
    return await this.usuarioService.listar(filtros);
  }

  /**
   * Cria um novo usuário (Admin).
   * Rota: POST /api/usuarios
   *
   * REFATORAÇÃO (Tarefa 44.1):
   * - Retorna { usuario, tokenOriginal } quando senha não fornecida
   * - tokenOriginal é null quando senha foi fornecida
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criar(@Body() dados: CriarUsuarioAdminDto) {
    this.logger.log(`[ADMIN] Criando usuário: ${dados.email}`);
    const resultado = await this.usuarioService.criarAdmin(dados);

    // Retorna o resultado completo: { usuario, tokenOriginal }
    return resultado;
  }

  /**
   * Busca um usuário específico pelo ID.
   * Rota: GET /api/usuarios/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async buscarPorId(@Param('id') id: string) {
    this.logger.log(`[ADMIN] Buscando usuário: ${id}`);
    return await this.usuarioService.buscarPorId(id);
  }

  /**
   * Atualiza dados de um usuário existente.
   * Rota: PATCH /api/usuarios/:id
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async atualizar(@Param('id') id: string, @Body() dados: AtualizarUsuarioDto) {
    this.logger.log(`[ADMIN] Atualizando usuário: ${id}`);
    return await this.usuarioService.atualizar(id, dados);
  }

  /**
   * Remove um usuário do sistema (soft delete).
   * Rota: DELETE /api/usuarios/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remover(@Param('id') id: string) {
    this.logger.log(`[ADMIN] Removendo usuário: ${id}`);
    return await this.usuarioService.remover(id);
  }

  /**
   * Aprova um usuário pendente (PENDENTE → ATIVO).
   * Rota: PATCH /api/usuarios/:id/aprovar
   */
  @Patch(':id/aprovar')
  @HttpCode(HttpStatus.OK)
  async aprovar(@Param('id') id: string) {
    this.logger.log(`[ADMIN] Aprovando usuário: ${id}`);
    const usuario = await this.usuarioService.aprovar(id);
    return {
      message: `Usuário ${usuario.nome} aprovado com sucesso!`,
      usuario,
    };
  }

  /**
   * Bloqueia um usuário (status → BLOQUEADO).
   * Rota: PATCH /api/usuarios/:id/bloquear
   */
  @Patch(':id/bloquear')
  @HttpCode(HttpStatus.OK)
  async bloquear(@Param('id') id: string) {
    this.logger.log(`[ADMIN] Bloqueando usuário: ${id}`);
    const usuario = await this.usuarioService.bloquear(id);
    return {
      message: `Usuário ${usuario.nome} bloqueado com sucesso!`,
      usuario,
    };
  }

  /**
   * Desbloqueia um usuário (status BLOQUEADO → ATIVO).
   * Rota: PATCH /api/usuarios/:id/desbloquear
   */
  @Patch(':id/desbloquear')
  @HttpCode(HttpStatus.OK)
  async desbloquear(@Param('id') id: string) {
    this.logger.log(`[ADMIN] Desbloqueando usuário: ${id}`);
    const usuario = await this.usuarioService.desbloquear(id);
    return {
      message: `Usuário ${usuario.nome} desbloqueado com sucesso!`,
      usuario,
    };
  }

  /**
   * Gera token JWT para outro usuário (impersonação).
   * Permite que Admin "se transforme" em outro usuário para testes.
   * Rota: POST /api/usuarios/:id/personificar
   */
  @Post(':id/personificar')
  @HttpCode(HttpStatus.OK)
  async personificar(@Param('id') id: string, @Request() req) {
    // Obtém dados do admin autenticado (injetado pelo JwtAuthGuard)
    const admin = req.user;
    this.logger.log(
      `[ADMIN] Impersonação solicitada: ${admin.email} → Usuário ${id}`,
    );
    const token = await this.usuarioService.personificar(admin.id, id);
    return token;
  }

  /**
   * Inicia o processo de reset de senha para um usuário (Admin).
   * Rota: POST /api/usuarios/:id/iniciar-reset-senha
   */
  @Post(':id/iniciar-reset-senha')
  @HttpCode(HttpStatus.OK)
  async iniciarResetSenha(@Param('id') id: string) {
    this.logger.log(`[ADMIN] Iniciando reset de senha para usuário: ${id}`);
    return await this.usuarioService.iniciarResetSenhaAdmin(id);
  }
}

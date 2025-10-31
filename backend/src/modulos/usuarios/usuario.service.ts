/**
 * ============================================================================
 * USUARIO SERVICE - Lógica de Negócio do Módulo de Usuários
 * ============================================================================
 *
 * Serviço responsável por toda a lógica de gerenciamento de usuários pelo
 * Admin. Fornece CRUD completo, aprovação de cadastros pendentes, bloqueio
 * e funcionalidade de impersonação.
 *
 * REFATORAÇÃO (Tarefa 44.1 - Sprint 18.1):
 * - Método `criarAdmin` agora suporta senha OPCIONAL
 * - Se senha NÃO fornecida: Gera token temporário de 7 dias
 * - Retorna `{ usuario, tokenOriginal }` para o Admin copiar
 * - Adicionado sanitização de WhatsApp
 * - Melhoradas mensagens de erro e logs de auditoria
 *
 * Responsabilidades:
 * - CRUD de usuários (criar, listar, buscar, atualizar, remover)
 * - Listagem com filtros (status, papel, nomeOuEmail, ótica)
 * - Aprovação de usuários pendentes (status PENDENTE → ATIVO)
 * - Bloqueio e desbloqueio de usuários (status BLOQUEADO ↔ ATIVO)
 * - Impersonação (Admin gera token para outro usuário)
 * - Validação de duplicatas e integridade de dados
 *
 * @module UsuariosModule
 * ============================================================================
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AutenticacaoService } from '../autenticacao/autenticacao.service';
import { CriarUsuarioAdminDto } from './dto/criar-usuario-admin.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { ListarUsuariosFiltroDto } from './dto/listar-usuarios.filtro.dto';
import { Usuario, StatusUsuario, PapelUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * Interface de retorno para criação de usuário.
 * Inclui o tokenOriginal quando senha não fornecida.
 */
export interface CriacaoUsuarioResposta {
  usuario: Usuario;
  tokenOriginal: string | null;
}

/**
 * Serviço de gerenciamento de usuários.
 */
@Injectable()
export class UsuarioService {
  /** Logger dedicado para rastrear operações do módulo de usuários. */
  private readonly logger = new Logger(UsuarioService.name);

  /** Número de rounds de salt para bcrypt. */
  private readonly BCRYPT_SALT_ROUNDS = 10;

  /** Tempo de expiração do token de primeiro acesso (7 dias em ms). */
  private readonly TOKEN_EXPIRACAO_MS = 7 * 24 * 3600 * 1000; // 7 dias

  /**
   * Construtor do serviço.
   * @param prisma - Serviço Prisma para acesso ao banco de dados
   * @param autenticacaoService - Serviço de autenticação (para impersonação)
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly autenticacaoService: AutenticacaoService,
  ) {}

  /**
   * Método privado para sanitizar CPF.
   * @param cpf - CPF com ou sem pontuação
   * @returns CPF limpo (apenas dígitos)
   * @private
   */
  private _limparCpf(cpf: string): string {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new BadRequestException(
        `CPF inválido. Deve conter exatamente 11 dígitos. Recebido: ${cpfLimpo.length} dígitos.`,
      );
    }
    return cpfLimpo;
  }

  /**
   * Método privado para sanitizar WhatsApp/Telefone.
   * Remove caracteres não numéricos.
   * @param whatsapp - WhatsApp com ou sem pontuação
   * @returns WhatsApp limpo (apenas dígitos)
   * @private
   */
  private _limparWhatsApp(whatsapp: string): string {
    const whatsappLimpo = whatsapp.replace(/\D/g, '');
    if (whatsappLimpo.length < 10 || whatsappLimpo.length > 13) {
      throw new BadRequestException(
        `WhatsApp inválido. Deve conter entre 10 e 13 dígitos (com DDD e código do país). Recebido: ${whatsappLimpo.length} dígitos.`,
      );
    }
    return whatsappLimpo;
  }

  /**
   * Lista todos os usuários com filtros opcionais.
   * Permite filtrar por nomeOuEmail (parcial), papel, status e óticaId.
   */
  async listar(filtros: ListarUsuariosFiltroDto = {}): Promise<Usuario[]> {
    this.logger.log('Admin: Listando usuários com filtros avançados');
    const where: any = {};

    if (filtros.nomeOuEmail) {
      where.OR = [
        { nome: { contains: filtros.nomeOuEmail, mode: 'insensitive' } },
        { email: { contains: filtros.nomeOuEmail, mode: 'insensitive' } },
      ];
    }
    if (filtros.papel) {
      where.papel = filtros.papel;
    }
    if (filtros.status) {
      where.status = filtros.status;
    }
    if (filtros.opticaId) {
      where.opticaId = filtros.opticaId;
    }

    return this.prisma.usuario.findMany({
      where,
      include: {
        optica: true,
        gerente: { select: { id: true, nome: true, email: true } },
        vendedores: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  /**
   * Busca um usuário específico pelo ID.
   * @param id - UUID do usuário
   * @returns Usuário encontrado
   * @throws {NotFoundException} Se usuário não encontrado
   */
  async buscarPorId(id: string): Promise<Usuario> {
    this.logger.log(`Buscando usuário por ID: ${id}`);
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        optica: true,
        gerente: { select: { id: true, nome: true, email: true } },
        vendedores: { select: { id: true, nome: true, email: true } },
      },
    });
    if (!usuario) {
      this.logger.warn(`Usuário não encontrado: ${id}`);
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }
    return usuario;
  }

  /**
   * Cria um novo usuário (Admin) com suporte a senha opcional.
   *
   * REFATORAÇÃO (Tarefa 44.1):
   * - Senha é OPCIONAL
   * - Se senha fornecida: Hasheia e salva, usuário pode logar imediatamente
   * - Se senha NÃO fornecida: Gera token temporário de 7 dias para primeiro acesso
   *
   * Validações:
   * - Ótica ativa (se opticaId fornecido)
   * - Gerente válido (se gerenteId fornecido)
   * - Email único
   * - CPF único (se fornecido)
   *
   * @param dados - Dados do usuário a ser criado
   * @returns Objeto com usuário criado e tokenOriginal (se gerado)
   */
  async criarAdmin(
    dados: CriarUsuarioAdminDto,
  ): Promise<CriacaoUsuarioResposta> {
    this.logger.log(
      `[ADMIN] Criando usuário: ${dados.email} (Papel: ${dados.papel})`,
    );

    // ==========================================================================
    // VALIDAÇÕES DE RELAÇÕES
    // ==========================================================================

    // Validação de ótica, se informado
    if (dados.opticaId) {
      const optica = await this.prisma.optica.findUnique({
        where: { id: dados.opticaId },
      });
      if (!optica) {
        throw new BadRequestException(
          'Ótica não encontrada. Verifique o ID informado.',
        );
      }
      if (!optica.ativa) {
        throw new BadRequestException(
          `A ótica "${optica.nome}" está inativa e não pode ter usuários vinculados.`,
        );
      }
    }

    // Validação de gerente, se informado
    if (dados.gerenteId) {
      const gerente = await this.prisma.usuario.findUnique({
        where: { id: dados.gerenteId },
      });
      if (!gerente) {
        throw new BadRequestException(
          'Gerente não encontrado. Verifique o ID informado.',
        );
      }
      if (gerente.papel !== 'GERENTE') {
        throw new BadRequestException(
          `O usuário "${gerente.nome}" não é um gerente. Apenas usuários com papel GERENTE podem ser vinculados.`,
        );
      }
    }

    // ==========================================================================
    // SANITIZAÇÃO DE DADOS
    // ==========================================================================

    let cpfLimpo: string | undefined;
    if (dados.cpf) {
      cpfLimpo = this._limparCpf(dados.cpf);
    }

    let whatsappLimpo: string | undefined;
    if (dados.whatsapp) {
      whatsappLimpo = this._limparWhatsApp(dados.whatsapp);
    }

    // ==========================================================================
    // VALIDAÇÃO DE DUPLICIDADE (EMAIL E CPF)
    // ==========================================================================

    const usuarioExistente = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { email: dados.email },
          ...(cpfLimpo ? [{ cpf: cpfLimpo }] : []),
        ],
      },
    });

    if (usuarioExistente) {
      if (usuarioExistente.email === dados.email) {
        throw new ConflictException(
          `O email "${dados.email}" já está cadastrado no sistema.`,
        );
      } else {
        throw new ConflictException(
          `O CPF "${dados.cpf}" já está cadastrado para o usuário "${usuarioExistente.nome}".`,
        );
      }
    }

    // ==========================================================================
    // LÓGICA DE SENHA OU TOKEN (REFATORAÇÃO - Tarefa 44.1)
    // ==========================================================================

    let senhaHash: string;
    let tokenOriginal: string | null = null;
    let tokenHash: string | null = null;
    let tokenResetarSenhaExpira: Date | null = null;

    if (dados.senha) {
      // ========================================================================
      // CENÁRIO 1: Admin definiu uma senha
      // ========================================================================
      this.logger.log(
        `  → Senha fornecida. Usuário poderá logar imediatamente.`,
      );
      senhaHash = await bcrypt.hash(dados.senha, this.BCRYPT_SALT_ROUNDS);
    } else {
      // ========================================================================
      // CENÁRIO 2: Admin NÃO definiu senha (Fluxo Passwordless - Padrão)
      // ========================================================================
      this.logger.log(
        `  → Senha NÃO fornecida. Gerando token de primeiro acesso (validade: 7 dias)`,
      );

      // Gera token seguro de 64 caracteres hexadecimais
      tokenOriginal = crypto.randomBytes(32).toString('hex');

      // Hasheia o token para armazenar no banco (segurança)
      tokenHash = crypto
        .createHash('sha256')
        .update(tokenOriginal)
        .digest('hex');

      // Define data de expiração (7 dias a partir de agora)
      tokenResetarSenhaExpira = new Date(
        Date.now() + this.TOKEN_EXPIRACAO_MS,
      );

      // Gera senha "impossível" temporária (usuário não consegue adivinhar)
      // Isso garante que o usuário DEVE usar o token para definir a primeira senha
      const senhaTemporariaImpossivel = crypto.randomBytes(64).toString('hex');
      senhaHash = await bcrypt.hash(
        senhaTemporariaImpossivel,
        this.BCRYPT_SALT_ROUNDS,
      );

      this.logger.log(
        `  → Token gerado. Expira em: ${tokenResetarSenhaExpira.toLocaleString('pt-BR')}`,
      );
    }

    // ==========================================================================
    // CRIAÇÃO DO USUÁRIO NO BANCO
    // ==========================================================================

    const usuario = await this.prisma.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        senhaHash,
        papel: dados.papel,
        status: dados.status || 'ATIVO', // Padrão: ATIVO
        cpf: cpfLimpo,
        whatsapp: whatsappLimpo,
        opticaId: dados.opticaId,
        gerenteId: dados.gerenteId,
        // Campos de token (preenchidos apenas se senha não fornecida)
        tokenResetarSenha: tokenHash,
        tokenResetarSenhaExpira: tokenResetarSenhaExpira,
      },
      include: {
        optica: true,
        gerente: { select: { id: true, nome: true, email: true } },
      },
    });

    // ==========================================================================
    // LOGS DE AUDITORIA
    // ==========================================================================

    this.logger.log(
      `✅ Usuário criado com sucesso: ${usuario.nome} (${usuario.email})`,
    );
    this.logger.log(`  → ID: ${usuario.id}`);
    this.logger.log(`  → Papel: ${usuario.papel}`);
    this.logger.log(`  → Status: ${usuario.status}`);
    if (usuario.optica) {
      this.logger.log(`  → Ótica: ${usuario.optica.nome}`);
    }
    if (usuario.gerente) {
      this.logger.log(`  → Gerente: ${usuario.gerente.nome}`);
    }
    if (tokenOriginal) {
      this.logger.log(
        `  → ⚠️  Token de primeiro acesso gerado. Admin deve copiar e enviar ao usuário.`,
      );
    }

    // ==========================================================================
    // RETORNO
    // ==========================================================================

    return {
      usuario,
      tokenOriginal, // Será null se senha foi fornecida, ou string se gerado
    };
  }

  /**
   * Atualiza dados de um usuário existente.
   * Remove a possibilidade de atualizar a senha.
   * Valida relações: ótica ativa, gerente válido.
   */
  async atualizar(id: string, dados: AtualizarUsuarioDto): Promise<Usuario> {
    this.logger.log(`Atualizando usuário: ${id}`);

    await this.buscarPorId(id);

    // Validação de ótica, se informado
    if (dados.opticaId) {
      const optica = await this.prisma.optica.findUnique({
        where: { id: dados.opticaId },
      });
      if (!optica || !optica.ativa) {
        throw new BadRequestException('Ótica inválida ou inativa.');
      }
    }
    // Validação de gerente, se informado
    if (dados.gerenteId) {
      const gerente = await this.prisma.usuario.findUnique({
        where: { id: dados.gerenteId },
      });
      if (!gerente || gerente.papel !== 'GERENTE') {
        throw new BadRequestException('Gerente inválido.');
      }
    }

    // Sanitização de CPF
    let cpfLimpo: string | undefined;
    if (dados.cpf) {
      cpfLimpo = this._limparCpf(dados.cpf);
    }

    // Sanitização de WhatsApp
    let whatsappLimpo: string | undefined;
    if (dados.whatsapp) {
      whatsappLimpo = this._limparWhatsApp(dados.whatsapp);
    }

    // Validação de duplicidade (email e CPF)
    if (dados.email || cpfLimpo) {
      const usuarioComMesmoDado = await this.prisma.usuario.findFirst({
        where: {
          OR: [
            ...(dados.email ? [{ email: dados.email }] : []),
            ...(cpfLimpo ? [{ cpf: cpfLimpo }] : []),
          ],
          NOT: { id }, // Considera outros usuários apenas
        },
      });
      if (usuarioComMesmoDado) {
        if (usuarioComMesmoDado.email === dados.email) {
          throw new ConflictException(
            'Este email já está em uso por outro usuário',
          );
        } else {
          throw new ConflictException(
            'Este CPF já está em uso por outro usuário',
          );
        }
      }
    }

    // Remove campo senha (não é permitido atualizar)
    const dadosAtualizacao: any = { ...dados };
    delete dadosAtualizacao.senha;
    if (cpfLimpo) {
      dadosAtualizacao.cpf = cpfLimpo;
    }
    if (whatsappLimpo) {
      dadosAtualizacao.whatsapp = whatsappLimpo;
    }

    return this.prisma.usuario.update({
      where: { id },
      data: dadosAtualizacao,
    });
  }

  /**
   * Remove um usuário do sistema (soft delete). Marca como BLOQUEADO.
   */
  async remover(id: string): Promise<Usuario> {
    this.logger.log(`Removendo usuário: ${id}`);
    await this.buscarPorId(id);
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: { status: 'BLOQUEADO' },
    });
    this.logger.log(`✅ Usuário bloqueado (soft delete): ${usuario.nome}`);
    return usuario;
  }

  /**
   * Aprova um usuário pendente (status PENDENTE → ATIVO).
   */
  async aprovar(id: string): Promise<Usuario> {
    this.logger.log(`Aprovando usuário: ${id}`);
    const usuario = await this.buscarPorId(id);
    if (usuario.status === 'ATIVO') {
      this.logger.warn(`Tentativa de aprovar usuário já ativo: ${id}`);
      throw new BadRequestException('Este usuário já está ativo');
    }
    if (usuario.status === 'BLOQUEADO') {
      this.logger.warn(`Tentativa de aprovar usuário bloqueado: ${id}`);
      throw new BadRequestException(
        'Este usuário está bloqueado. Desbloqueie antes de aprovar.',
      );
    }
    const usuarioAprovado = await this.prisma.usuario.update({
      where: { id },
      data: { status: 'ATIVO' },
    });
    this.logger.log(
      `✅ Usuário aprovado: ${usuarioAprovado.nome} (${usuarioAprovado.email})`,
    );
    return usuarioAprovado;
  }

  /**
   * Bloqueia um usuário (status → BLOQUEADO).
   */
  async bloquear(id: string): Promise<Usuario> {
    this.logger.log(`Bloqueando usuário: ${id}`);
    const usuario = await this.buscarPorId(id);
    if (usuario.status === 'BLOQUEADO') {
      this.logger.warn(`Tentativa de bloquear usuário já bloqueado: ${id}`);
      throw new BadRequestException('Este usuário já está bloqueado');
    }
    const usuarioBloqueado = await this.prisma.usuario.update({
      where: { id },
      data: { status: 'BLOQUEADO' },
    });
    this.logger.log(
      `✅ Usuário bloqueado: ${usuarioBloqueado.nome} (${usuarioBloqueado.email})`,
    );
    return usuarioBloqueado;
  }

  /**
   * Desbloqueia um usuário bloqueado (status volta para ATIVO).
   */
  async desbloquear(id: string): Promise<Usuario> {
    const usuario = await this.buscarPorId(id);
    if (usuario.status !== 'BLOQUEADO') {
      throw new BadRequestException('Usuário não está bloqueado.');
    }
    return this.prisma.usuario.update({
      where: { id },
      data: { status: 'ATIVO' },
    });
  }

  /**
   * Gera token JWT para outro usuário (impersonação).
   */
  async personificar(idUsuarioAdmin: string, idUsuarioAlvo: string) {
    this.logger.log(
      `Impersonação solicitada: Admin ${idUsuarioAdmin} → Usuário ${idUsuarioAlvo}`,
    );
    if (idUsuarioAdmin === idUsuarioAlvo) {
      this.logger.warn(
        `Tentativa de auto-impersonação bloqueada: ${idUsuarioAdmin}`,
      );
      throw new BadRequestException('Você não pode personificar a si mesmo');
    }
    const usuarioAlvo = await this.buscarPorId(idUsuarioAlvo);
    const token = this.autenticacaoService.gerarToken({
      id: usuarioAlvo.id,
      email: usuarioAlvo.email,
      papel: usuarioAlvo.papel,
      nome: usuarioAlvo.nome,
    });
    this.logger.log(
      `✅ Token de impersonação gerado: Admin personificando ${usuarioAlvo.nome} (${usuarioAlvo.email})`,
    );
    return token;
  }

  /**
   * Inicia o processo de reset de senha para um usuário (Admin).
   * Gera token válido por 1 hora.
   */
  async iniciarResetSenhaAdmin(
    idUsuario: string,
  ): Promise<{ tokenOriginal: string }> {
    this.logger.log(`Iniciando reset de senha para usuário: ${idUsuario}`);
    const usuario = await this.buscarPorId(idUsuario);
    const tokenOriginal = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(tokenOriginal)
      .digest('hex');
    const expiraEm = new Date(Date.now() + 14400000); // 4 horas

    await this.prisma.usuario.update({
      where: { id: idUsuario },
      data: {
        tokenResetarSenha: tokenHash,
        tokenResetarSenhaExpira: expiraEm,
      },
    });

    this.logger.log(
      `✅ Token de reset gerado para: ${usuario.nome} (${usuario.email}) - Expira em: ${expiraEm.toLocaleString('pt-BR')}`,
    );

    return { tokenOriginal };
  }
}

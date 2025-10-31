/**
 * ============================================================================
 * AUTENTICACAO SERVICE - Lógica de Negócio de Autenticação
 * ============================================================================
 * 
 * Descrição:
 * Serviço responsável por toda a lógica de registro e autenticação de
 * usuários. Gerencia criptografia de senhas, geração de tokens JWT e
 * validação de status de usuários.
 * 
 * Responsabilidades:
 * - Auto-registro de vendedores com status PENDENTE
 * - Login com validação de senha e status (apenas ATIVO pode logar)
 * - Geração de tokens JWT com payload personalizado
 * - Sanitização de CPF (remover pontuação)
 * - Validação de duplicatas (email, CPF)
 * 
 * Fluxo de Registro:
 * 1. Sanitiza CPF (remove pontuação)
 * 2. Valida duplicatas (email, CPF)
 * 3. Criptografa senha com bcrypt (salt rounds: 10)
 * 4. Cria usuário com status PENDENTE e papel VENDEDOR
 * 5. Retorna mensagem de sucesso (SEM token)
 * 
 * Fluxo de Login:
 * 1. Busca usuário por email
 * 2. Compara senha com bcrypt
 * 3. Valida status (PENDENTE/BLOQUEADO = erro, ATIVO = ok)
 * 4. Gera token JWT com payload {sub, email, papel}
 * 5. Retorna token para o cliente
 * 
 * @module AutenticacaoModule
 * ============================================================================
 */

import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrarUsuarioDto } from './dto/registrar-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { ValidarTokenResetDto } from './dto/validar-token-reset.dto';
import { ResetarSenhaDto } from './dto/resetar-senha.dto';
import * as bcrypt from 'bcrypt';
import { PapelUsuario, StatusUsuario } from '@prisma/client'; // <-- Importar Enums do Prisma
import * as crypto from 'crypto';

/**
 * Interface para o payload do token JWT.
 * 
 * Define a estrutura de dados que será codificada no token.
 */
export interface JwtPayload {  // <-- Adicione "export"
  sub: string; // ID do usuário
  email: string; // Email do usuário
  papel: string; // Papel do usuário (ADMIN, GERENTE, VENDEDOR)
  opticaId?: string; // ID da ótica (opcional, para Gerente/Vendedor)
}

/**
 * Interface para a resposta de login.
 */
export interface RespostaLogin {
  accessToken: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    papel: string;
    opticaId?: string;
  };
}

/**
 * Serviço de autenticação e registro de usuários.
 */
@Injectable()
export class AutenticacaoService {
  /**
   * Logger dedicado para rastrear operações de autenticação.
   */
  private readonly logger = new Logger(AutenticacaoService.name);

  /**
   * Número de rounds de salt para bcrypt (quanto maior, mais seguro mas mais lento).
   * Valor recomendado: 10-12 para produção.
   */
  private readonly BCRYPT_SALT_ROUNDS = 10;

  /**
   * Construtor do serviço.
   * 
   * @param prisma - Serviço Prisma para acesso ao banco de dados
   * @param jwtService - Serviço JWT para geração de tokens
   * @param configService - Serviço de configuração para ler variáveis do .env
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Método privado para sanitizar CPF.
   * 
   * Remove todos os caracteres não numéricos (pontos, traços, espaços)
   * do CPF, deixando apenas os 11 dígitos.
   * 
   * Exemplos:
   * - "123.456.789-00" → "12345678900"
   * - "123 456 789 00" → "12345678900"
   * - "12345678900" → "12345678900"
   * 
   * @param cpf - CPF com ou sem pontuação
   * @returns CPF limpo (apenas dígitos)
   * 
   * @throws {BadRequestException} Se CPF não tiver exatamente 11 dígitos
   * 
   * @private
   */
  private _limparCpf(cpf: string): string {
    // Remove tudo que não for dígito (0-9)
    const cpfLimpo = cpf.replace(/\D/g, '');

    // Valida que o CPF tem exatamente 11 dígitos após limpeza
    if (cpfLimpo.length !== 11) {
      throw new BadRequestException(
        `CPF inválido. Deve conter exatamente 11 dígitos. Recebido: ${cpfLimpo.length} dígitos.`,
      );
    }

    return cpfLimpo;
  }

  /**
   * Método privado para formatar e validar o nome do usuário.
   *
   * Garante que o nome seja armazenado de forma padronizada e atenda às regras de negócio.
   * - Capitaliza a primeira letra de cada palavra.
   * - Remove espaços extras.
   * - Valida se o nome tem no mínimo duas palavras com pelo menos 2 letras cada.
   *
   * @param nome - Nome completo do usuário.
   * @returns Nome formatado.
   * @throws {BadRequestException} Se o nome não atender aos critérios.
   *
   * @private
   */
  private _formatarNome(nome: string): string {
    if (!nome || nome.trim().length < 5) { // Validação inicial rápida
      throw new BadRequestException('Nome completo inválido.');
    }

    const nomeFormatado = nome
      .trim()
      .replace(/\s+/g, ' ') // Remove espaços duplicados
      .split(' ')
      .map(palavra =>
        palavra.length > 0
          ? palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase()
          : '',
      )
      .join(' ');

    // Validação de Regex: Mínimo duas palavras, cada uma com no mínimo 2 letras.
    // Ex: "Joao" (inválido), "Joao S" (inválido), "Joao Silva" (válido), "Ana C. Silva" (válido)
    const palavras = nomeFormatado.split(' ').filter(p => p.length >= 2);
    if (palavras.length < 2) {
      throw new BadRequestException(
        'O nome completo deve conter no mínimo duas palavras com duas ou mais letras cada.',
      );
    }

    return nomeFormatado;
  }


  /**
   * Método público para gerar token JWT.
   * 
   * MUDANÇA: Este método era privado (_gerarToken) e foi tornado público
   * para permitir que o UsuarioModule o use na funcionalidade de impersonação.
   * 
   * @param usuario - Dados do usuário para codificar no token
   * @returns Token JWT e dados básicos do usuário
   * 
   * @public
   */
  public gerarToken(usuario: {
    id: string;
    email: string;
    papel: string;
    nome: string;
    opticaId?: string | null;
  }): RespostaLogin {
    // Cria o payload do JWT
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      papel: usuario.papel,
      opticaId: usuario.opticaId || undefined,
    };

    // Assina o token com o secret do .env
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`Token JWT gerado para usuário: ${usuario.email}`);

    return {
      accessToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        opticaId: usuario.opticaId || undefined,
      },
    };
  }


  /**
   * Registra um novo vendedor no sistema (auto-registro).
   * 
   * Este método implementa a "Jornada de João" - o fluxo onde um vendedor
   * se auto-registra na plataforma sem intervenção do admin.
   * 
   * Fluxo:
   * 1. Sanitiza o CPF (remove pontuação)
   * 2. Verifica se email ou CPF já existem (lança erro se duplicado)
   * 3. Criptografa a senha usando bcrypt
   * 4. Cria o usuário no banco com:
   *    - Dados fornecidos (nome, email, cpfLimpo, opticaId)
   *    - senhaHash (senha criptografada)
   *    - papel: VENDEDOR (hardcoded)
   *    - status: PENDENTE (hardcoded)
   * 5. Retorna mensagem de sucesso
   * 
   * IMPORTANTE: O usuário NÃO recebe token neste momento. Ele só poderá
   * fazer login após um Admin alterar seu status para ATIVO.
   * 
   * @param dados - Dados do vendedor a ser registrado
   * @returns Mensagem de sucesso
   * 
   * @throws {BadRequestException} Se CPF inválido (não tem 11 dígitos)
   * @throws {ConflictException} Se email ou CPF já cadastrado
   * 
   * @example
   * ```
   * const resultado = await autenticacaoService.registrar({
   *   nome: 'João da Silva',
   *   email: 'joao@email.com',
   *   cpf: '123.456.789-00',
   *   senha: 'Senha@123',
   *   opticaId: 'uuid-da-optica'
   * });
   * // { message: 'Cadastro enviado com sucesso. Aguardando aprovação.' }
   * ```
   */
  async registrar(dados: RegistrarUsuarioDto): Promise<{ message: string }> {
    this.logger.log(`Registrando novo vendedor: ${dados.email}`);

    // Formata e valida o nome do usuário
    const nomeFormatado = this._formatarNome(dados.nome);

    // Sanitiza o CPF (remove pontuação e valida)
    const cpfLimpo = this._limparCpf(dados.cpf);

    // Validação extra para CPFs inválidos com dígitos repetidos
    if (/^(\d)\1+$/.test(cpfLimpo)) {
      throw new BadRequestException('CPF inválido. Não pode conter todos os dígitos iguais.');
    }

    // Verifica se email ou CPF já estão cadastrados
    const usuarioExistente = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ email: dados.email }, { cpf: cpfLimpo }],
      },
    });

    if (usuarioExistente) {
      this.logger.warn(
        `Tentativa de cadastro duplicado: ${dados.email} ou CPF ${cpfLimpo}`,
      );

      // Identifica qual campo está duplicado para mensagem específica
      if (usuarioExistente.email === dados.email) {
        throw new ConflictException('Este email já está cadastrado');
      } else {
        throw new ConflictException('Este CPF já está cadastrado');
      }
    }

    // Criptografa a senha usando bcrypt
    const senhaHash = await bcrypt.hash(dados.senha, this.BCRYPT_SALT_ROUNDS);

    // Cria o usuário no banco
    const usuario = await this.prisma.usuario.create({
      data: {
        nome: nomeFormatado, // <-- Usar nome formatado
        email: dados.email,
        cpf: cpfLimpo,
        senhaHash,
        opticaId: dados.opticaId,
        papel: PapelUsuario.VENDEDOR, // <-- Usar Enum
        status: StatusUsuario.PENDENTE, // <-- Usar Enum
      },
    });

    this.logger.log(
      `✅ Vendedor registrado com sucesso: ${usuario.nome} (ID: ${usuario.id}) - Status: PENDENTE`,
    );

    return {
      message:
        'Cadastro enviado com sucesso! Sua conta será ativada após aprovação do administrador.',
    };
  }

  /**
   * Autentica um usuário e gera token JWT.
   * 
   * Este método implementa o fluxo de login para todos os tipos de usuários
   * (Admin, Gerente, Vendedor). Inclui validações rigorosas de segurança.
   * 
   * Fluxo:
   * 1. Busca usuário pelo email (lança erro se não existir)
   * 2. Compara senha fornecida com hash armazenado usando bcrypt
   * 3. Valida status do usuário:
   *    - PENDENTE → Erro: aguardando aprovação
   *    - BLOQUEADO → Erro: conta bloqueada
   *    - ATIVO → Procede com login
   * 4. Gera token JWT com payload {sub, email, papel}
   * 5. Retorna token para o cliente armazenar e usar
   * 
   * O token deve ser enviado em requisições futuras no header:
   * Authorization: Bearer <token>
   * 
   * @param dados - Credenciais de login (email e senha)
   * @returns Token JWT e dados básicos do usuário
   * 
   * @throws {NotFoundException} Se email não cadastrado
   * @throws {UnauthorizedException} Se senha inválida, status PENDENTE ou BLOQUEADO
   * 
   * @example
   * ```
   * const resultado = await autenticacaoService.login({
   *   email: 'joao@email.com',
   *   senha: 'Senha@123'
   * });
   * // {
   * //   accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
   * //   usuario: { id: '...', nome: 'João', email: '...', papel: 'VENDEDOR' }
   * // }
   * ```
   */
  async login(dados: LoginDto): Promise<RespostaLogin> {
    this.logger.log(`Tentativa de login: ${dados.email}`);

    // Busca usuário pelo email
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dados.email },
    });

    // Valida se usuário existe
    if (!usuario) {
      this.logger.warn(`Tentativa de login com email inexistente: ${dados.email}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Compara senha fornecida com hash armazenado
    const senhaValida = await bcrypt.compare(dados.senha, usuario.senhaHash);

    if (!senhaValida) {
      this.logger.warn(`Tentativa de login com senha incorreta: ${dados.email}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Validação de status: PENDENTE
    if (usuario.status === StatusUsuario.PENDENTE) { // <-- Usar Enum
      this.logger.warn(
        `Tentativa de login com conta pendente: ${dados.email} (ID: ${usuario.id})`,
      );
      throw new UnauthorizedException(
        'Sua conta está aguardando aprovação do administrador. Você receberá um email quando sua conta for ativada.',
      );
    }

    // Validação de status: BLOQUEADO
    if (usuario.status === StatusUsuario.BLOQUEADO) { // <-- Usar Enum
      this.logger.warn(
        `Tentativa de login com conta bloqueada: ${dados.email} (ID: ${usuario.id})`,
      );
      throw new UnauthorizedException(
        'Sua conta foi bloqueada. Entre em contato com o administrador para mais informações.',
      );
    }

    // Validação de status: deve ser ATIVO
    if (usuario.status !== StatusUsuario.ATIVO) { // <-- Usar Enum
      this.logger.error(
        `Status desconhecido durante login: ${usuario.status} (User: ${dados.email})`,
      );
      throw new UnauthorizedException('Status de conta inválido');
    }

    // Gera e retorna o token JWT
    this.logger.log(
      `✅ Login bem-sucedido: ${usuario.nome} (${usuario.email}) - Papel: ${usuario.papel}`,
    );

    return this.gerarToken({
      id: usuario.id,
      email: usuario.email,
      papel: usuario.papel,
      nome: usuario.nome,
      opticaId: usuario.opticaId,
    });
  }

  /**
   * Valida um token de reset de senha (Público).
   *
   * Este método verifica se um token é válido e não expirou, mas
   * NÃO o invalida. É usado pelo frontend para verificar o token
   * antes de exibir o formulário de nova senha.
   *
   * @param dados - DTO contendo o token a ser validado
   * @returns Mensagem de sucesso se o token for válido
   * @throws {BadRequestException} Se o token for inválido ou expirado
   */
  async validarTokenReset(
    dados: ValidarTokenResetDto,
  ): Promise<{ message: string }> {
    this.logger.log(`Validando token de reset de senha.`);

    const tokenHash = crypto
      .createHash('sha256')
      .update(dados.token)
      .digest('hex');

    const usuario = await this.prisma.usuario.findUnique({
      where: { tokenResetarSenha: tokenHash },
    });

    if (!usuario) {
      this.logger.warn('Tentativa de validação com token inválido.');
      throw new BadRequestException('Token de reset inválido ou já utilizado.');
    }

    if (usuario.tokenResetarSenhaExpira < new Date()) {
      this.logger.warn(
        `Tentativa de validação com token expirado: ${usuario.email}`,
      );
      throw new BadRequestException(
        'Token de reset expirado. Solicite um novo token ao administrador.',
      );
    }

    this.logger.log(`Token validado com sucesso para: ${usuario.email}`);

    return { message: 'Token válido.' };
  }

    /**
   * Reseta a senha de um usuário usando token (Público).
   * 
   * Este método valida o token de reset fornecido pelo usuário e atualiza
   * sua senha. O token é de uso único e expira em 1 hora.
   * 
   * Fluxo de Segurança:
   * 1. Recebe token original do usuário
   * 2. Gera hash SHA-256 do token (mesma função usada na geração)
   * 3. Busca usuário pelo hash no banco
   * 4. Valida existência e expiração do token
   * 5. Atualiza senha e remove token do banco (uso único)
   * 
   * Por que gerar hash novamente?
   * - Token original nunca foi salvo no banco
   * - Apenas o hash foi armazenado
   * - Precisamos gerar o mesmo hash para buscar/validar
   * 
   * @param dados - Token e nova senha
   * @returns Mensagem de sucesso
   * 
   * @throws {BadRequestException} Se token inválido ou expirado
   * 
   * @example
   * ```
   * await autenticacaoService.resetarSenha({
   *   token: 'a1b2c3d4e5f6...',
   *   novaSenha: 'NovaSenha@123'
   * });
   * ```
   */
  async resetarSenha(dados: ResetarSenhaDto): Promise<{ message: string }> {
    this.logger.log('Processando reset de senha');

    /**
     * Gera hash SHA-256 do token recebido.
     * 
     * Usa a mesma função de hash usada na geração do token.
     * Isso permite buscar o usuário pelo hash no banco.
     * 
     * Token original → Hash SHA-256 → Busca no banco
     */
    const tokenHash = crypto
      .createHash('sha256')
      .update(dados.token)
      .digest('hex');

    /**
     * Busca usuário pelo hash do token.
     * 
     * Se o token for válido (foi gerado corretamente), o hash
     * corresponderá a um registro no banco.
     */
    const usuario = await this.prisma.usuario.findUnique({
      where: { tokenResetarSenha: tokenHash },
    });

    /**
     * Validação 1: Token existe?
     * 
     * Se não encontrar usuário, o token é inválido:
     * - Token nunca foi gerado
     * - Token já foi usado (foi removido do banco)
     * - Token foi digitado incorretamente
     */
    if (!usuario) {
      this.logger.warn('Tentativa de reset com token inválido');
      throw new BadRequestException(
        'Token de reset inválido ou já utilizado',
      );
    }

    /**
     * Validação 2: Token expirou?
     * 
     * Compara a data de expiração com a data atual.
     * Se expirou, não permite o reset (segurança).
     */
    if (usuario.tokenResetarSenhaExpira < new Date()) {
      this.logger.warn(
        `Tentativa de reset com token expirado: ${usuario.email}`,
      );
      throw new BadRequestException(
        'Token de reset expirado. Solicite um novo token ao administrador.',
      );
    }

    /**
     * Criptografa a nova senha.
     * 
     * Usa bcrypt com 10 rounds de salt (padrão seguro).
     * Mesmo processo usado no registro e login.
     */
    const senhaHash = await bcrypt.hash(dados.novaSenha, this.BCRYPT_SALT_ROUNDS);

    /**
     * Atualiza senha e remove token (uso único).
     * 
     * Atualiza 3 campos:
     * 1. senhaHash: Nova senha criptografada
     * 2. tokenResetarSenha: null (remove token, torna-o inválido)
     * 3. tokenResetarSenhaExpira: null (remove expiração)
     * 
     * Isso garante que o token só pode ser usado UMA vez.
     * Tentativas futuras com o mesmo token falharão (não existe mais no banco).
     */
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash,
        tokenResetarSenha: null, // Remove token (uso único)
        tokenResetarSenhaExpira: null, // Remove expiração
      },
    });

    this.logger.log(
      `✅ Senha resetada com sucesso: ${usuario.nome} (${usuario.email})`,
    );

    return {
      message: 'Senha alterada com sucesso! Você já pode fazer login com sua nova senha.',
    };
  }

}

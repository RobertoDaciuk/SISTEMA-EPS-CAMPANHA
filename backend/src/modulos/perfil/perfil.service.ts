import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';
import { AtualizarSenhaDto } from './dto/atualizar-senha.dto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * ====================================================================
 * SERVIÇO: PerfilService
 * ====================================================================
 *
 * Serviço de perfil pessoal para autoatendimento do usuário autenticado.
 *
 * Princípios de Segurança (Data Tenancy):
 * - Toda operação utiliza o usuarioId extraído do JWT.
 * - Nenhuma operação permite alterar dados de outros usuários.
 * - Campos sensíveis (senhaHash) nunca são retornados.
 * - Campos restritos (email, papel, status) não podem ser alterados pelo usuário.
 *
 * Funcionalidades:
 * - Consultar próprio perfil (GET /perfil/meu)
 * - Atualizar próprio perfil (PATCH /perfil/meu)
 * - Alterar própria senha (PATCH /perfil/meu/senha)
 *
 * Versão: 4.1 (Sprint 17.2 - Tarefa 40.1)
 * - Adicionado suporte ao campo mapeamentoPlanilhaSalvo
 */
@Injectable()
export class PerfilService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ====================================================================
   * MÉTODO: Consultar Próprio Perfil
   * ====================================================================
   *
   * Retorna os dados públicos e seguros do perfil do usuário autenticado.
   *
   * Segurança:
   * - Apenas campos públicos são retornados (sem senhaHash).
   * - O usuarioId vem do JWT, garantindo que o usuário só veja seus próprios dados.
   *
   * Campos Retornados:
   * - Identificação: id, nome, email, cpf, avatarUrl
   * - Autorização: papel, status
   * - Gamificação: nivel, saldoMoedinhas, rankingMoedinhas
   * - Contato: whatsapp
   * - Preferências: mapeamentoPlanilhaSalvo (Sprint 17.2)
   * - Auditoria: criadoEm, atualizadoEm
   *
   * @param usuarioId - ID do usuário obtido via JWT (req.user.id)
   * @returns Objeto com os dados públicos do perfil
   *
   * @example
   * const perfil = await perfilService.meuPerfil('uuid-do-usuario');
   * // Retorna:
   * // {
   * //   id: 'uuid-do-usuario',
   * //   nome: 'João Silva',
   * //   email: 'joao@example.com',
   * //   papel: 'ADMIN',
   * //   mapeamentoPlanilhaSalvo: { "Coluna X": "NOME_PRODUTO" },
   * //   ...
   * // }
   */
  async meuPerfil(usuarioId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        // ====================================
        // CAMPOS DE IDENTIFICAÇÃO
        // ====================================
        id: true,
        nome: true,
        email: true,
        cpf: true,
        avatarUrl: true,

        // ====================================
        // CAMPOS DE AUTORIZAÇÃO
        // ====================================
        papel: true,
        status: true,

        // ====================================
        // CAMPOS DE GAMIFICAÇÃO
        // ====================================
        nivel: true,
        saldoMoedinhas: true,
        rankingMoedinhas: true,

        // ====================================
        // CAMPOS DE CONTATO
        // ====================================
        whatsapp: true,

        // ====================================
        // CAMPOS DE PREFERÊNCIAS
        // (Adicionado Sprint 17.2 - Tarefa 40.1)
        // ====================================
        /**
         * Preferências de mapeamento de colunas da planilha.
         * Usado por administradores na validação de vendas.
         * Permite salvar e reutilizar mapeamentos de colunas entre uploads.
         */
        mapeamentoPlanilhaSalvo: true,

        // ====================================
        // CAMPOS DE AUDITORIA
        // ====================================
        criadoEm: true,
        atualizadoEm: true,

        // ====================================
        // DADOS DA ÓTICA VINCULADA (NOVO)
        // ====================================
        optica: {
          select: {
            nome: true,
            cnpj: true,
          },
        },

        // ====================================
        // CAMPO SENSÍVEL (NUNCA RETORNAR)
        // ====================================
        // senhaHash: false (omitido por padrão no select)
      },
    });
  }

  /**
   * ====================================================================
   * MÉTODO: Atualizar Próprio Perfil
   * ====================================================================
   *
   * Atualiza os dados do perfil do usuário autenticado.
   *
   * Regras de Negócio:
   * - Apenas campos enviados no DTO são atualizados (partial update).
   * - Campos restritos (email, papel, status) não podem ser alterados.
   * - O campo senhaHash só pode ser alterado via método específico (atualizarSenha).
   * - Validações do DTO são aplicadas automaticamente pelo ValidationPipe.
   *
   * Campos Atualizáveis:
   * - nome: Nome completo do usuário
   * - cpf: CPF (11 dígitos, validado pelo DTO)
   * - whatsapp: WhatsApp (formato DDI+DDD+número, validado pelo DTO)
   * - mapeamentoPlanilhaSalvo: Preferências de mapeamento (objeto JSON ou null)
   *
   * Segurança:
   * - O usuarioId vem do JWT, impedindo alteração de outros perfis.
   * - Campos sensíveis (senhaHash) não são expostos no retorno.
   *
   * @param usuarioId - ID do usuário obtido via JWT (req.user.id)
   * @param dto - Dados a serem atualizados (AtualizarPerfilDto)
   * @returns Perfil atualizado (mesmos campos do meuPerfil)
   *
   * @throws BadRequestException - Se validação do DTO falhar
   *
   * @example
   * // Atualizar nome e mapeamento
   * const perfil = await perfilService.atualizarMeuPerfil('uuid-usuario', {
   *   nome: 'João Silva Santos',
   *   mapeamentoPlanilhaSalvo: {
   *     "Coluna A": "NOME_PRODUTO",
   *     "Coluna B": "DATA_VENDA"
   *   }
   * });
   *
   * @example
   * // Limpar mapeamento salvo
   * const perfil = await perfilService.atualizarMeuPerfil('uuid-usuario', {
   *   mapeamentoPlanilhaSalvo: null
   * });
   */
  async atualizarMeuPerfil(usuarioId: string, dto: AtualizarPerfilDto) {
    // ====================================
    // CONSTRUIR OBJETO DE ATUALIZAÇÃO
    // ====================================
    /**
     * Construímos o objeto 'data' dinamicamente, incluindo apenas
     * os campos que foram enviados no DTO.
     *
     * Isso permite atualizações parciais (partial updates) sem
     * sobrescrever campos não enviados com undefined.
     */
    const data: Prisma.UsuarioUpdateInput = {};

    // ====================================
    // CAMPO: nome
    // ====================================
    if (dto.nome !== undefined) {
      data.nome = dto.nome;
    }

    // ====================================
    // CAMPO: cpf
    // ====================================
    if (dto.cpf !== undefined) {
      // Validação de formato já foi feita pelo DTO (@Matches)
      data.cpf = dto.cpf;
    }

    // ====================================
    // CAMPO: whatsapp
    // ====================================
    if (dto.whatsapp !== undefined) {
      // Validação de formato já foi feita pelo DTO (@Matches)
      data.whatsapp = dto.whatsapp;
    }

    // ====================================
    // CAMPO: mapeamentoPlanilhaSalvo
    // (Adicionado Sprint 17.2 - Tarefa 40.1)
    // ====================================
    /**
     * Permitimos explicitamente setar como null para limpar as preferências.
     * Uso do operador !== undefined garante que:
     * - Se o campo não vier no DTO, não é atualizado
     * - Se vier como null, é atualizado para null (limpeza)
     * - Se vier com objeto, é atualizado com o objeto
     */
    if (dto.mapeamentoPlanilhaSalvo !== undefined) {
      data.mapeamentoPlanilhaSalvo = dto.mapeamentoPlanilhaSalvo;
    }

    // ====================================
    // EXECUTAR ATUALIZAÇÃO NO BANCO
    // ====================================
    /**
     * Executa o update usando o objeto 'data' construído dinamicamente.
     * O Prisma interpreta campos Json (como mapeamentoPlanilhaSalvo)
     * automaticamente, convertendo objetos TypeScript em JSON.
     */
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: data,
      select: {
        // ====================================
        // RETORNAR OS MESMOS CAMPOS DO meuPerfil
        // ====================================
        // (Mantém consistência entre GET e PATCH)
        id: true,
        nome: true,
        email: true,
        cpf: true,
        avatarUrl: true,
        papel: true,
        status: true,
        nivel: true,
        saldoMoedinhas: true,
        rankingMoedinhas: true,
        whatsapp: true,
        mapeamentoPlanilhaSalvo: true, // Sprint 17.2
        criadoEm: true,
        atualizadoEm: true,
      },
    });
  }

  /**
   * ====================================================================
   * MÉTODO: Alterar Própria Senha
   * ====================================================================
   *
   * Permite ao usuário alterar sua própria senha.
   *
   * Segurança:
   * - Requer a senha atual para autorizar a mudança.
   * - A senha atual é validada com bcrypt antes de permitir a alteração.
   * - A nova senha é hasheada com bcrypt antes de ser salva.
   * - Não retorna o senhaHash no response.
   *
   * Regras de Negócio:
   * - A senha atual deve ser fornecida e estar correta.
   * - A nova senha deve atender aos requisitos do DTO (mínimo 6 caracteres).
   *
   * @param usuarioId - ID do usuário obtido via JWT (req.user.id)
   * @param dto - Objeto contendo senhaAtual e novaSenha (AtualizarSenhaDto)
   * @returns Perfil atualizado (sem senhaHash)
   *
   * @throws UnauthorizedException - Se a senha atual estiver incorreta
   *
   * @example
   * const perfil = await perfilService.atualizarSenha('uuid-usuario', {
   *   senhaAtual: 'senhaAntiga123',
   *   novaSenha: 'novaSenha456'
   * });
   */
  async atualizarSenha(usuarioId: string, dto: AtualizarSenhaDto) {
    // ====================================
    // BUSCAR USUÁRIO COM SENHA ATUAL
    // ====================================
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { senhaHash: true },
    });

    // ====================================
    // VALIDAR SENHA ATUAL
    // ====================================
    const senhaValida = await bcrypt.compare(
      dto.senhaAtual,
      usuario.senhaHash,
    );

    if (!senhaValida) {
      throw new UnauthorizedException('A senha atual está incorreta.');
    }

    // ====================================
    // HASHEAR NOVA SENHA
    // ====================================
    const novaSenhaHash = await bcrypt.hash(dto.novaSenha, 10);

    // ====================================
    // ATUALIZAR SENHA NO BANCO
    // ====================================
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { senhaHash: novaSenhaHash },
      select: {
        // Retornar apenas campos seguros (sem senhaHash)
        id: true,
        nome: true,
        email: true,
        cpf: true,
        avatarUrl: true,
        papel: true,
        status: true,
        nivel: true,
        saldoMoedinhas: true,
        rankingMoedinhas: true,
        whatsapp: true,
        mapeamentoPlanilhaSalvo: true, // Sprint 17.2
        criadoEm: true,
        atualizadoEm: true,
      },
    });
  }

  /**
   * ====================================================================
   * MÉTODO: Consultar Configurações do Usuário
   * ====================================================================
   *
   * Retorna configurações específicas para o usuário logado, usadas
   * para customizar a experiência no frontend (ex: mostrar/esconder menus).
   *
   * @param usuarioId - ID do usuário obtido via JWT (req.user.id)
   * @returns Objeto com as configurações aplicáveis ao usuário.
   */
  async getMinhaConfiguracao(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        papel: true,
        optica: {
          select: {
            rankingVisivelParaVendedores: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException();
    }

    // Para vendedores, a visibilidade do ranking depende da configuração da ótica.
    // Para outros papéis, o padrão pode ser true ou não aplicável.
    const rankingVisivel = usuario.optica?.rankingVisivelParaVendedores ?? false;

    return {
      ranking: {
        visivel: rankingVisivel,
      },
    };
  }
}

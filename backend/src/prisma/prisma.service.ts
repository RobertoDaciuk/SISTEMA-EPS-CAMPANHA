/**
 * ============================================================================
 * PRISMA SERVICE - Serviço de Conexão com Banco de Dados
 * ============================================================================
 * 
 * Descrição:
 * Este serviço é o ponto de entrada único e centralizado para todas as 
 * operações de banco de dados na aplicação "EPS Campanhas". Ele estende o 
 * PrismaClient e gerencia automaticamente o ciclo de vida da conexão com o 
 * PostgreSQL.
 * 
 * Responsabilidades:
 * - Estabelecer conexão com o banco de dados na inicialização do módulo
 * - Desconectar graciosamente quando a aplicação for encerrada
 * - Fornecer acesso tipado a todos os modelos do banco (Usuario, Campanha, etc.)
 * - Centralizar queries e transações para facilitar manutenção e logs
 * 
 * Uso:
 * Injete este serviço em qualquer módulo para acessar o banco:
 * ```
 * constructor(private readonly prisma: PrismaService) {}
 * 
 * async buscarUsuario(id: string) {
 *   return this.prisma.usuario.findUnique({ where: { id } });
 * }
 * ```
 * 
 * Vantagens desta Abordagem:
 * - Singleton: Uma única instância do PrismaClient em toda a aplicação
 * - Type-safe: TypeScript valida queries em tempo de compilação
 * - Connection pooling: Prisma gerencia automaticamente o pool de conexões
 * - Graceful shutdown: Conexões são fechadas corretamente ao desligar
 * 
 * @module PrismaService
 * ============================================================================
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Serviço responsável pela conexão e interação com o banco de dados PostgreSQL.
 * 
 * Este serviço estende o PrismaClient, herdando todos os métodos para acesso
 * aos modelos (usuario, campanha, envioVenda, etc.) e implementa hooks de
 * ciclo de vida do NestJS para gerenciar a conexão automaticamente.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * Logger dedicado para rastrear eventos relacionados ao Prisma.
   * Útil para debug de queries, erros de conexão e performance.
   */
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Construtor do serviço Prisma.
   * 
   * Inicializa o PrismaClient com configurações específicas para otimizar
   * a conexão com o banco e habilitar logs detalhados em desenvolvimento.
   */
  constructor() {
    super({
      log: [
        // Em desenvolvimento, loga todas as queries para facilitar debug
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
      errorFormat: 'colorless', // Formato legível de erros no console
    });

    // Listener para logar queries em desenvolvimento (útil para otimização)
    // @ts-ignore - Prisma Client possui tipagem especial para eventos
    this.$on('query', (e) => {
      this.logger.debug(`Query: ${e.query}`);
      this.logger.debug(`Params: ${e.params}`);
      this.logger.debug(`Duration: ${e.duration}ms`);
    });
  }

  /**
   * Hook do ciclo de vida: executado quando o módulo NestJS é inicializado.
   * 
   * Este método é chamado automaticamente pelo NestJS após a criação da
   * instância do serviço. Ele estabelece a conexão com o banco de dados
   * PostgreSQL usando as credenciais definidas na DATABASE_URL (.env).
   * 
   * @throws {Error} Se falhar ao conectar ao banco (ex: credenciais inválidas)
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.log('Conectando ao banco de dados PostgreSQL...');
      
      // Estabelece conexão com o banco (retry automático configurado no Prisma)
      await this.$connect();
      
      this.logger.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
    } catch (erro) {
      this.logger.error('❌ Falha ao conectar ao banco de dados PostgreSQL', erro);
      
      // Em produção, você pode querer fazer retry ou alertar equipe de DevOps
      throw new Error(`Erro crítico: Não foi possível conectar ao banco de dados. ${erro.message}`);
    }
  }

  /**
   * Hook do ciclo de vida: executado quando o módulo NestJS é destruído.
   * 
   * Este método é chamado automaticamente pelo NestJS quando a aplicação
   * está sendo encerrada (ex: SIGTERM, SIGINT, processo sendo morto).
   * Ele garante que todas as conexões abertas sejam fechadas graciosamente,
   * evitando conexões órfãs no banco de dados.
   * 
   * @throws {Error} Se falhar ao desconectar (geralmente não crítico)
   */
  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log('Desconectando do banco de dados PostgreSQL...');
      
      // Fecha todas as conexões do pool de forma ordenada
      await this.$disconnect();
      
      this.logger.log('✅ Desconexão do PostgreSQL realizada com sucesso!');
    } catch (erro) {
      this.logger.warn('⚠️ Aviso ao desconectar do banco de dados', erro);
      
      // Não re-lança o erro pois a aplicação já está sendo encerrada
    }
  }

  /**
   * Método auxiliar para limpar o banco de dados (útil em testes).
   * 
   * ATENÇÃO: Este método deleta TODOS os dados de TODAS as tabelas.
   * Use SOMENTE em ambiente de desenvolvimento ou testes automatizados.
   * NUNCA chame este método em produção.
   * 
   * @example
   * ```
   * // Em um arquivo de teste (e2e)
   * beforeEach(async () => {
   *   await prismaService.limparBancoDeDados();
   * });
   * ```
   */
  async limparBancoDeDados(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('⛔ BLOQUEADO: Não é permitido limpar banco em produção!');
    }

    this.logger.warn('🧹 Limpando banco de dados (APENAS DESENVOLVIMENTO)...');

    // Ordem de deleção respeita foreign keys (dependências primeiro)
    await this.$transaction([
      this.notificacao.deleteMany(),
      this.resgatePremio.deleteMany(),
      this.relatorioFinanceiro.deleteMany(),
      this.envioVenda.deleteMany(),
      this.requisitoCartela.deleteMany(),
      this.regraCartela.deleteMany(),
      this.campanha.deleteMany(),
      this.premio.deleteMany(),
      this.usuario.deleteMany(),
      this.configuracaoGlobal.deleteMany(),
    ]);

    this.logger.log('✅ Banco de dados limpo com sucesso!');
  }
}

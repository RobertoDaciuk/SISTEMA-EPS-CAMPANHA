/**
 * ============================================================================
 * MAIN.TS - Ponto de Entrada da Aplicação EPS Campanhas
 * ============================================================================
 * 
 * Descrição:
 * Este é o arquivo de bootstrap (ignição) da aplicação NestJS. Ele é
 * responsável por criar a instância da aplicação, configurar middlewares
 * globais, habilitar recursos como CORS e validação, e iniciar o servidor
 * HTTP na porta especificada.
 * 
 * Fluxo de Inicialização:
 * 1. NestFactory cria a aplicação a partir do AppModule
 * 2. ConfigService é obtido para ler variáveis de ambiente
 * 3. Middlewares e configurações globais são aplicados
 * 4. Servidor HTTP inicia e escuta na porta definida
 * 5. Logs de inicialização são exibidos no console
 * 
 * Configurações Globais Aplicadas:
 * - CORS (Cross-Origin Resource Sharing)
 * - Validação automática de DTOs (class-validator)
 * - Prefixo global de rotas (/api)
 * - Parsing automático de JSON
 * - Logs estruturados
 * 
 * @module Main
 * ============================================================================
 */

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

/**
 * Função de bootstrap (inicialização) da aplicação.
 * 
 * Esta função assíncrona é chamada automaticamente quando o arquivo é
 * executado (via `npm run start`). Ela configura e inicia o servidor
 * NestJS com todas as dependências resolvidas.
 * 
 * @async
 * @returns {Promise<void>} Promise que resolve quando o servidor está rodando
 */
async function bootstrap(): Promise<void> {
  /**
   * Logger dedicado para eventos de inicialização.
   * Facilita debug de problemas durante o startup da aplicação.
   */
  const logger = new Logger('Bootstrap');

  try {
    logger.log('🚀 Iniciando aplicação EPS Campanhas...');

    /**
     * Cria a instância da aplicação NestJS a partir do AppModule.
     * 
     * O NestFactory é responsável por:
     * - Instanciar o AppModule e todos os seus imports
     * - Resolver todas as dependências (Dependency Injection)
     * - Executar hooks de ciclo de vida (onModuleInit, etc.)
     * - Criar o servidor HTTP subjacente (Express por padrão)
     * 
     * Configurações:
     * - logger: Array de níveis de log ativos
     * - cors: Configurado separadamente abaixo para mais controle
     */
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    logger.log('✅ Instância da aplicação criada com sucesso');

    // =========================================================================
    // CONFIGURAÇÃO: Serviço de Variáveis de Ambiente
    // =========================================================================

    /**
     * Obtém o ConfigService da aplicação para ler variáveis do .env.
     * 
     * O ConfigService foi registrado como global no AppModule via
     * ConfigModule.forRoot({ isGlobal: true }), então está disponível aqui.
     */
    const configService = app.get(ConfigService);

    // =========================================================================
    // CONFIGURAÇÃO: Porta do Servidor
    // =========================================================================

    /**
     * Porta em que o servidor HTTP irá escutar requisições.
     * 
     * Lê a variável PORT do .env, com fallback para 3000 se não definida.
     * Em produção, plataformas como Heroku/Railway definem PORT automaticamente.
     */
    const porta = configService.get<number>('PORT') || 3000;

    // =========================================================================
    // CONFIGURAÇÃO: CORS (Cross-Origin Resource Sharing)
    // =========================================================================

    /**
     * Habilita CORS para permitir requisições do frontend Next.js.
     * 
     * Em desenvolvimento, o frontend roda em localhost:3001 (porta diferente),
     * então precisamos permitir cross-origin requests. Em produção, configure
     * apenas o domínio específico do frontend para segurança.
     * 
     * Configurações:
     * - origin: URL(s) permitidas para fazer requisições (configService.get('CORS_ORIGIN'))
     * - credentials: true - Permite envio de cookies e headers de autenticação
     * - methods: Métodos HTTP permitidos
     * - allowedHeaders: Headers customizados aceitos (ex: Authorization)
     */
    app.enableCors({
      origin: configService.get<string>('CORS_ORIGIN') || 'http://localhost:3001',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    app.use(cookieParser());

    logger.log('✅ CORS e Cookie Parser habilitados');

    // =========================================================================
    // CONFIGURAÇÃO: Prefixo Global de Rotas
    // =========================================================================

    /**
     * Define prefixo global "/api" para todas as rotas.
     * 
     * Com isso, todas as rotas da aplicação terão o prefixo /api:
     * - POST /api/autenticacao/login
     * - GET /api/usuarios
     * - GET /api/campanhas/:id
     * 
     * Benefícios:
     * - Organização clara (separa API de outras rotas, ex: health checks)
     * - Facilita versionamento futuro (ex: /api/v1, /api/v2)
     * - Padrão de mercado para APIs REST
     */
    app.setGlobalPrefix('api');

    logger.log('✅ Prefixo global "/api" configurado');

    // =========================================================================
    // CONFIGURAÇÃO: Validação Automática de DTOs
    // =========================================================================

    /**
     * Habilita validação automática de dados de entrada usando class-validator.
     * 
     * Com o ValidationPipe global, todos os DTOs (Data Transfer Objects)
     * decorados com class-validator (@IsEmail, @IsString, etc.) são
     * automaticamente validados antes de chegarem aos controllers.
     * 
     * Configurações:
     * - whitelist: true
     *   Remove propriedades não decoradas do DTO (previne mass assignment)
     * 
     * - forbidNonWhitelisted: true
     *   Lança erro se propriedades não decoradas forem enviadas
     * 
     * - transform: true
     *   Transforma automaticamente tipos (ex: "123" -> 123 para @IsNumber)
     * 
     * - transformOptions.enableImplicitConversion: true
     *   Habilita conversão implícita de tipos primitivos
     * 
     * Exemplo de Uso:
     * ```typescript
     * // dto/criar-usuario.dto.ts
     * export class CriarUsuarioDto {
     *   @IsEmail()
     *   email: string; // Validado automaticamente
     * 
     *   @MinLength(8)
     *   senha: string; // Validado automaticamente
     * }
     * ```
     */
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Remove propriedades extras
        forbidNonWhitelisted: true, // Lança erro se receber propriedades extras
        transform: true, // Transforma payloads em DTOs tipados
        transformOptions: {
          enableImplicitConversion: true, // Converte tipos automaticamente
        },
      }),
    );

    logger.log('✅ Validação automática de DTOs habilitada');

    // =========================================================================
    // INICIALIZAÇÃO: Iniciar Servidor HTTP
    // =========================================================================

    /**
     * Inicia o servidor HTTP e escuta requisições na porta definida.
     * 
     * A partir deste momento, a aplicação está pronta para receber requisições.
     * O NestJS escuta eventos de shutdown (SIGTERM, SIGINT) automaticamente
     * e executa hooks de limpeza (onModuleDestroy) ao encerrar.
     */
    await app.listen(porta);

    // =========================================================================
    // LOGS: Informações de Inicialização
    // =========================================================================

    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.log('🎉 Servidor EPS Campanhas está rodando!');
    logger.log(`🌐 URL: http://localhost:${porta}/api`);
    logger.log(`📦 Ambiente: ${configService.get<string>('NODE_ENV') || 'development'}`);
    logger.log(`🗄️  Banco: PostgreSQL (Prisma conectado)`);
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (erro) {
    // =========================================================================
    // TRATAMENTO DE ERROS: Falha na Inicialização
    // =========================================================================

    logger.error('❌ Erro crítico ao inicializar a aplicação:', erro);
    
    /**
     * Encerra o processo com código de erro (1).
     * Em produção, ferramentas de orquestração (Kubernetes, Docker Swarm)
     * detectam isso e podem reiniciar automaticamente o container.
     */
    process.exit(1);
  }
}

/**
 * Executa a função de bootstrap.
 * 
 * Este é o ponto de entrada real do programa. Quando você executa
 * `npm run start`, o Node.js carrega este arquivo e executa esta linha.
 */
bootstrap();

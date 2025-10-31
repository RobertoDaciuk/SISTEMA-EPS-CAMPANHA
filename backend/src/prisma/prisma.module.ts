/**
 * ============================================================================
 * PRISMA MODULE - Módulo Global de Banco de Dados
 * ============================================================================
 * 
 * Descrição:
 * Este módulo encapsula o PrismaService e o torna disponível globalmente
 * em toda a aplicação NestJS. Ao usar o decorator @Global(), evitamos a
 * necessidade de re-importar o PrismaModule em cada módulo de feature que
 * precise acessar o banco de dados.
 * 
 * Por que Global?
 * Em uma aplicação NestJS típica, você teria que importar o PrismaModule
 * em TODOS os módulos que precisassem acessar o banco (UsuariosModule,
 * CampanhasModule, AutenticacaoModule, etc.). Isso gera muito boilerplate.
 * 
 * Com @Global(), o PrismaService é registrado uma única vez e fica
 * disponível para injeção em qualquer lugar da aplicação, similar a
 * variáveis de ambiente (ConfigModule).
 * 
 * Exemplo de Uso em Outros Módulos:
 * ```
 * // usuarios/usuarios.service.ts
 * @Injectable()
 * export class UsuariosService {
 *   // PrismaService está disponível sem importar PrismaModule!
 *   constructor(private readonly prisma: PrismaService) {}
 * }
 * ```
 * 
 * Arquitetura:
 * - Providers: [PrismaService] - Instancia o serviço
 * - Exports: [PrismaService] - Disponibiliza para outros módulos
 * - Global: true - Torna disponível em toda aplicação
 * 
 * @module PrismaModule
 * ============================================================================
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global que gerencia a conexão com o banco de dados PostgreSQL.
 * 
 * Este módulo é marcado como @Global(), o que significa que o PrismaService
 * estará disponível para injeção de dependências em qualquer módulo da
 * aplicação sem necessidade de importação explícita.
 * 
 * Benefícios:
 * - Reduz boilerplate (menos imports repetidos)
 * - Garante singleton do PrismaClient (uma única instância)
 * - Centraliza configuração de banco de dados
 * - Facilita manutenção (alterações em um único lugar)
 */
@Global()
@Module({
  /**
   * Providers: Serviços instanciados por este módulo.
   * 
   * O PrismaService é instanciado uma única vez quando a aplicação inicia
   * (padrão Singleton). O NestJS gerencia automaticamente o ciclo de vida,
   * chamando onModuleInit e onModuleDestroy nos momentos apropriados.
   */
  providers: [PrismaService],

  /**
   * Exports: Serviços disponibilizados para outros módulos.
   * 
   * Ao exportar o PrismaService, permitimos que outros módulos o injetem
   * em seus serviços sem precisar re-declarar. Combinado com @Global(),
   * isso torna o PrismaService universalmente acessível.
   */
  exports: [PrismaService],
})
export class PrismaModule {}

/**
 * ============================================================================
 * APP MODULE - Módulo Raiz da Aplicação EPS Campanhas
 * ============================================================================
 * 
 * Descrição:
 * Este é o módulo raiz (root module) da aplicação NestJS. Ele orquestra
 * todos os módulos de feature (usuários, campanhas, autenticação, etc.) e
 * configura serviços globais necessários para o funcionamento da aplicação.
 * 
 * Responsabilidades:
 * - Carregar variáveis de ambiente do arquivo .env (via ConfigModule)
 * - Importar o PrismaModule para conexão com banco de dados
 * - Importar módulos de features (OticaModule, AutenticacaoModule, etc.)
 * - Configurar middlewares, guards e interceptors globais
 * - Definir providers globais (ex: serviços de email, cache, etc.)
 * 
 * @module AppModule
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { OticaModule } from './modulos/oticas/otica.module';
import { AutenticacaoModule } from './modulos/autenticacao/autenticacao.module';
import { UsuarioModule } from './modulos/usuarios/usuario.module';
import { CampanhaModule } from './modulos/campanhas/campanha.module';
import { EnvioVendaModule } from './modulos/envio-venda/envio-venda.module';
import { ValidacaoModule } from './modulos/validacao/validacao.module';
import { RecompensaModule } from './modulos/recompensa/recompensa.module';
import { RelatorioFinanceiroModule } from './modulos/relatorio-financeiro/relatorio-financeiro.module';
import { PremioModule } from './modulos/premios/premio.module';
import { ResgateModule } from './modulos/resgates/resgate.module';
import { NotificacaoModule } from './modulos/notificacoes/notificacao.module';
import { DashboardModule } from './modulos/dashboard/dashboard.module';
import { RankingModule } from './modulos/ranking/ranking.module';
import { UploadModule } from './modulos/upload/upload.module';
import { ConfiguracaoModule } from './modulos/configuracao/configuracao.module';
import { PerfilModule } from './modulos/perfil/perfil.module';

/**
 * Módulo raiz da aplicação "EPS Campanhas".
 */
@Module({
  imports: [
    // ConfigModule: Carrega variáveis de ambiente do arquivo .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),

    // PrismaModule: Gerencia conexão com banco de dados PostgreSQL
    PrismaModule,

    // OticaModule: Gerenciamento de óticas parceiras (CRUD + verificação)
    OticaModule,

    // AutenticacaoModule: Registro e login de usuários (JWT)
    AutenticacaoModule,

    // UsuarioModule: Gerenciamento de usuários pelo Admin (CRUD + Aprovação + Impersonação)
    UsuarioModule,

    // CampanhasModule,
    CampanhaModule,

    // EnviosVendasModule,
    EnvioVendaModule,

    // ValidacaoDePedidos,
    ValidacaoModule,

    RecompensaModule,

    // RelatorioFinanceiroModule,
    RelatorioFinanceiroModule,

    // PremiosModule,
    PremioModule,
    
    // ResgatePremiosModule,
    ResgateModule,

    // NotificacoesModule,
    NotificacaoModule,

    //DashboardModule
    DashboardModule,
    
    // RankingModule
    RankingModule,

    // UploadModule
    UploadModule,

    // ConfiguracaoModule
    ConfiguracaoModule,

    // PerfilModule
    PerfilModule,

  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

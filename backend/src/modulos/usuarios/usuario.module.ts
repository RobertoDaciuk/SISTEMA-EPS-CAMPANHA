/**
 * ============================================================================
 * USUARIO MODULE - Módulo de Gerenciamento de Usuários
 * ============================================================================
 *
 * Módulo NestJS que encapsula toda a funcionalidade de gerenciamento de
 * usuários pelo Admin, incluindo CRUD, aprovação, bloqueio, desbloqueio e
 * impersonação.
 *
 * Componentes:
 * - UsuarioController: Rotas HTTP protegidas (apenas Admin)
 * - UsuarioService: Lógica de negócio
 *
 * Dependências:
 * - AutenticacaoModule: Para geração de tokens (impersonação)
 * - PrismaModule: Acesso ao banco de dados (global)
 * - OticaModule: Para validações de ótica (ativa)
 *
 * @module UsuariosModule
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { UsuarioController } from './usuario.controller';
import { UsuarioService } from './usuario.service';
import { AutenticacaoModule } from '../autenticacao/autenticacao.module';
import { OticaModule } from '../oticas/otica.module';

@Module({
  /**
   * Imports: Módulos necessários.
   * AutenticacaoModule: Exporta AutenticacaoService para impersonação.
   * OticaModule: Exporta validações de ótica ativa.
   */
  imports: [AutenticacaoModule, OticaModule],
  /**
   * Controllers: Controladores HTTP deste módulo.
   */
  controllers: [UsuarioController],
  /**
   * Providers: Serviços instanciados por este módulo.
   */
  providers: [UsuarioService],
  /**
   * Exports: Serviços disponibilizados para outros módulos.
   * UsuarioService pode ser usado por outros módulos futuramente
   * (ex: CampanhasModule para validar vendedores).
   */
  exports: [UsuarioService],
})
export class UsuarioModule {}

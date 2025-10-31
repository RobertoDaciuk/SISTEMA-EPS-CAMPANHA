/**
 * ============================================================================
 * OTICA MODULE - Módulo de Óticas Parceiras
 * ============================================================================
 * 
 * Descrição:
 * Módulo NestJS que encapsula toda a funcionalidade relacionada ao
 * gerenciamento de óticas parceiras da plataforma.
 * 
 * Componentes:
 * - OticaController: Rotas HTTP (CRUD + verificação pública)
 * - OticaService: Lógica de negócio e acesso ao banco
 * 
 * Dependências:
 * - PrismaModule: Injetado globalmente, não precisa importar
 * 
 * Este módulo será importado no AppModule para ativar suas rotas.
 * 
 * @module OticasModule
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { OticaController } from './otica.controller';
import { OticaService } from './otica.service';

/**
 * Módulo de gerenciamento de óticas parceiras.
 * 
 * Fornece endpoints para:
 * - CRUD de óticas (Admin)
 * - Verificação pública de CNPJ (fluxo de registro de usuários)
 */
@Module({
  /**
   * Controllers: Controladores HTTP deste módulo.
   * 
   * Define as rotas em /api/oticas
   */
  controllers: [OticaController],

  /**
   * Providers: Serviços instanciados por este módulo.
   * 
   * OticaService contém toda a lógica de negócio.
   */
  providers: [OticaService],

  /**
   * Exports: Serviços disponibilizados para outros módulos.
   * 
   * OticaService é exportado para que o UsuarioModule possa usá-lo
   * (ex: validar opticaId ao criar usuário).
   */
  exports: [OticaService],
})
export class OticaModule {}

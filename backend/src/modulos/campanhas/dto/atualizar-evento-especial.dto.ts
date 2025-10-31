/**
 * ============================================================================
 * DTO: Atualizar Evento Especial
 * ============================================================================
 *
 * Descrição:
 * DTO para atualização parcial de um evento especial existente.
 *
 * @module CampanhasModule
 * ============================================================================
 */

import { PartialType } from '@nestjs/mapped-types';
import { CriarEventoEspecialDto } from './criar-evento-especial.dto';

/**
 * DTO para atualização parcial de evento especial.
 * Todos os campos são opcionais.
 */
export class AtualizarEventoEspecialDto extends PartialType(CriarEventoEspecialDto) {}

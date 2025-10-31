/**
 * ============================================================================
 * DTO: Atualizar Ótica
 * ============================================================================
 * 
 * Descrição:
 * Data Transfer Object para validação dos dados de atualização de uma ótica
 * existente. Todos os campos são opcionais, permitindo atualização parcial.
 * 
 * Implementação:
 * Estende PartialType(CriarOticaDto), que torna todos os campos do DTO de
 * criação opcionais automaticamente. Isso evita duplicação de código e
 * mantém consistência nas validações.
 * 
 * Uso:
 * - Rota PATCH /api/oticas/:id (Admin apenas)
 * - Permite atualizar 1 ou mais campos sem precisar enviar todos
 * 
 * @module OticasModule
 * ============================================================================
 */

import { PartialType } from '@nestjs/mapped-types';
import { CriarOticaDto } from './criar-otica.dto';

/**
 * DTO para atualização de uma ótica existente.
 * 
 * Herda todas as validações de CriarOticaDto, mas torna todos os campos
 * opcionais (PartialType). Isso permite atualizações parciais.
 * 
 * Exemplos de Uso:
 * ```
 * // Atualizar apenas o telefone
 * { "telefone": "(11) 3333-4444" }
 * 
 * // Atualizar nome e endereço
 * { "nome": "Ótica Nova", "endereco": "Rua Nova, 456" }
 * 
 * // Atualizar todos os campos
 * { "cnpj": "...", "nome": "...", "endereco": "...", ... }
 * ```
 */
export class AtualizarOticaDto extends PartialType(CriarOticaDto) {}

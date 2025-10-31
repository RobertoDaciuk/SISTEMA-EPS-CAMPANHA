import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CriarUsuarioAdminDto } from './criar-usuario-admin.dto';

/**
 * DTO para atualização parcial de usuário.
 * Remove o campo 'senha' das possíveis atualizações.
 * Todos os campos herdados do DTO de criação, exceto 'senha'.
 */
export class AtualizarUsuarioDto extends PartialType(
  OmitType(CriarUsuarioAdminDto, ['senha'] as const),
) {}

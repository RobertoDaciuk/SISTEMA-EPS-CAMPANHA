import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { PapelUsuario, StatusUsuario } from '@prisma/client';

/**
 * DTO para filtros de listagem de usuários no Admin.
 * Todos os campos são opcionais para permitir buscas flexíveis.
 */
export class ListarUsuariosFiltroDto {
  /** Filtro por nome ou email (consulta parcial, insensível a maiúsculas/minúsculas) */
  @IsString()
  @IsOptional()
  nomeOuEmail?: string;

  /** Filtro por papel do usuário (enum Prisma) */
  @IsEnum(PapelUsuario)
  @IsOptional()
  papel?: PapelUsuario;

  /** Filtro por status do usuário (enum Prisma) */
  @IsEnum(StatusUsuario)
  @IsOptional()
  status?: StatusUsuario;

  /** Filtro por ótica associada (UUID válido) */
  @IsUUID()
  @IsOptional()
  opticaId?: string;
}

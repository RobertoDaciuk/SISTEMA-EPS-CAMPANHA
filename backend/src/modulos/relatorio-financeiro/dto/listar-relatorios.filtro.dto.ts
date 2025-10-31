import { IsEnum, IsOptional, IsUUID, IsDateString, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { StatusPagamento } from '@prisma/client';

/**
 * DTO para filtros de consulta de relatórios financeiros.
 * Todos os campos são opcionais e podem ser combinados.
 */
export class ListarRelatoriosFiltroDto {
  @IsOptional()
  @IsEnum(StatusPagamento)
  status?: StatusPagamento;

  @IsOptional()
  @IsUUID()
  campanhaId?: string;

  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  /**
   * NOVO: Flag para indicar se o resultado deve ser agrupado por beneficiário.
   */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  agrupar?: boolean;
}

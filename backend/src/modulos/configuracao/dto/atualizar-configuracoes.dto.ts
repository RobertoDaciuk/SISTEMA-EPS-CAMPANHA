import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para item de configuração a ser atualizada ou criada.
 */
export class ConfiguracaoItemDto {
  @IsString()
  @IsNotEmpty()
  chave: string;

  @IsString()
  valor: string;

  @IsString()
  @IsOptional()
  descricao?: string;
}

/**
 * DTO principal para PATCH /configuracoes - Lote de configurações.
 */
export class AtualizarConfiguracoesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfiguracaoItemDto)
  configuracoes: ConfiguracaoItemDto[];
}

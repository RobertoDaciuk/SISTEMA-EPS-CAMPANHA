import { IsString, IsNotEmpty, IsInt, Min, IsUrl, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO para criação de um prêmio no catálogo (Admin).
 * Todos os campos obrigatórios conforme o schema.prisma.
 */
export class CriarPremioDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  descricao: string;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsInt()
  @Min(1)
  custoMoedinhas: number;

  @IsInt()
  @Min(0)
  estoque: number;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}

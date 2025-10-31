import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO para a ação de marcar múltiplos relatórios como pagos em massa.
 */
export class MarcarEmMassaDto {
  /**
   * Array de IDs (UUIDs) dos relatórios financeiros a serem marcados como pagos.
   */
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true, message: 'Cada ID no array deve ser um UUID válido.' })
  ids: string[];
}

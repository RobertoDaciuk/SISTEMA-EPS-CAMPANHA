/**
 * ============================================================================
 * LISTAR MINHAS ENVIO VENDA DTO
 * ============================================================================
 * 
 * Data Transfer Object para validação de query parameters na rota
 * GET /api/envios-venda/minhas.
 * 
 * Descrição:
 * DTO utilizado exclusivamente pela rota de histórico pessoal do vendedor.
 * Garante que o parâmetro campanhaId seja obrigatório e válido (UUID).
 * 
 * Regras de Validação:
 * - campanhaId: Obrigatório, formato UUID válido
 * 
 * Segurança (Data Tenancy):
 * Este DTO apenas valida o campanhaId fornecido pelo cliente.
 * A segurança real (isolamento de dados por vendedor) é implementada
 * no serviço, que adiciona automaticamente o filtro vendedorId = req.user.id.
 * 
 * Uso:
 * ```
 * @Get('minhas')
 * async listarMinhas(@Query() query: ListarMinhasEnvioVendaDto) {
 *   // query.campanhaId está validado como UUID
 * }
 * ```
 * 
 * @module EnvioVendaModule
 * ============================================================================
 */

import { IsUUID, IsNotEmpty } from 'class-validator';

/**
 * DTO para validação da query string da rota GET /minhas.
 * 
 * Exemplo de requisição válida:
 * GET /api/envios-venda/minhas?campanhaId=550e8400-e29b-41d4-a716-446655440000
 * 
 * Exemplo de requisição inválida (gera 400 Bad Request):
 * GET /api/envios-venda/minhas
 * GET /api/envios-venda/minhas?campanhaId=123  (não é UUID)
 * GET /api/envios-venda/minhas?campanhaId=     (vazio)
 */
export class ListarMinhasEnvioVendaDto {
  /**
   * ID da campanha para filtrar os envios.
   * 
   * Validações:
   * - @IsNotEmpty: Não pode ser vazio ou omitido
   * - @IsUUID: Deve ser um UUID válido no formato 8-4-4-4-12
   * 
   * Tipo: string (UUID v4)
   * Obrigatório: Sim
   * 
   * @example '550e8400-e29b-41d4-a716-446655440000'
   */
  @IsNotEmpty({ message: 'O parâmetro campanhaId é obrigatório.' })
  @IsUUID('4', { message: 'O parâmetro campanhaId deve ser um UUID válido.' })
  campanhaId: string;
}

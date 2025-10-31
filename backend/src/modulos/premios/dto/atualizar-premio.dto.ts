import { PartialType } from '@nestjs/mapped-types';
import { CriarPremioDto } from './criar-premio.dto';

/**
 * DTO para atualização parcial de prêmios.
 */
export class AtualizarPremioDto extends PartialType(CriarPremioDto) {}

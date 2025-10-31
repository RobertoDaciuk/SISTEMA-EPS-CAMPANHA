import { IsBoolean, IsNotEmpty } from 'class-validator';

export class AtualizarVisibilidadeRankingDto {
  @IsBoolean()
  @IsNotEmpty()
  visivel: boolean;
}

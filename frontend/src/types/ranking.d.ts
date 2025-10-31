export interface RankingOtica {
  id: string;
  nome: string;
  ehMatriz: boolean;
  totalPontos: number;
  vendedores: number;
  filiais?: RankingOtica[];
}

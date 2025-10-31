export interface PremioAdmin {
  id?: string;
  nome: string;
  descricao: string;
  custoMoedinhas: number;
  estoque: number;
  imageUrl: string | null;
  ativo: boolean;
}

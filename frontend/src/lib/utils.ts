import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata um valor de CNPJ (apenas números) com a máscara ##.###.###/####-##.
 * @param cnpj String contendo apenas os dígitos do CNPJ.
 * @returns CNPJ formatado.
 */
export const formatarCNPJ = (cnpj: string): string => {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
};

/**
 * Formata um valor de CPF (apenas números) com a máscara ###.###.###-##.
 * @param cpf String contendo apenas os dígitos do CPF.
 * @returns CPF formatado.
 */
export const formatarCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .substring(0, 14);
};

/**
 * Formata um valor de telefone (apenas números) com a máscara (##) # ####-####.
 * @param phone String contendo apenas os dígitos do telefone.
 * @returns Telefone formatado.
 */
export const formatarTelefone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length > 10) {
    return cleaned
      .replace(/^(\d{2})(\d{1})(\d{4})(\d{4}).*/, '($1) $2 $3-$4')
      .substring(0, 16);
  } else {
    return cleaned
      .replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3')
      .substring(0, 14);
  }
};
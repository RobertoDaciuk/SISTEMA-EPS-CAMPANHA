import { useState, useEffect } from 'react';

/**
 * Hook customizado para "atrasar" a atualização de um valor.
 * Útil para evitar chamadas de API excessivas em campos de busca ou inputs.
 * 
 * @param value O valor a ser "atrasado" (ex: texto de um input).
 * @param delay O tempo de atraso em milissegundos.
 * @returns O valor após o tempo de atraso.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configura um timer para atualizar o valor debounced após o delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpa o timer se o valor mudar (ex: usuário continua digitando)
    // ou se o componente for desmontado.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Roda o efeito novamente apenas se o valor ou o delay mudarem

  return debouncedValue;
}

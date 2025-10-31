'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '@/lib/axios';

/**
 * Card com formulário para alteração de senha do usuário.
 */
export default function AlterarSenhaCard() {
  // Estado para os campos do formulário
  const [senhas, setSenhas] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarNovaSenha: '',
  });
  // Estado para controlar o carregamento da submissão
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manipulador para atualizar o estado do formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSenhas(prev => ({ ...prev, [name]: value }));
  };

  // Manipulador para submeter o formulário de alteração de senha
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação no frontend antes de enviar
    if (senhas.novaSenha !== senhas.confirmarNovaSenha) {
      toast.error('A nova senha e a confirmação não são iguais.');
      return;
    }
    if (senhas.novaSenha.length < 6) { // Exemplo de regra de negócio
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        senhaAtual: senhas.senhaAtual,
        novaSenha: senhas.novaSenha,
      };
      await api.patch('/perfil/minha-senha', payload);
      toast.success('Senha alterada com sucesso!');
      // Limpa os campos após o sucesso
      setSenhas({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      const errorMessage = error.response?.data?.message || 'Falha ao alterar a senha.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verifica se o botão de salvar deve estar desabilitado
  const isSubmitDisabled = 
    !senhas.senhaAtual || 
    !senhas.novaSenha || 
    !senhas.confirmarNovaSenha ||
    senhas.novaSenha !== senhas.confirmarNovaSenha;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm mt-8">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">Alterar Senha</h2>
        <p className="mt-1 text-sm text-muted-foreground">Para sua segurança, informe sua senha atual para definir uma nova.</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="senhaAtual" className="block text-sm font-medium text-muted-foreground">Senha Atual</label>
            <input type="password" name="senhaAtual" id="senhaAtual" value={senhas.senhaAtual} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-background border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
          </div>
          <div>
            <label htmlFor="novaSenha" className="block text-sm font-medium text-muted-foreground">Nova Senha</label>
            <input type="password" name="novaSenha" id="novaSenha" value={senhas.novaSenha} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-background border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
          </div>
          <div>
            <label htmlFor="confirmarNovaSenha" className="block text-sm font-medium text-muted-foreground">Confirmar Nova Senha</label>
            <input type="password" name="confirmarNovaSenha" id="confirmarNovaSenha" value={senhas.confirmarNovaSenha} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-background border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
          </div>
        </div>
        <div className="bg-muted/50 px-6 py-3 flex justify-end">
          <button type="submit" disabled={isSubmitDisabled || isSubmitting} className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : 'Salvar Nova Senha'}
          </button>
        </div>
      </form>
    </div>
  );
}

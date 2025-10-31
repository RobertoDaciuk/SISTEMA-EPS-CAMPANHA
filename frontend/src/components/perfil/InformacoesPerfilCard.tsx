'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '@/lib/axios';
import { Building, User, Mail, Badge, Phone } from 'lucide-react';

// --- Funções Utilitárias para Máscaras ---

/** Limpa todos os caracteres não numéricos de uma string */
const limparNumeros = (valor: string | null | undefined = '') => (valor || '').replace(/\D/g, '');

/** Formata uma string de CPF (somente números) para ###.###.###-## */
const formatarCPF = (cpf: string) => {
  const numeros = limparNumeros(cpf);
  return numeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

/** Formata uma string de CNPJ (somente números) para ##.###.###/####-## */
const formatarCNPJ = (cnpj: string) => {
  const numeros = limparNumeros(cnpj);
  return numeros
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

/** Formata uma string de WhatsApp (somente números) para (##) #####-#### */
const formatarWhatsapp = (whatsapp: string) => {
  const numeros = limparNumeros(whatsapp);
  return numeros
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

// --- Tipagem ---

interface PerfilUsuario {
  nome: string;
  email: string;
  cpf: string | null;
  whatsapp: string | null;
  optica: {
    nome: string;
    cnpj: string;
  } | null;
}

interface Props {
  dadosIniciais: PerfilUsuario;
  onPerfilAtualizado: (novosDados: Partial<PerfilUsuario>) => void;
}

/**
 * Card para exibir e editar as informações do perfil do usuário,
 * com máscaras de formatação e validação de comprimento para CPF e WhatsApp.
 */
export default function InformacoesPerfilCard({ dadosIniciais, onPerfilAtualizado }: Props) {
  const [estaEditando, setEstaEditando] = useState(false);
  const [formData, setFormData] = useState({
    nome: dadosIniciais.nome,
    cpf: limparNumeros(dadosIniciais.cpf),
    whatsapp: limparNumeros(dadosIniciais.whatsapp),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      nome: dadosIniciais.nome,
      cpf: limparNumeros(dadosIniciais.cpf),
      whatsapp: limparNumeros(dadosIniciais.whatsapp),
    });
  }, [dadosIniciais]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf' || name === 'whatsapp') {
      setFormData(prev => ({ ...prev, [name]: limparNumeros(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de comprimento do CPF e WhatsApp antes do envio
    if (formData.cpf && formData.cpf.length !== 11) {
      toast.error('CPF inválido. Deve conter exatamente 11 dígitos.');
      return;
    }
    if (formData.whatsapp && (formData.whatsapp.length < 12 || formData.whatsapp.length > 13)) {
      toast.error('WhatsApp inválido. Deve conter DDI, DDD e número (12 ou 13 dígitos).');
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      nome: formData.nome,
      cpf: formData.cpf || null,
      whatsapp: formData.whatsapp || null,
    };

    try {
      const response = await api.patch('/perfil/meu', payload);
      toast.success('Perfil atualizado com sucesso!');
      onPerfilAtualizado(response.data);
      setEstaEditando(false);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error('Falha ao atualizar o perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ItemPerfil = ({ icon: Icon, label, value, formatador }) => (
    <div>
      <dt className="flex items-center text-sm font-medium text-muted-foreground">
        <Icon className="w-4 h-4 mr-2" />
        <span>{label}</span>
      </dt>
      <dd className="mt-1 text-base font-semibold text-foreground">{value ? (formatador ? formatador(value) : value) : 'Não informado'}</dd>
    </div>
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">Minhas Informações</h2>
        <p className="mt-1 text-sm text-muted-foreground">Seus dados pessoais e da ótica vinculada.</p>
      </div>
      
      {estaEditando ? (
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-muted-foreground">Nome Completo</label>
              <input type="text" name="nome" id="nome" value={formData.nome} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-background border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
            </div>
            <div>
              <label htmlFor="cpf" className="block text-sm font-medium text-muted-foreground">CPF</label>
              <input type="text" name="cpf" id="cpf" value={formatarCPF(formData.cpf)} onChange={handleChange} maxLength={14} placeholder="000.000.000-00" className="mt-1 block w-full rounded-md bg-background border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
            </div>
            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-muted-foreground">WhatsApp</label>
              <input type="text" name="whatsapp" id="whatsapp" value={formatarWhatsapp(formData.whatsapp)} onChange={handleChange} maxLength={15} placeholder="(00) 00000-0000" className="mt-1 block w-full rounded-md bg-background border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
            </div>
          </div>
          <div className="bg-muted/50 px-6 py-3 flex justify-end space-x-3">
            <button type="button" onClick={() => setEstaEditando(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium rounded-md hover:bg-accent">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
            <ItemPerfil icon={User} label="Nome Completo" value={dadosIniciais.nome} />
            <ItemPerfil icon={Mail} label="Email" value={dadosIniciais.email} />
            <ItemPerfil icon={Badge} label="CPF" value={dadosIniciais.cpf} formatador={formatarCPF} />
            <ItemPerfil icon={Phone} label="WhatsApp" value={dadosIniciais.whatsapp} formatador={formatarWhatsapp} />
            <div className="sm:col-span-2 border-t border-border pt-6">
              <ItemPerfil icon={Building} label="Nome da Ótica" value={dadosIniciais.optica?.nome} />
            </div>
            <div>
              <ItemPerfil icon={Badge} label="CNPJ da Ótica" value={dadosIniciais.optica?.cnpj} formatador={formatarCNPJ} />
            </div>
          </dl>
          <div className="bg-muted/50 px-6 py-3 flex justify-end">
            <button onClick={() => setEstaEditando(true)} className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
              Editar Perfil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

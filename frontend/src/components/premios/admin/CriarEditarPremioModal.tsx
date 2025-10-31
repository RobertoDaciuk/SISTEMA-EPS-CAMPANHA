'use client';

import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition, Switch } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import api from '@/lib/axios';

import { PremioAdmin } from '@/types/premio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (premio: PremioAdmin) => void; // Callback para atualizar a UI na página
  premioInicial: PremioAdmin | null;
}

const initialState: PremioAdmin = {
  nome: '',
  descricao: '',
  custoMoedinhas: 0,
  estoque: 0,
  imageUrl: null,
  ativo: true,
};

export default function CriarEditarPremioModal({ isOpen, onClose, onSave, premioInicial }: Props) {
  const [premio, setPremio] = useState<PremioAdmin>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!premioInicial;

  useEffect(() => {
    if (isOpen) {
      setPremio(premioInicial || initialState);
    }
  }, [isOpen, premioInicial]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPremio(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPremio(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const custo = parseInt(String(premio.custoMoedinhas), 10) || 0;
    if (custo < 1) {
      toast.error('O custo em moedinhas deve ser de no mínimo 1.');
      return;
    }
    if (!premio.nome || !premio.descricao) {
      toast.error('Os campos Nome e Descrição são obrigatórios.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      nome: premio.nome,
      descricao: premio.descricao,
      custoMoedinhas: custo,
      estoque: parseInt(String(premio.estoque), 10) || 0,
      ativo: premio.ativo,
      imageUrl: premio.imageUrl && premio.imageUrl.trim() !== '' ? premio.imageUrl : null,
    };

    try {
      let savedPremio;
      if (isEditMode) {
        const res = await api.patch(`/premios/${premioInicial?.id}`, payload);
        savedPremio = res.data;
        toast.success('Prêmio atualizado com sucesso!');
      } else {
        const res = await api.post('/premios', payload);
        savedPremio = res.data;
        toast.success('Prêmio criado com sucesso!');
      }
      onSave(savedPremio);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar prêmio:", error);
      toast.error('Falha ao salvar o prêmio. Verifique os campos e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-card text-left align-middle shadow-xl transition-all border border-border">
                <form onSubmit={handleSubmit}>
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-foreground p-6 border-b border-border">
                    {isEditMode ? 'Editar Prêmio' : 'Adicionar Novo Prêmio'}
                  </Dialog.Title>
                  
                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Campos do Formulário */}
                    <div>
                      <label htmlFor="nome" className="block text-sm font-medium text-muted-foreground">Nome do Prêmio</label>
                      <input type="text" name="nome" id="nome" value={premio.nome} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-background border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                    </div>
                    <div>
                      <label htmlFor="descricao" className="block text-sm font-medium text-muted-foreground">Descrição</label>
                      <textarea name="descricao" id="descricao" value={premio.descricao} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md bg-background border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"></textarea>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="custoMoedinhas" className="block text-sm font-medium text-muted-foreground">Custo (Moedinhas)</label>
                        <input type="number" name="custoMoedinhas" id="custoMoedinhas" value={premio.custoMoedinhas} onChange={handleNumberChange} required min={0} className="mt-1 block w-full rounded-md bg-background border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                      </div>
                      <div>
                        <label htmlFor="estoque" className="block text-sm font-medium text-muted-foreground">Estoque</label>
                        <input type="number" name="estoque" id="estoque" value={premio.estoque} onChange={handleNumberChange} required min={0} className="mt-1 block w-full rounded-md bg-background border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                      </div>
                    </div>
                     <div>
                      <label htmlFor="imageUrl" className="block text-sm font-medium text-muted-foreground">URL da Imagem</label>
                      <input type="text" name="imageUrl" id="imageUrl" value={premio.imageUrl || ''} onChange={handleChange} className="mt-1 block w-full rounded-md bg-background border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Prêmio Ativo</span>
                        <Switch
                            checked={premio.ativo}
                            onChange={(checked) => setPremio(p => ({...p, ativo: checked}))}
                            className={`${premio.ativo ? 'bg-primary' : 'bg-muted'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background`}
                        >
                            <span className={`${premio.ativo ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                        </Switch>
                    </div>
                  </div>

                  <div className="bg-muted/50 px-6 py-3 sm:flex sm:flex-row-reverse">
                    <button type="submit" disabled={isSubmitting} className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                      {isSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md border border-border bg-transparent px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm">
                      Cancelar
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

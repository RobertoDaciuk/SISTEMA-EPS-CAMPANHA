'use client';

import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  isLoading?: boolean;
}

export default function CancelarResgateModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: Props) {
  const [motivo, setMotivo] = useState('');

  const handleConfirm = () => {
    if (motivo.trim()) {
      onConfirm(motivo);
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-card text-left align-middle shadow-xl transition-all border border-border">
                <div className="p-6">
                  <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-foreground">
                        Cancelar Resgate
                      </Dialog.Title>
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Para cancelar, por favor, informe o motivo. O valor em moedinhas será estornado ao vendedor e o item voltará ao estoque.
                        </p>
                        <textarea
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          placeholder="Ex: Falta de estoque, dados do vendedor incorretos..."
                          rows={3}
                          className="mt-1 block w-full rounded-md bg-background border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    onClick={handleConfirm}
                    disabled={isLoading || !motivo.trim()}
                  >
                    {isLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-border bg-transparent px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Voltar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

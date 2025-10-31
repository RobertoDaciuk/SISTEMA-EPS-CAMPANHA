'use client';

import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Award, X } from 'lucide-react';

// --- Tipagem dos Dados ---
interface Premio {
  id: string;
  nome: string;
  descricao: string;
  imageUrl: string | null;
  custoMoedinhas: number;
}

interface PremioDetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResgatar: () => void; // Função para iniciar o processo de resgate
  premio: Premio | null;
}

export default function PremioDetalhesModal({ isOpen, onClose, onResgatar, premio }: PremioDetalhesModalProps) {
  if (!premio) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Conteúdo do Modal */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-card text-left align-middle shadow-xl transition-all border border-border">
                {/* Imagem do Prêmio */}
                <div className="relative w-full h-64 bg-muted/50">
                  {premio.imageUrl ? (
                    <Image
                      src={premio.imageUrl}
                      alt={premio.nome}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Award className="w-24 h-24 text-muted-foreground/50" />
                    </div>
                  )}
                   <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-background/50 hover:bg-background/80 transition-colors">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                
                {/* Informações */}
                <div className="p-6">
                  <Dialog.Title
                    as="h3"
                    className="text-2xl font-bold leading-6 text-foreground"
                  >
                    {premio.nome}
                  </Dialog.Title>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      {premio.descricao}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                     {/* Custo do Prêmio */}
                    <div className="flex items-baseline gap-x-1.5 text-center sm:text-left">
                      <span className="font-bold text-3xl text-primary">
                        {premio.custoMoedinhas.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-base text-muted-foreground">moedinhas</span>
                    </div>
                    
                    {/* Botão de Resgate */}
                    <motion.button
                      onClick={onResgatar}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/80 focus-visible:ring-offset-background"
                    >
                      Confirmar Resgate
                    </motion.button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

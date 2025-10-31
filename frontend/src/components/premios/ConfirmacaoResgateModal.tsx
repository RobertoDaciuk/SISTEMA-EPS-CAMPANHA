'use client';

import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmacaoResgateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isLoading?: boolean;
}

export default function ConfirmacaoResgateModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar',
  isLoading = false,
}: ConfirmacaoResgateModalProps) {

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-card text-left align-middle shadow-xl transition-all border border-border">
                <div className="p-6">
                  <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertTriangle className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-foreground">
                        {title}
                      </Dialog.Title>
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground">
                          {message}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <motion.button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    onClick={onConfirm}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processando...' : confirmButtonText}
                  </motion.button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-border bg-transparent px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {cancelButtonText}
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

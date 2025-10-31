'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';

// --- Tipagem dos Dados ---
interface Premio {
  id: string;
  nome: string;
  imageUrl: string | null;
  custoMoedinhas: number;
}

interface PremioCardProps {
  premio: Premio;
  saldoUsuario: number;
  onSelect: (premio: Premio) => void; // Função para abrir o modal de detalhes
}

// Efeito de animação para cada card individual
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function PremioCard({ premio, saldoUsuario, onSelect }: PremioCardProps) {
  const isAffordable = saldoUsuario >= premio.custoMoedinhas;

  return (
    <motion.div
      variants={itemVariants}
      className={`
        rounded-2xl overflow-hidden shadow-lg transition-all duration-300 
        flex flex-col border
        ${isAffordable ? 'border-border' : 'border-dashed border-border/50'}
      `}
      whileHover={{ y: -5, scale: 1.02, shadow: 'hsl(var(--shadow-md))' }}
    >
      <button 
        onClick={() => onSelect(premio)}
        disabled={!isAffordable}
        className="w-full h-full text-left flex flex-col disabled:cursor-not-allowed group"
      >
        {/* Imagem do Prêmio */}
        <div className="relative w-full h-48 bg-muted/50">
          {premio.imageUrl ? (
            <Image
              src={premio.imageUrl}
              alt={premio.nome}
              fill
              className={`object-cover transition-transform duration-300 group-hover:scale-105 ${!isAffordable ? 'grayscale' : ''}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Award className={`w-16 h-16 text-muted-foreground/50 ${!isAffordable ? 'grayscale' : ''}`} />
            </div>
          )}
          {!isAffordable && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <p className="text-sm font-semibold text-foreground/80 px-2 py-1 rounded-full bg-background/50">
                Faltam {premio.custoMoedinhas - saldoUsuario} moedinhas
              </p>
            </div>
          )}
        </div>

        {/* Conteúdo do Card */}
        <div className="p-4 flex-grow flex flex-col bg-card">
          <h3 className="font-bold text-lg text-foreground flex-grow">
            {premio.nome}
          </h3>
          
          <div className="mt-4 flex items-center justify-between">
            {/* Custo do Prêmio */}
            <div className="flex items-baseline gap-x-1">
              <span className={`font-bold text-xl ${isAffordable ? 'text-primary' : 'text-muted-foreground'}`}>
                {premio.custoMoedinhas.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs text-muted-foreground">moedinhas</span>
            </div>

            {/* Botão de Ação */}
            <div 
              className={`
                px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                ${isAffordable 
                  ? 'bg-primary text-primary-foreground group-hover:bg-primary/90' 
                  : 'bg-muted text-muted-foreground'
                }`
              }>
              Resgatar
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

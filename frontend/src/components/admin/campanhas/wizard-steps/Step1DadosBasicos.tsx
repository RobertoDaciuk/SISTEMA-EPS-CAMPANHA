'use client';

import { motion } from 'framer-motion';
import { Info, DollarSign, Trophy, Percent, Image, Tag } from 'lucide-react';
import type { WizardState } from '../CriarCampanhaWizard';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

export default function Step1DadosBasicos({ state, setState }: Props) {
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault();
      const newTag = e.currentTarget.value.trim();
      if (!state.tags.includes(newTag)) {
        setState({ ...state, tags: [...state.tags, newTag] });
        e.currentTarget.value = '';
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setState({ ...state, tags: state.tags.filter(tag => tag !== tagToRemove) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Info className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Dados Básicos</h3>
          <p className="text-sm text-muted-foreground">Informações principais da campanha</p>
        </div>
      </div>

      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Título da Campanha *
        </label>
        <input
          type="text"
          value={state.titulo}
          onChange={(e) => setState({ ...state, titulo: e.target.value })}
          placeholder="Ex: Campanha Lentes Q1 2025"
          className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          required
        />
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Descrição *
        </label>
        <textarea
          value={state.descricao}
          onChange={(e) => setState({ ...state, descricao: e.target.value })}
          placeholder="Descreva os objetivos e benefícios da campanha..."
          rows={4}
          className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
          required
        />
      </div>

      {/* Datas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Data de Início *
          </label>
          <input
            type="date"
            value={state.dataInicio}
            onChange={(e) => setState({ ...state, dataInicio: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Data de Término *
          </label>
          <input
            type="date"
            value={state.dataFim}
            onChange={(e) => setState({ ...state, dataFim: e.target.value })}
            className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            required
          />
        </div>
      </div>

      {/* Prêmios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Moedinhas por Cartela *
          </label>
          <input
            type="number"
            value={state.moedinhasPorCartela}
            onChange={(e) => setState({ ...state, moedinhasPorCartela: parseInt(e.target.value) || 0 })}
            min="0"
            className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Moeda virtual para ranking e prêmios</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            R$ por Cartela *
          </label>
          <input
            type="number"
            value={state.pontosReaisPorCartela}
            onChange={(e) => setState({ ...state, pontosReaisPorCartela: parseFloat(e.target.value) || 0 })}
            min="0"
            step="0.01"
            className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Valor em reais do pagamento real</p>
        </div>
      </div>

      {/* Percentual Gerente */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <Percent className="h-4 w-4 text-blue-500" />
          Comissão do Gerente (0 a 1) *
        </label>
        <input
          type="number"
          value={state.percentualGerente}
          onChange={(e) => setState({ ...state, percentualGerente: parseFloat(e.target.value) || 0 })}
          min="0"
          max="1"
          step="0.01"
          className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Ex: 0.10 = 10% de comissão sobre o valor pago ao vendedor
        </p>
      </div>

      {/* Imagem URL */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <Image className="h-4 w-4 text-purple-500" />
          URL da Imagem (opcional)
        </label>
        <input
          type="url"
          value={state.imagemCampanha}
          onChange={(e) => setState({ ...state, imagemCampanha: e.target.value })}
          placeholder="https://exemplo.com/banner-campanha.jpg"
          className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        />
        {state.imagemCampanha && (
          <div className="mt-3 rounded-lg overflow-hidden border border-border">
            <img src={state.imagemCampanha} alt="Preview" className="w-full h-40 object-cover" />
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <Tag className="h-4 w-4 text-pink-500" />
          Tags (opcional)
        </label>
        <input
          type="text"
          onKeyDown={handleAddTag}
          placeholder="Digite uma tag e pressione Enter..."
          className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        />
        <div className="flex flex-wrap gap-2 mt-3">
          {state.tags.map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium flex items-center gap-2"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-red-500 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

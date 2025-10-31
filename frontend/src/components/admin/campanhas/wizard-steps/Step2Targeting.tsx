'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Globe, Building2 } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import type { WizardState } from '../CriarCampanhaWizard';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

interface Optica {
  id: string;
  nome: string;
  ativa: boolean;
  ehMatriz: boolean;
}

export default function Step2Targeting({ state, setState }: Props) {
  const [oticas, setOticas] = useState<Optica[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOticas = async () => {
      try {
        const response = await api.get('/oticas');
        setOticas(response.data.filter((o: Optica) => o.ativa));
      } catch (error) {
        toast.error('Erro ao carregar óticas');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOticas();
  }, []);

  const handleToggleOtica = (oticaId: string) => {
    const isSelected = state.oticasAlvoIds.includes(oticaId);
    setState({
      ...state,
      oticasAlvoIds: isSelected
        ? state.oticasAlvoIds.filter(id => id !== oticaId)
        : [...state.oticasAlvoIds, oticaId],
    });
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
          <Target className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Targeting da Campanha</h3>
          <p className="text-sm text-muted-foreground">Defina quais óticas poderão participar</p>
        </div>
      </div>

      {/* Opção: Para todas as óticas */}
      <div className="space-y-4">
        <label className="flex items-center gap-4 p-4 border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
          <input
            type="radio"
            checked={state.paraTodasOticas}
            onChange={() => setState({ ...state, paraTodasOticas: true, oticasAlvoIds: [] })}
            className="w-5 h-5 text-primary"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Globe className="h-5 w-5 text-primary" />
              Para Todas as Óticas
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              A campanha estará disponível para todas as óticas cadastradas no sistema
            </p>
          </div>
        </label>

        <label className="flex items-center gap-4 p-4 border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
          <input
            type="radio"
            checked={!state.paraTodasOticas}
            onChange={() => setState({ ...state, paraTodasOticas: false })}
            className="w-5 h-5 text-primary"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Building2 className="h-5 w-5 text-primary" />
              Óticas Específicas
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione manualmente as óticas que poderão participar desta campanha
            </p>
          </div>
        </label>
      </div>

      {/* Lista de Óticas (se targeting específico) */}
      {!state.paraTodasOticas && (
        <div className="mt-6">
          <h4 className="font-medium text-foreground mb-3">Selecione as Óticas:</h4>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando óticas...</div>
          ) : oticas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma ótica ativa encontrada</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {oticas.map((optica) => (
                <label
                  key={optica.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    state.oticasAlvoIds.includes(optica.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={state.oticasAlvoIds.includes(optica.id)}
                    onChange={() => handleToggleOtica(optica.id)}
                    className="w-5 h-5 text-primary rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{optica.nome}</div>
                    {optica.ehMatriz && (
                      <span className="text-xs text-primary font-medium">MATRIZ</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          {!state.paraTodasOticas && state.oticasAlvoIds.length > 0 && (
            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary font-medium">
                {state.oticasAlvoIds.length} ótica(s) selecionada(s)
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

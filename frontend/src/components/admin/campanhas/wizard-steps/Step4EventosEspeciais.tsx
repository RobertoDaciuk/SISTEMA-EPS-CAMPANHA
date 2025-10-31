'use client';

import { motion } from 'framer-motion';
import { Zap, Plus, Trash2, AlertTriangle, Calendar } from 'lucide-react';
import type { WizardState } from '../CriarCampanhaWizard';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

export default function Step4EventosEspeciais({ state, setState }: Props) {
  const addEvento = () => {
    const novoEvento = {
      nome: '',
      descricao: '',
      multiplicador: 2.0,
      dataInicio: state.dataInicio || '',
      dataFim: state.dataFim || '',
      ativo: true,
      corDestaque: '#FF5733',
    };
    setState({ ...state, eventosEspeciais: [...state.eventosEspeciais, novoEvento] });
  };

  const removeEvento = (index: number) => {
    const novosEventos = state.eventosEspeciais.filter((_, i) => i !== index);
    setState({ ...state, eventosEspeciais: novosEventos });
  };

  const updateEvento = (index: number, field: string, value: any) => {
    const novosEventos = [...state.eventosEspeciais];
    novosEventos[index] = { ...novosEventos[index], [field]: value };
    setState({ ...state, eventosEspeciais: novosEventos });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Eventos Especiais (2x, 3x, 4x...)</h3>
          <p className="text-sm text-muted-foreground">
            Configure multiplicadores de prêmios para períodos específicos
          </p>
        </div>
      </div>

      {/* Alerta Informativo */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-yellow-500 mb-1">Como Funcionam os Eventos Especiais</p>
          <p className="text-muted-foreground">
            Durante o período do evento, todas as cartelas validadas pagarão o valor multiplicado.
            <br />
            <strong>Exemplo:</strong> Evento 2x de 15/01 a 20/01 → Cartelas pagarão o dobro de moedinhas e R$.
            <br />
            <strong>Vendedores verão apenas eventos ATIVOS (entre as datas) com design chamativo.</strong>
          </p>
        </div>
      </div>

      {/* Lista de Eventos */}
      {state.eventosEspeciais.length > 0 ? (
        <div className="space-y-4">
          {state.eventosEspeciais.map((evento, index) => (
            <div key={index} className="border border-border rounded-xl overflow-hidden">
              {/* Header do Evento */}
              <div
                className="p-4 flex items-center justify-between text-white"
                style={{ backgroundColor: evento.corDestaque }}
              >
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5" />
                  <span className="font-bold text-lg">{evento.multiplicador}X</span>
                </div>
                <button
                  onClick={() => removeEvento(index)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Campos do Evento */}
              <div className="p-4 space-y-4 bg-card">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nome do Evento *</label>
                  <input
                    type="text"
                    value={evento.nome}
                    onChange={(e) => updateEvento(index, 'nome', e.target.value)}
                    placeholder="Ex: Super Semana 2x, Black Friday 3x"
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Descrição (opcional)</label>
                  <textarea
                    value={evento.descricao}
                    onChange={(e) => updateEvento(index, 'descricao', e.target.value)}
                    placeholder="Motivação ou detalhes do evento..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                  />
                </div>

                {/* Multiplicador */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Multiplicador (1.0 a 10.0) *
                  </label>
                  <input
                    type="number"
                    value={evento.multiplicador}
                    onChange={(e) => updateEvento(index, 'multiplicador', parseFloat(e.target.value) || 1)}
                    min="1.0"
                    max="10.0"
                    step="0.1"
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: 2.0 = Prêmios dobrados, 3.0 = Prêmios triplicados
                  </p>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data de Início *
                    </label>
                    <input
                      type="date"
                      value={evento.dataInicio}
                      onChange={(e) => updateEvento(index, 'dataInicio', e.target.value)}
                      min={state.dataInicio}
                      max={state.dataFim}
                      className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data de Término *
                    </label>
                    <input
                      type="date"
                      value={evento.dataFim}
                      onChange={(e) => updateEvento(index, 'dataFim', e.target.value)}
                      min={evento.dataInicio || state.dataInicio}
                      max={state.dataFim}
                      className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    />
                  </div>
                </div>

                {/* Cor e Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Cor do Banner</label>
                    <input
                      type="color"
                      value={evento.corDestaque}
                      onChange={(e) => updateEvento(index, 'corDestaque', e.target.value)}
                      className="w-full h-12 rounded-lg border border-border cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                    <label className="flex items-center gap-2 p-3 bg-background border border-border rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={evento.ativo}
                        onChange={(e) => updateEvento(index, 'ativo', e.target.checked)}
                        className="w-5 h-5 text-primary"
                      />
                      <span className="text-foreground">Evento Ativo</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-accent/50 rounded-xl border-2 border-dashed border-border">
          <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground mb-4">Nenhum evento especial configurado</p>
          <p className="text-sm text-muted-foreground mb-6">
            Eventos especiais são opcionais, mas podem aumentar muito o engajamento!
          </p>
        </div>
      )}

      {/* Botão Adicionar Evento */}
      <button
        onClick={addEvento}
        className="w-full py-4 border-2 border-dashed border-yellow-500/50 rounded-xl text-yellow-500 hover:bg-yellow-500/5 transition-colors flex items-center justify-center gap-2 font-medium"
      >
        <Plus className="h-5 w-5" />
        Adicionar Evento Especial (2x, 3x, 4x...)
      </button>
    </motion.div>
  );
}

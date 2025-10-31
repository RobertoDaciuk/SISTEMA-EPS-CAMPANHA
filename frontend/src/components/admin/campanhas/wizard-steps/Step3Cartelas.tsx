'use client';

import { motion } from 'framer-motion';
import { Layers, Plus, Trash2, AlertCircle } from 'lucide-react';
import type { WizardState } from '../CriarCampanhaWizard';

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

export default function Step3Cartelas({ state, setState }: Props) {
  const addCartela = () => {
    const novaCartela = {
      numeroCartela: state.cartelas.length + 1,
      descricao: `Cartela ${state.cartelas.length + 1}`,
      requisitos: [
        {
          descricao: '',
          quantidade: 1,
          tipoUnidade: 'UNIDADE' as const,
          ordem: 1,
          condicoes: [
            {
              campo: 'NOME_PRODUTO' as const,
              operador: 'CONTEM' as const,
              valor: '',
            },
          ],
        },
      ],
    };
    setState({ ...state, cartelas: [...state.cartelas, novaCartela] });
  };

  const removeCartela = (index: number) => {
    if (state.cartelas.length === 1) {
      alert('A campanha deve ter pelo menos uma cartela!');
      return;
    }
    const novasCartelas = state.cartelas.filter((_, i) => i !== index);
    // Renumerar cartelas
    const renumeradas = novasCartelas.map((cartela, i) => ({
      ...cartela,
      numeroCartela: i + 1,
    }));
    setState({ ...state, cartelas: renumeradas });
  };

  const updateCartela = (index: number, field: string, value: any) => {
    const novasCartelas = [...state.cartelas];
    novasCartelas[index] = { ...novasCartelas[index], [field]: value };
    setState({ ...state, cartelas: novasCartelas });
  };

  const addRequisitoToCartela = (cartelaIndex: number) => {
    const novasCartelas = [...state.cartelas];
    const novoRequisito = {
      descricao: '',
      quantidade: 1,
      tipoUnidade: 'UNIDADE' as const,
      ordem: novasCartelas[cartelaIndex].requisitos.length + 1,
      condicoes: [
        {
          campo: 'NOME_PRODUTO' as const,
          operador: 'CONTEM' as const,
          valor: '',
        },
      ],
    };
    novasCartelas[cartelaIndex].requisitos.push(novoRequisito);
    setState({ ...state, cartelas: novasCartelas });
  };

  const removeRequisitoFromCartela = (cartelaIndex: number, requisitoIndex: number) => {
    const novasCartelas = [...state.cartelas];
    novasCartelas[cartelaIndex].requisitos = novasCartelas[cartelaIndex].requisitos.filter(
      (_, i) => i !== requisitoIndex
    );
    setState({ ...state, cartelas: novasCartelas });
  };

  const updateRequisito = (cartelaIndex: number, requisitoIndex: number, field: string, value: any) => {
    const novasCartelas = [...state.cartelas];
    novasCartelas[cartelaIndex].requisitos[requisitoIndex] = {
      ...novasCartelas[cartelaIndex].requisitos[requisitoIndex],
      [field]: value,
    };
    setState({ ...state, cartelas: novasCartelas });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* NOVO: Seletor de Modo de Cartelas */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h4 className="font-semibold text-foreground">Modo de Criação de Cartelas</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setState({ ...state, modoCartelas: 'MANUAL' })}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              state.modoCartelas === 'MANUAL'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-semibold text-foreground">Manual</div>
            <div className="text-sm text-muted-foreground mt-1">
              Criar cada cartela individualmente com suas próprias regras
            </div>
          </button>

          <button
            type="button"
            onClick={() => setState({ ...state, modoCartelas: 'AUTO_REPLICANTE', cartelas: state.cartelas.slice(0, 1) })}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              state.modoCartelas === 'AUTO_REPLICANTE'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-semibold text-foreground">Auto-Replicante ♾️</div>
            <div className="text-sm text-muted-foreground mt-1">
              Criar apenas a Cartela 1 e gerar as próximas automaticamente
            </div>
          </button>
        </div>

        {/* Configurações de Auto-Replicação */}
        {state.modoCartelas === 'AUTO_REPLICANTE' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 pt-4 border-t border-border"
          >
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-semibold">Modo Cartelas Infinitas</p>
                  <p className="text-xs mt-1">
                    Configure apenas a Cartela 1. As próximas serão geradas dinamicamente conforme o vendedor avança!
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Tipo de Incremento
                </label>
                <select
                  value={state.tipoIncremento}
                  onChange={(e) => setState({ ...state, tipoIncremento: e.target.value as any })}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="SEM_INCREMENTO">Sem Incremento (sempre igual)</option>
                  <option value="MULTIPLICADOR">Multiplicador Customizável</option>
                </select>
              </div>

              {state.tipoIncremento === 'MULTIPLICADOR' && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Fator de Incremento
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={state.fatorIncremento}
                    onChange={(e) => setState({ ...state, fatorIncremento: parseInt(e.target.value) || 0 })}
                    placeholder="Ex: 5"
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: 5 → Cartela 1: 5un, Cartela 2: 10un, Cartela 3: 15un...
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Limite de Cartelas (opcional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={state.limiteCartelas || ''}
                  onChange={(e) => setState({ ...state, limiteCartelas: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Deixe vazio para ilimitado"
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Layers className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Cartelas e Requisitos</h3>
          <p className="text-sm text-muted-foreground">Configure as cartelas (bronze, prata, ouro...) e seus requisitos</p>
        </div>
      </div>

      {/* Alerta Informativo */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-blue-500 mb-1">Dica sobre Spillover</p>
          <p className="text-muted-foreground">
            O campo <strong>ordem</strong> permite agrupar requisitos relacionados entre cartelas diferentes.
            Requisitos com a mesma ordem "transbordam" (spillover) entre cartelas.
            <br />
            Ex: "Lentes X" com ordem=1 nas Cartelas 1, 2 e 3 são o mesmo requisito lógico.
          </p>
        </div>
      </div>

      {/* Lista de Cartelas */}
      <div className="space-y-6">
        {state.cartelas.map((cartela, cartelaIndex) => (
          <div key={cartelaIndex} className="border border-border rounded-xl overflow-hidden">
            {/* Header da Cartela */}
            <div className="bg-accent/50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  {cartela.numeroCartela}
                </span>
                <input
                  type="text"
                  value={cartela.descricao}
                  onChange={(e) => updateCartela(cartelaIndex, 'descricao', e.target.value)}
                  placeholder="Descrição da cartela..."
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
                {/* Badge indicador para modo AUTO_REPLICANTE */}
                {state.modoCartelas === 'AUTO_REPLICANTE' && (
                  <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    ♾️ Cartela Base
                  </span>
                )}
              </div>
              {state.cartelas.length > 1 && state.modoCartelas === 'MANUAL' && (
                <button
                  onClick={() => removeCartela(cartelaIndex)}
                  className="ml-3 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Requisitos da Cartela */}
            <div className="p-4 space-y-4">
              {cartela.requisitos.map((requisito, requisitoIndex) => (
                <div key={requisitoIndex} className="bg-background border border-border rounded-lg p-4 space-y-3">
                  {/* Cabeçalho do Requisito */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Requisito {requisitoIndex + 1}
                    </span>
                    {cartela.requisitos.length > 1 && (
                      <button
                        onClick={() => removeRequisitoFromCartela(cartelaIndex, requisitoIndex)}
                        className="text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Campos do Requisito */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={requisito.descricao}
                        onChange={(e) => updateRequisito(cartelaIndex, requisitoIndex, 'descricao', e.target.value)}
                        placeholder="Descrição (ex: Lentes BlueProtect)"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={requisito.quantidade}
                        onChange={(e) => updateRequisito(cartelaIndex, requisitoIndex, 'quantidade', parseInt(e.target.value) || 1)}
                        placeholder="Quantidade"
                        min="1"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                    </div>
                    <div>
                      <select
                        value={requisito.tipoUnidade}
                        onChange={(e) => updateRequisito(cartelaIndex, requisitoIndex, 'tipoUnidade', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      >
                        <option value="UNIDADE">Unidade</option>
                        <option value="PAR">Par</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Ordem (para spillover)</label>
                      <input
                        type="number"
                        value={requisito.ordem}
                        onChange={(e) => updateRequisito(cartelaIndex, requisitoIndex, 'ordem', parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                    </div>
                  </div>

                  {/* Condições (Rule Builder Simplificado) */}
                  <div className="bg-accent/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Condição de Validação:</p>
                    {requisito.condicoes.map((condicao, condicaoIndex) => (
                      <div key={condicaoIndex} className="grid grid-cols-3 gap-2">
                        <select
                          value={condicao.campo}
                          onChange={(e) => {
                            const novasCartelas = [...state.cartelas];
                            novasCartelas[cartelaIndex].requisitos[requisitoIndex].condicoes[condicaoIndex].campo = e.target.value as any;
                            setState({ ...state, cartelas: novasCartelas });
                          }}
                          className="px-2 py-1 rounded bg-background border border-border text-sm text-foreground"
                        >
                          <option value="NOME_PRODUTO">Nome</option>
                          <option value="CODIGO_PRODUTO">Código</option>
                          <option value="VALOR_VENDA">Valor</option>
                          <option value="CATEGORIA_PRODUTO">Categoria</option>
                        </select>
                        <select
                          value={condicao.operador}
                          onChange={(e) => {
                            const novasCartelas = [...state.cartelas];
                            novasCartelas[cartelaIndex].requisitos[requisitoIndex].condicoes[condicaoIndex].operador = e.target.value as any;
                            setState({ ...state, cartelas: novasCartelas });
                          }}
                          className="px-2 py-1 rounded bg-background border border-border text-sm text-foreground"
                        >
                          <option value="CONTEM">Contém</option>
                          <option value="NAO_CONTEM">Não Contém</option>
                          <option value="IGUAL_A">Igual a</option>
                          <option value="NAO_IGUAL_A">Diferente de</option>
                          <option value="MAIOR_QUE">Maior que</option>
                          <option value="MENOR_QUE">Menor que</option>
                        </select>
                        <input
                          type="text"
                          value={condicao.valor}
                          onChange={(e) => {
                            const novasCartelas = [...state.cartelas];
                            novasCartelas[cartelaIndex].requisitos[requisitoIndex].condicoes[condicaoIndex].valor = e.target.value;
                            setState({ ...state, cartelas: novasCartelas });
                          }}
                          placeholder="Valor..."
                          className="px-2 py-1 rounded bg-background border border-border text-sm text-foreground"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Botão Adicionar Requisito */}
              <button
                onClick={() => addRequisitoToCartela(cartelaIndex)}
                className="w-full py-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Requisito
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botão Adicionar Cartela - apenas em modo MANUAL */}
      {state.modoCartelas === 'MANUAL' && (
        <button
          onClick={addCartela}
          className="w-full py-4 border-2 border-dashed border-primary/50 rounded-xl text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          Adicionar Nova Cartela
        </button>
      )}
    </motion.div>
  );
}

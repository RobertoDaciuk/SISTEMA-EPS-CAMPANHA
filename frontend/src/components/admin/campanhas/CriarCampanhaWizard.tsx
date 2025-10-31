'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Info, Zap, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import type { Campanha, EventoEspecial } from '@/app/(dashboard)/admin/campanhas/page';
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

// Importar steps individuais
import Step1DadosBasicos from './wizard-steps/Step1DadosBasicos';
import Step2Targeting from './wizard-steps/Step2Targeting';
import Step3Cartelas from './wizard-steps/Step3Cartelas';
import Step4EventosEspeciais from './wizard-steps/Step4EventosEspeciais';
import Step5Regras from './wizard-steps/Step5Regras';
import Step6Revisao from './wizard-steps/Step6Revisao';

const timeZone = 'America/Sao_Paulo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campanhaParaEditar?: Campanha | null;
}

// Estado do wizard
export interface WizardState {
  // Step 1: Dados Básicos
  titulo: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  moedinhasPorCartela: number;
  pontosReaisPorCartela: number;
  percentualGerente: number;
  imagemCampanha: string;
  tags: string[];
  regras: string;

  // Step 2: Targeting
  paraTodasOticas: boolean;
  oticasAlvoIds: string[];

  // Step 3: Cartelas e Requisitos
  modoCartelas: 'MANUAL' | 'AUTO_REPLICANTE';
  tipoIncremento: 'SEM_INCREMENTO' | 'MULTIPLICADOR';
  fatorIncremento: number;
  limiteCartelas: number | null;
  cartelas: CartelaFormData[];

  // Step 4: Eventos Especiais
  eventosEspeciais: EventoEspecialFormData[];
}

export interface CartelaFormData {
  numeroCartela: number;
  descricao: string;
  requisitos: RequisitoFormData[];
}

export interface RequisitoFormData {
  descricao: string;
  quantidade: number;
  tipoUnidade: 'PAR' | 'UNIDADE';
  ordem: number;
  condicoes: CondicaoFormData[];
}

export interface CondicaoFormData {
  campo: 'NOME_PRODUTO' | 'CODIGO_PRODUTO' | 'VALOR_VENDA' | 'CATEGORIA_PRODUTO';
  operador: 'CONTEM' | 'NAO_CONTEM' | 'IGUAL_A' | 'NAO_IGUAL_A' | 'MAIOR_QUE' | 'MENOR_QUE';
  valor: string;
}

export interface EventoEspecialFormData {
  nome: string;
  descricao: string;
  multiplicador: number;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
  corDestaque: string;
}

const initialState: WizardState = {
  titulo: '',
  descricao: '',
  dataInicio: '',
  dataFim: '',
  moedinhasPorCartela: 1000,
  pontosReaisPorCartela: 500,
  percentualGerente: 0.1,
  imagemCampanha: '',
  tags: [],
  regras: '',
  paraTodasOticas: true,
  oticasAlvoIds: [],
  modoCartelas: 'MANUAL',
  tipoIncremento: 'SEM_INCREMENTO',
  fatorIncremento: 0,
  limiteCartelas: null,
  cartelas: [
    {
      numeroCartela: 1,
      descricao: 'Cartela Bronze',
      requisitos: [
        {
          descricao: '',
          quantidade: 1,
          tipoUnidade: 'UNIDADE',
          ordem: 1,
          condicoes: [
            {
              campo: 'NOME_PRODUTO',
              operador: 'CONTEM',
              valor: '',
            },
          ],
        },
      ],
    },
  ],
  eventosEspeciais: [],
};

export default function CriarCampanhaWizard({ isOpen, onClose, onSuccess, campanhaParaEditar }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>(initialState);
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 6;
  const isEdicao = !!campanhaParaEditar;

  // Carregar dados da campanha para edição com conversão de timezone
  useEffect(() => {
    if (campanhaParaEditar && isOpen) {
      // Converte as datas UTC do banco para o fuso de São Paulo e formata para o input
      const dataInicioLocal = format(utcToZonedTime(new Date(campanhaParaEditar.dataInicio), timeZone), 'yyyy-MM-dd');
      const dataFimLocal = format(toZonedTime(new Date(campanhaParaEditar.dataFim), timeZone), 'yyyy-MM-dd');

      setState({
        ...initialState,
        titulo: campanhaParaEditar.titulo,
        descricao: campanhaParaEditar.descricao,
        dataInicio: dataInicioLocal,
        dataFim: dataFimLocal,
        moedinhasPorCartela: campanhaParaEditar.moedinhasPorCartela,
        pontosReaisPorCartela: Number(campanhaParaEditar.pontosReaisPorCartela),
        percentualGerente: Number(campanhaParaEditar.percentualGerente),
        imagemCampanha: campanhaParaEditar.imagemCampanha || '',
        tags: campanhaParaEditar.tags || [],
        regras: campanhaParaEditar.regras || '',
        paraTodasOticas: campanhaParaEditar.paraTodasOticas,
        oticasAlvoIds: campanhaParaEditar.oticasAlvo?.map(o => o.id) || [],
        // TODO: Carregar cartelas e eventos para edição
      });
    } else if (isOpen && !campanhaParaEditar) {
      setState(initialState);
      setCurrentStep(1);
    }
  }, [campanhaParaEditar, isOpen]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Converte as datas locais (string 'yyyy-MM-dd') para UTC antes de enviar
      const dataInicioUtc = fromZonedTime(startOfDay(parseISO(state.dataInicio)), timeZone).toISOString();
      const dataFimUtc = fromZonedTime(endOfDay(parseISO(state.dataFim)), timeZone).toISOString();

      const basePayload = {
        ...state,
        dataInicio: dataInicioUtc,
        dataFim: dataFimUtc,
        eventosEspeciais: state.eventosEspeciais.map(evento => ({
          ...evento,
          dataInicio: fromZonedTime(startOfDay(parseISO(evento.dataInicio)), timeZone).toISOString(),
          dataFim: fromZonedTime(endOfDay(parseISO(evento.dataFim)), timeZone).toISOString(),
        })),
      };

      if (isEdicao) {
        const { cartelas, oticasAlvoIds, ...payloadParaEdicao } = basePayload;
        await api.patch(`/campanhas/${campanhaParaEditar.id}`, payloadParaEdicao);
        toast.success('Campanha atualizada com sucesso!');
      } else {
        await api.post('/campanhas', basePayload);
        toast.success('Campanha criada com sucesso!');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar campanha:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao salvar campanha';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const steps = [
    { number: 1, title: 'Dados Básicos', icon: Info },
    { number: 2, title: 'Targeting', icon: Calendar },
    { number: 3, title: 'Cartelas', icon: Check },
    { number: 4, title: 'Eventos 2x/3x', icon: Zap },
    { number: 5, title: 'Regras', icon: Info },
    { number: 6, title: 'Revisão', icon: Check },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-border"
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">
              {isEdicao ? 'Editar Campanha' : 'Nova Campanha'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                      currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : currentStep === step.number
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs mt-2 text-muted-foreground hidden sm:block">
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 transition-colors ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <Step1DadosBasicos key="step1" state={state} setState={setState} />
            )}
            {currentStep === 2 && (
              <Step2Targeting key="step2" state={state} setState={setState} />
            )}
            {currentStep === 3 && (
              <Step3Cartelas key="step3" state={state} setState={setState} />
            )}
            {currentStep === 4 && (
              <Step4EventosEspeciais key="step4" state={state} setState={setState} />
            )}
            {currentStep === 5 && (
              <Step5Regras key="step5" state={state} setState={setState} />
            )}
            {currentStep === 6 && (
              <Step6Revisao key="step6" state={state} />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-4 py-2 rounded-lg bg-accent text-foreground font-medium hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="text-sm text-muted-foreground">
            Passo {currentStep} de {totalSteps}
          </div>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {isEdicao ? 'Atualizar' : 'Criar'} Campanha
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

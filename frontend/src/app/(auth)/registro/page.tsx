"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, User, FileText, Smartphone, Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useDebounce } from "@/hooks/useDebounce";
import { formatarCNPJ, formatarCPF, formatarTelefone } from "@/lib/utils";
import api from "@/lib/axios";
import toast from "react-hot-toast";

// Estrutura de dados para o formulário de registro
const initialFormData = {
  opticaId: "",
  opticaNome: "",
  nome: "",
  email: "",
  cpf: "",
  whatsapp: "",
};

// Etapas do Wizard
const steps = [
  { id: 1, name: "Ótica" },
  { id: 2, name: "Dados Pessoais" },
  { id: 3, name: "Senha" },
];

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);

  const goToNextStep = () => setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
  const goToPrevStep = () => setCurrentStep((prev) => (prev > 1 ? prev - 1 : prev));

  return (
    <div className="relative w-full">
      <motion.div
        className="absolute -top-16 right-0 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <ThemeToggle />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <div className="glass rounded-3xl p-6 md:p-9 shadow-glass-lg border border-border/40 backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-light/5 opacity-50" />
          
          <motion.div
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative z-10 space-y-6">
            {currentStep <= 3 && (
              <StepIndicator currentStep={currentStep} />
            )}

            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <Step1_Otica key="step1" goToNextStep={goToNextStep} setFormData={setFormData} />
              )}
              {currentStep === 2 && (
                <Step2_PersonalData key="step2" goToNextStep={goToNextStep} goToPrevStep={goToPrevStep} formData={formData} setFormData={setFormData} />
              )}
              {currentStep === 3 && (
                <Step3_Password key="step3" goToNextStep={goToNextStep} goToPrevStep={goToPrevStep} formData={formData} />
              )}
              {currentStep === 4 && (
                <Step4_Confirmation key="step4" formData={formData} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
    <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
            <React.Fragment key={step.id}>
                <div className="flex flex-col items-center text-center w-24">
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                            currentStep > step.id ? "bg-primary text-primary-foreground" :
                            currentStep === step.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                    >
                        {currentStep > step.id ? <CheckCircle className="w-5 h-5" /> : step.id}
                    </div>
                    <p className={`mt-2 text-xs font-semibold transition-all duration-300 ${
                        currentStep === step.id ? "text-primary" : "text-muted-foreground"
                    }`}>{step.name}</p>
                </div>
                {index < steps.length - 1 && (
                    <div className="flex-1 h-0.5 bg-border mx-2 md:mx-4" />
                )}
            </React.Fragment>
        ))}
    </div>
);

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

// Componente de Input reutilizável
const InputField = ({ icon, name, error, appendIcon, ...props }: any) => (
    <div className="space-y-1">
        <div className="relative">
            {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>}
            <input
                name={name}
                className={`w-full py-2.5 rounded-xl border-2 bg-background/50 transition-all duration-300 ${error ? 'border-destructive' : 'border-border focus:border-primary'} focus:outline-none focus:bg-background ${icon ? 'pl-10' : 'pl-4'} ${appendIcon ? 'pr-10' : 'pr-3'}`}
                {...props}
            />
            {appendIcon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{appendIcon}</div>}
        </div>
        {error && <p className="text-xs text-destructive ml-2">{error}</p>}
    </div>
);

const Step1_Otica = ({ goToNextStep, setFormData }: { goToNextStep: () => void, setFormData: React.Dispatch<React.SetStateAction<typeof initialFormData>> }) => {
    const [cnpj, setCnpj] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [oticaName, setOticaName] = useState("");
    const debouncedCnpj = useDebounce(cnpj.replace(/\D/g, ''), 500);

    useEffect(() => {
        if (debouncedCnpj.length !== 14) {
            setStatus("idle");
            return;
        }

        const verificarCnpj = async () => {
            setStatus("loading");
            try {
                const response = await api.get(`/oticas/verificar-cnpj/${debouncedCnpj}`);
                if (response.status === 200 && response.data.id) {
                    setOticaName(response.data.nome);
                    setFormData(prev => ({ ...prev, opticaId: response.data.id, opticaNome: response.data.nome }));
                    setStatus("success");
                } else {
                    throw new Error("Resposta inválida da API");
                }
            } catch (error) {
                setOticaName("");
                setFormData(prev => ({ ...prev, opticaId: "", opticaNome: "" }));
                setStatus("error");
                console.error("Erro ao verificar CNPJ:", error);
            }
        };

        verificarCnpj();
    }, [debouncedCnpj, setFormData]);

    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCnpj(formatarCNPJ(e.target.value));
    };

    return (
        <motion.div variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-bold">Bem-vindo! Vamos começar.</h2>
                <p className="text-muted-foreground text-sm">Primeiro, identifique sua ótica parceira.</p>
            </div>
            <div className="space-y-2">
                <label htmlFor="cnpj" className="block text-xs font-semibold text-foreground">CNPJ da sua Ótica</label>
                <InputField 
                    id="cnpj"
                    name="cnpj"
                    placeholder="00.000.000/0000-00" 
                    value={cnpj}
                    onChange={handleCnpjChange}
                    maxLength={18}
                    error={status === 'error' ? "CNPJ não encontrado ou não pertence a uma ótica parceira." : ""}
                    appendIcon={
                        status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                        status === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                        status === 'error' ? <XCircle className="w-5 h-5 text-destructive" /> : null
                    }
                />
                {status === 'success' && <p className="text-sm text-green-500 mt-1">✓ Ótica {oticaName}</p>}
            </div>
            <div className="space-y-4 pt-2">
                <button onClick={goToNextStep} disabled={status !== 'success'} className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Próximo
                </button>
                <div className="text-center">
                    <Link href="/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        Já tem uma conta? Voltar para o login
                    </Link>
                </div>
            </div>
        </motion.div>
    );
};

const Step2_PersonalData = ({ goToNextStep, goToPrevStep, formData, setFormData }: { goToNextStep: () => void, goToPrevStep: () => void, formData: typeof initialFormData, setFormData: React.Dispatch<React.SetStateAction<typeof initialFormData>> }) => {
    const [errors, setErrors] = useState({
        nome: '',
        email: '',
        cpf: '',
        whatsapp: '',
    });

    const validateField = (name: string, value: string) => {
        let error = '';
        switch (name) {
            case 'nome':
                if (!value.trim()) {
                    error = 'Nome é obrigatório.';
                } else if (value.trim().split(' ').filter(p => p.length >= 2).length < 2) {
                    error = 'Informe seu nome e sobrenome.';
                }
                break;
            case 'email':
                if (!value) error = 'Email é obrigatório.';
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Formato de email inválido.';
                break;
            case 'cpf':
                if (!value) error = 'CPF é obrigatório.';
                else if (value.replace(/\D/g, '').length !== 11) error = 'CPF deve ter 11 dígitos.';
                break;
            case 'whatsapp':
                if (!value) error = 'WhatsApp é obrigatório.';
                else if (value.replace(/\D/g, '').length < 10) error = 'Telefone inválido.';
                break;
        }
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        validateField(name, value);
    };

    const formatName = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'cpf') formattedValue = formatarCPF(value);
        if (name === 'whatsapp') formattedValue = formatarTelefone(value);
        if (name === 'nome') formattedValue = formatName(value);

        setFormData(prev => ({ ...prev, [name]: formattedValue }));

        if (errors[name as keyof typeof errors]) {
            validateField(name, formattedValue);
        }
    };

    const isStepValid = formData.nome && formData.email && formData.cpf.replace(/\D/g, '').length === 11 && formData.whatsapp.replace(/\D/g, '').length >= 10 && Object.values(errors).every(e => !e);

    return (
        <motion.div variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
            <div className="text-center">
                <h2 className="text-xl font-bold">Ótimo! Encontramos a {formData.opticaNome}.</h2>
                <p className="text-muted-foreground text-sm">Agora, precisamos dos seus dados pessoais.</p>
            </div>
            
            <div className="space-y-2">
                <label htmlFor="nome" className="block text-xs font-semibold text-foreground ml-1">Nome Completo</label>
                <InputField id="nome" icon={<User size={16} />} name="nome" placeholder="Ex: João Silva" value={formData.nome} onChange={handleChange} onBlur={handleBlur} error={errors.nome} />
            </div>
            <div className="space-y-2">
                <label htmlFor="email" className="block text-xs font-semibold text-foreground ml-1">E-mail</label>
                <InputField id="email" icon={<Mail size={16} />} name="email" type="email" placeholder="seu.email@gmail.com" value={formData.email} onChange={handleChange} onBlur={handleBlur} error={errors.email} />
            </div>
            <div className="space-y-2">
                <label htmlFor="cpf" className="block text-xs font-semibold text-foreground ml-1">CPF</label>
                <InputField id="cpf" icon={<FileText size={16} />} name="cpf" placeholder="000.000.000-00" value={formData.cpf} onChange={handleChange} onBlur={handleBlur} error={errors.cpf} maxLength={14} />
            </div>
            <div className="space-y-2">
                <label htmlFor="whatsapp" className="block text-xs font-semibold text-foreground ml-1">WhatsApp</label>
                <InputField id="whatsapp" icon={<Smartphone size={16} />} name="whatsapp" placeholder="(99) 99999-9999" value={formData.whatsapp} onChange={handleChange} onBlur={handleBlur} error={errors.whatsapp} maxLength={16} />
            </div>

            <div className="flex items-center gap-4 pt-2">
                <button onClick={goToPrevStep} className="w-full py-3 rounded-xl font-semibold text-sm bg-muted text-muted-foreground transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <ArrowLeft className="inline-block w-4 h-4 mr-2" />
                    Voltar
                </button>
                <button onClick={goToNextStep} disabled={!isStepValid} className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Próximo
                </button>
            </div>
        </motion.div>
    );
};

const Step3_Password = ({ goToNextStep, goToPrevStep, formData }: { goToNextStep: () => void, goToPrevStep: () => void, formData: typeof initialFormData }) => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const requirements = [
        { regex: /.{8,}/, text: "Pelo menos 8 caracteres" },
        { regex: /[A-Z]/, text: "Uma letra maiúscula (A-Z)" },
        { regex: /[a-z]/, text: "Uma letra minúscula (a-z)" },
        { regex: /[0-9]/, text: "Um número (0-9)" },
        { regex: /[^A-Za-z0-9]/, text: "Um caractere especial (!@#$)" },
    ];

    const isPasswordMatch = password && password === confirmPassword;
    const areRequirementsMet = requirements.every(({ regex }) => regex.test(password));
    const isStepValid = isPasswordMatch && areRequirementsMet;

    const handleSubmit = async () => {
        if (!isStepValid) return;
        setIsLoading(true);

        try {
            const payload = {
                nome: formData.nome,
                email: formData.email,
                cpf: formData.cpf.replace(/\D/g, ''),
                opticaId: formData.opticaId,
                senha: password,
            };
            await api.post("/autenticacao/registrar", payload);
            // Não precisa de toast aqui, a tela de sucesso é o feedback
            goToNextStep();
        } catch (error: any) {
            console.error("Erro no registro:", error);
            const errorMessage = error.response?.data?.message || "Erro ao finalizar cadastro. Verifique seus dados.";
            toast.error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">
            <div className="text-center">
                <h2 className="text-xl font-bold">Quase lá. Crie sua senha de acesso.</h2>
            </div>
            
            <InputField 
                icon={<Lock size={16} />} 
                name="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="Crie sua Senha" 
                value={password}
                onChange={(e:any) => setPassword(e.target.value)}
                appendIcon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                }
            />
            
            <InputField 
                icon={<Lock size={16} />} 
                name="confirmPassword" 
                type="password" 
                placeholder="Confirme sua Senha" 
                value={confirmPassword}
                onChange={(e:any) => setConfirmPassword(e.target.value)}
                error={confirmPassword && !isPasswordMatch ? "As senhas não conferem." : ""}
            />

            <ul className="text-xs space-y-1.5 pt-2">
                {requirements.map((req, i) => (
                    <li key={i} className={`flex items-center transition-colors duration-300 ${req.regex.test(password) ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {req.regex.test(password) ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2 text-muted-foreground/50" />}
                        {req.text}
                    </li>
                ))}
            </ul>

            <div className="flex items-center gap-4">
                <button onClick={goToPrevStep} className="w-full py-3 rounded-xl font-semibold text-sm bg-muted text-muted-foreground transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <ArrowLeft className="inline-block w-4 h-4 mr-2" />
                    Voltar
                </button>
                <button onClick={handleSubmit} disabled={!isStepValid || isLoading} className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]">
                    {isLoading ? (
                        <span className="flex items-center justify-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</span>
                    ) : (
                        "Finalizar Cadastro"
                    )}
                </button>
            </div>
        </motion.div>
    );
};

const Step4_Confirmation = ({ formData }: { formData: typeof initialFormData }) => {
    return (
        <motion.div variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="text-center space-y-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-bold">Cadastro enviado com sucesso!</h2>
            <p className="text-muted-foreground">
                Olá, {formData.nome}. Sua conta foi criada e agora está aguardando a aprovação da equipe EPS. Você poderá fazer login assim que seu acesso for liberado.
            </p>
            <Link href="/login" className="inline-block w-full py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground">
                Voltar para o Login
            </Link>
        </motion.div>
    );
};

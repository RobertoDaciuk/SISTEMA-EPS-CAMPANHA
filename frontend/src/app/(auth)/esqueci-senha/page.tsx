"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, KeyRound, Lock, Eye, EyeOff, Info, Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

const steps = [
  { id: 1, name: "Token" },
  { id: 2, name: "Nova Senha" },
];

export default function EsqueciSenhaPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({ email: "", token: "" });

  const goToNextStep = () => setCurrentStep((prev) => prev + 1);
  const goToPrevStep = () => setCurrentStep((prev) => prev - 1);

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
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <div className="relative z-10 space-y-6">
            <StepIndicator currentStep={currentStep} />
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <Step1_Token key="step1" goToNextStep={goToNextStep} formData={formData} setFormData={setFormData} />
              )}
              {currentStep === 2 && (
                <Step2_Password key="step2" goToPrevStep={goToPrevStep} formData={formData} />
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
          <>
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
          </>
      ))}
  </div>
);

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

const Step1_Token = ({ goToNextStep, formData, setFormData }: { goToNextStep: () => void, formData: any, setFormData: any }) => {
  const [isLoading, setIsLoading] = useState(false);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const isStepValid = isEmailValid && formData.token.trim() !== "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = async () => {
    if (!isStepValid) return;
    setIsLoading(true);
    try {
      await api.post("/autenticacao/validar-token-reset", {
        email: formData.email,
        token: formData.token,
      });
      goToNextStep();
    } catch (error: any) {
      console.error("Erro ao validar token:", error);
      const errorMessage = error.response?.data?.message || "Erro ao validar o token. Tente novamente.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-base text-foreground">Como Redefinir sua Senha</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Para redefinir sua senha, entre em contato com a Equipe EPS (através do seu gerente ou canal de suporte) e solicite seu token de redefinição. Com o token em mãos, preencha os campos abaixo.
        </p>
      </div>

      <hr className="border-border/50" />

      <div className="text-center">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Redefinir sua Senha</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-semibold text-foreground">Seu Email</label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="seu@email.com" disabled={isLoading} className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-border bg-background/50 text-sm focus:outline-none focus:border-primary" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="token" className="block text-xs font-semibold text-foreground">Token de Redefinição</label>
          <div className="relative group">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
            <input id="token" name="token" type="text" value={formData.token} onChange={handleChange} placeholder="Cole o token fornecido pela Equipe EPS" disabled={isLoading} className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-border bg-background/50 text-sm focus:outline-none focus:border-primary" />
          </div>
        </div>

        <motion.button
          onClick={handleNext}
          disabled={!isStepValid || isLoading}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={!isLoading ? { scale: 1.02 } : {}}
          whileTap={!isLoading ? { scale: 0.98 } : {}}
        >
          {isLoading ? (
            <span className="flex items-center justify-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validando...</span>
          ) : (
            "Próximo"
          )}
        </motion.button>
      </div>
      <div className="pt-4 border-t border-border/50 text-center text-xs">
          <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors">
              Lembrou a senha? Voltar para o login
          </Link>
      </div>
    </motion.div>
  );
};

const Step2_Password = ({ goToPrevStep, formData }: { goToPrevStep: () => void, formData: any }) => {
  const router = useRouter();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { regex: /.{8,}/, text: "Pelo menos 8 caracteres" },
    { regex: /[A-Z]/, text: "Uma letra maiúscula (A-Z)" },
    { regex: /[a-z]/, text: "Uma letra minúscula (a-z)" },
    { regex: /[0-9]/, text: "Um número (0-9)" },
    { regex: /[^A-Za-z0-9]/, text: "Um caractere especial (!@#$)" },
  ];

  const areRequirementsMet = passwordRequirements.every(({ regex }) => regex.test(novaSenha));
  const doPasswordsMatch = novaSenha && novaSenha === confirmarSenha;
  const isStepValid = areRequirementsMet && doPasswordsMatch;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isStepValid) {
      toast.error("Por favor, preencha todos os campos corretamente.");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/autenticacao/resetar-senha", {
        token: formData.token.trim(),
        novaSenha,
      });

      toast.success("Senha redefinida com sucesso!");
      router.push("/login");

    } catch (error: any) {
      console.error("Erro ao resetar senha:", error);
      const errorMessage = error.response?.data?.message || "Erro ao redefinir a senha. Tente novamente.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="text-center">
        <h2 className="text-xl font-bold">Crie sua nova senha</h2>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="nova-senha"  className="block text-xs font-semibold text-foreground">Crie sua Nova Senha</label>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
          <input id="nova-senha" type={showPassword ? "text" : "password"} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} disabled={isLoading} className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-border bg-background/50 text-sm focus:outline-none focus:border-primary" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      <ul className="text-xs space-y-1.5 pt-2">
        {passwordRequirements.map((req, i) => (
            <li key={i} className={`flex items-center transition-colors duration-300 ${req.regex.test(novaSenha) ? 'text-green-500' : 'text-muted-foreground'}`}>
                {req.regex.test(novaSenha) ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2 text-muted-foreground/50" />}
                {req.text}
            </li>
        ))}
      </ul>

      <div className="space-y-1.5">
        <label htmlFor="confirmar-senha"  className="block text-xs font-semibold text-foreground">Confirme sua Nova Senha</label>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
          <input id="confirmar-senha" type={showConfirmPassword ? "text" : "password"} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} disabled={isLoading} className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-border bg-background/50 text-sm focus:outline-none focus:border-primary" />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmarSenha && !doPasswordsMatch && <p className="text-xs text-destructive mt-1">As senhas não conferem.</p>}
        {confirmarSenha && doPasswordsMatch && <p className="text-xs text-green-500 mt-1">Senhas conferem.</p>}
      </div>

      <div className="flex items-center gap-4 pt-2">
          <button type="button" onClick={goToPrevStep} className="w-full py-3 rounded-xl font-semibold text-sm bg-muted text-muted-foreground transition-all hover:scale-[1.02] active:scale-[0.98]">
              <ArrowLeft className="inline-block w-4 h-4 mr-2" />
              Voltar
          </button>
          <motion.button
            type="submit"
            disabled={!isStepValid || isLoading}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!isLoading ? { scale: 1.02 } : {}}
            whileTap={!isLoading ? { scale: 0.98 } : {}}
          >
            <span className="relative z-10 flex items-center justify-center space-x-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                "Salvar Nova Senha"
              )}
            </span>
          </motion.button>
      </div>
    </motion.form>
  );
};
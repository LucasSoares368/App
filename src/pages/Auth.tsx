import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Shield, TrendingUp, Wallet, CheckCircle2 } from "lucide-react";

import PasswordInput from "@/components/auth/PasswordInput";
import Captcha from "@/components/auth/Captcha";
import { motion, AnimatePresence } from "framer-motion";
import { APP_RESET_PASSWORD_URL } from "@/lib/app-url";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [registrationAllowed, setRegistrationAllowed] = useState(true);

  useEffect(() => {
    supabase.rpc("is_registration_allowed").then(({ data }) => {
      if (typeof data === "boolean") setRegistrationAllowed(data);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("blocked") === "true") {
      toast.error("Sua conta foi bloqueada. Entre em contato com o suporte.");
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (!isPasswordValid) {
      toast.error("A senha não atende a todos os requisitos de segurança.");
      return;
    }

    if (!isCaptchaValid) {
      toast.error("Por favor, resolva a verificação anti-spam corretamente.");
      return;
    }

    setLoading(true);
    try {
      // 1. Server-side reinforcement validation
      const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-signup', {
        body: { 
          email, 
          password, 
          fullName,
          captchaVerified: isCaptchaValid
        }
      });

      if (validationError || (validationData && validationData.error)) {
        throw new Error(validationError?.message || validationData?.error || "Erro na validação do servidor");
      }

      // 2. Perform actual signup if validation passed
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: window.location.href.split('#')[0],
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Este email já está cadastrado. Tente fazer login.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Conta criada com sucesso! Verifique seu email se necessário.");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor, preencha email e senha");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou senha incorretos");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Login realizado com sucesso!");
        navigate("/dashboard", { replace: true });
      }
    } catch (error: any) {
      toast.error("Erro ao fazer login: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!resetEmail) {
      toast.error("Por favor, informe seu email");
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: APP_RESET_PASSWORD_URL,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Email de recuperação enviado com sucesso!");
        // We could close the dialog here if we used one, or just reset state
      }
    } catch (error: any) {
      toast.error("Erro ao solicitar recuperação: " + error.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background overflow-hidden">
      {/* Left side - Visual/Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-glow/50 to-primary-glow animate-pulse-slow opacity-90" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.1, scale: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.1, scale: 1 }}
            transition={{ duration: 3, delay: 1, repeat: Infinity, repeatType: "reverse" }}
            className="absolute -bottom-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 w-full flex flex-col justify-center px-12 xl:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <img
              src="/brand/logo-auth.png"
              alt="LocalFiny"
              className="mb-10 h-16 w-auto max-w-[310px] object-contain drop-shadow-sm"
            />

            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
              Sua jornada para a independência financeira <br />
              começa aqui.
            </h1>
            
            <p className="text-lg text-white/70 mb-12 max-w-lg leading-relaxed">
              O LocalFiny ajuda você a organizar seus gastos, planejar investimentos e alcançar seus objetivos com inteligência artificial.
            </p>

            <div className="space-y-6">
              {[
                { icon: Shield, text: "Segurança de nível bancário para seus dados" },
                { icon: TrendingUp, text: "Análise preditiva de investimentos" },
                { icon: Wallet, text: "Controle total de fluxo de caixa em tempo real" }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + (i * 0.1) }}
                  className="flex items-center gap-4 text-white/90"
                >
                  <div className="bg-white/15 p-2 rounded-lg border border-white/10">
                    <item.icon size={20} className="text-white" />
                  </div>
                  <span className="font-medium">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-12 left-12 xl:left-24 text-white/40 text-sm"
          >
            © {new Date().getFullYear()} LocalFiny. Todos os direitos reservados.
          </motion.div>
        </div>
      </div>

      {/* Right side - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Header Mobile Only */}
          <div className="flex flex-col items-center lg:items-start mb-8 lg:mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground mt-2 text-center lg:text-left">
              Gerencie suas finanças com a plataforma mais moderna do mercado.
            </p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className={`grid w-full ${registrationAllowed ? "grid-cols-2" : "grid-cols-1"} p-1 bg-muted/50 rounded-xl mb-8 border border-border/50`}>
              <TabsTrigger 
                value="signin" 
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Entrar
              </TabsTrigger>
              {registrationAllowed && (
                <TabsTrigger 
                  value="signup"
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  Criar Conta
                </TabsTrigger>
              )}
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="signin" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-sm font-medium">Email Profissional</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="nome@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all"
                      />
                    </div>
                    
                    <PasswordInput
                      id="signin-password"
                      label="Senha"
                      value={password}
                      onChange={setPassword}
                      showRequirements={false}
                    />

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="remember" className="rounded border-border" />
                        <label htmlFor="remember" className="text-muted-foreground cursor-pointer">Lembrar de mim</label>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <button type="button" className="text-primary font-medium hover:underline">Esqueci a senha</button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] rounded-2xl">
                          <div>
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-bold">Recuperar Senha</DialogTitle>
                              <DialogDescription>
                                Digite seu email para receber um link de redefinição de senha.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-6">
                              <div className="space-y-2">
                                <Label htmlFor="reset-email">Email Cadastrado</Label>
                                <Input
                                  id="reset-email"
                                  type="email"
                                  placeholder="seu@email.com"
                                  value={resetEmail}
                                  onChange={(e) => setResetEmail(e.target.value)}
                                  required
                                  className="h-12 rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button 
                                type="button" 
                                className="w-full h-12 rounded-xl font-semibold"
                                disabled={isResetting}
                                onClick={handleForgotPassword}
                              >
                                {isResetting ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                  "Enviar Link de Recuperação"
                                )}
                              </Button>
                            </DialogFooter>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-lg hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "Acessar Painel"
                      )}
                    </Button>
                  </form>
                </motion.div>
              </TabsContent>

              {registrationAllowed && (
              <TabsContent value="signup" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handleSignUp} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium">Nome Completo</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Como gostaria de ser chamado?"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="h-12 rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">Melhor Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="exemplo@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 rounded-xl border-border/60 bg-muted/20 focus:bg-background transition-all"
                      />
                    </div>

                    <PasswordInput 
                      value={password}
                      onChange={setPassword}
                      onValidityChange={setIsPasswordValid}
                      id="signup-password"
                      label="Crie sua Senha"
                    />

                    <div className="pt-2">
                      <Captcha 
                        onVerify={(isValid) => setIsCaptchaValid(isValid)}
                      />
                    </div>

                    <div className="text-[11px] text-muted-foreground text-center px-4 leading-relaxed">
                      Ao criar uma conta, você concorda com nossos{" "}
                      <Link to="/terms" className="text-primary hover:underline font-medium">Termos de Serviço</Link> e{" "}
                      <Link to="/privacy" className="text-primary hover:underline font-medium">Política de Privacidade</Link>.
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-lg hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "Começar agora"
                      )}
                    </Button>
                  </form>
                </motion.div>
              </TabsContent>
              )}
            </AnimatePresence>
          </Tabs>

          <div className="mt-8 text-center">
            <Button 
              variant="ghost" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors gap-2"
              onClick={() => navigate("/")}
            >
              <ArrowLeft size={16} />
              Voltar para a página inicial
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;

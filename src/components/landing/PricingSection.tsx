import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Crown, Zap, Star, Loader2, Shield, Target } from "lucide-react";
import { motion } from "framer-motion";
import { goToAppAuth } from "@/lib/app-url";

interface Plan {
  id: string;
  name: string;
  plan_type: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
}

const planConfig: Record<string, { icon: any; popular: boolean; cta: string }> = {
  free: {
    icon: <Zap className="h-5 w-5" />,
    popular: false,
    cta: "Iniciar Agora",
  },
  starter: {
    icon: <Zap className="h-5 w-5" />,
    popular: false,
    cta: "Iniciar Agora",
  },
  pro: {
    icon: <Sparkles className="h-5 w-5" />,
    popular: true,
    cta: "Ativar Pro",
  },
  business: {
    icon: <Crown className="h-5 w-5" />,
    popular: false,
    cta: "Expandir para Business",
  },
  pro_plus: {
    icon: <Crown className="h-5 w-5" />,
    popular: false,
    cta: "Expandir para Business",
  },
};

const PricingSection = () => {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/public/plans");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.error) throw new Error(payload.error || "Erro ao carregar planos");
        const data = payload.data || [];

        const parsedPlans = (data || []).map((p) => ({
          ...p,
          features: Array.isArray(p.features)
            ? (p.features as string[])
            : typeof p.features === "string"
              ? JSON.parse(p.features)
              : [],
        }));

        setPlans(parsedPlans as Plan[]);
      } catch (err) {
        console.error("Error fetching plans:", err);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const getSavings = (plan: Plan) => {
    if (plan.price_monthly === 0) return null;
    const monthlyTotal = plan.price_monthly * 12;
    const savings = monthlyTotal - plan.price_yearly;
    if (savings <= 0) return null;
    return `Economia de ${formatPrice(savings)}`;
  };

  return (
    <section id="pricing" className="relative py-24 sm:py-32 overflow-hidden bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider uppercase">
            Investimento
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">O plano perfeito para você</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece com 30 dias grátis no Starter e evolua conforme seus objetivos financeiros crescem. Transparência total, sem letras miúdas.
          </p>

          {/* Modern Billing Toggle */}
          <div className="flex items-center justify-center pt-4">
            <div className="bg-muted p-1.5 rounded-2xl flex items-center gap-1 border border-border shadow-inner">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  billing === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 relative ${
                  billing === "yearly"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Anual
                <div className="absolute -top-3 -right-2 px-2 py-0.5 bg-success text-[10px] text-white font-bold rounded-lg whitespace-nowrap shadow-sm">
                  -20% OFF
                </div>
              </button>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
              <p className="text-sm text-muted-foreground animate-pulse">Carregando planos...</p>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-[2rem] border border-border bg-card p-10 text-center shadow-xl shadow-black/[0.03]">
            <h3 className="text-2xl font-black tracking-tight">Planos em configuração</h3>
            <p className="mt-3 text-muted-foreground">
              Os planos exibidos aqui são os mesmos configurados no painel administrativo.
            </p>
            <Button onClick={goToAppAuth} className="mt-8 h-12 rounded-xl px-8 font-bold">
              Entrar no painel
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {plans.map((plan, index) => {
              const config = planConfig[plan.plan_type] || planConfig.free;
              const monthlyPrice =
                billing === "yearly" && plan.price_yearly > 0 ? plan.price_yearly / 12 : plan.price_monthly;
              const isFree = plan.price_monthly === 0;
              const savingsLabel = getSavings(plan);

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex"
                >
                  <div
                    className={`relative p-8 rounded-[2.5rem] flex flex-col w-full transition-all duration-500 hover:translate-y-[-8px] ${
                      config.popular 
                        ? "bg-secondary text-secondary-foreground shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] ring-4 ring-primary/20" 
                        : "bg-card border border-border shadow-xl shadow-black/[0.03] hover:shadow-2xl hover:shadow-black/[0.08]"
                    }`}
                  >
                    {config.popular && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-white text-[11px] font-black uppercase tracking-widest px-6 py-2 rounded-full shadow-lg">
                          Recomendado
                        </span>
                      </div>
                    )}

                    <div className="mb-8">
                      <div className="flex items-center gap-4 mb-6">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                            config.popular ? "bg-primary text-white" : "bg-primary/10 text-primary"
                          }`}
                        >
                          {config.icon}
                        </div>
                        <div>
                          <h3 className="text-2xl font-black">{plan.name}</h3>
                          <p className={`text-xs ${config.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {isFree ? "30 dias grátis" : "Ideal para crescer"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black">{isFree ? "Grátis" : formatPrice(monthlyPrice).split(',')[0]}</span>
                        {!isFree && <span className={`text-sm font-medium ${config.popular ? "text-primary-foreground/60" : "text-muted-foreground"}`}>/mês</span>}
                      </div>
                      {isFree && (
                        <p className={`mt-3 text-sm font-bold ${config.popular ? "text-primary-foreground/80" : "text-primary"}`}>
                          por 30 dias
                        </p>
                      )}
                      
                      {!isFree && billing === "yearly" && savingsLabel && (
                        <div className="mt-4 px-3 py-1.5 bg-success/20 text-success text-[11px] font-bold rounded-lg inline-flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" />
                          {savingsLabel}
                        </div>
                      )}
                    </div>

                    <div className={`h-px w-full mb-8 ${config.popular ? "bg-white/10" : "bg-border"}`} />

                    <ul className="space-y-4 mb-10 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <div className={`mt-0.5 p-0.5 rounded-full ${config.popular ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                          <span className={config.popular ? "text-white/90" : "text-muted-foreground"}>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={goToAppAuth}
                      className={`w-full h-14 rounded-2xl text-base font-bold transition-all duration-300 ${
                        config.popular 
                          ? "bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/30" 
                          : "bg-muted text-foreground hover:bg-muted/80"
                      }`}
                      variant="default"
                    >
                      {config.cta}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Security / Guarantee Footer */}
        <motion.div
          className="mt-20 flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success group-hover:scale-110 transition-transform">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold">Garantia Blindada</h4>
              <p className="text-xs text-muted-foreground">Satisfação em 7 dias ou seu dinheiro de volta</p>
            </div>
          </div>
          <div className="h-px w-12 bg-border hidden md:block" />
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center text-info group-hover:scale-110 transition-transform">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold">Sem Fidelidade</h4>
              <p className="text-xs text-muted-foreground">Cancele ou altere seu plano quando quiser</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;

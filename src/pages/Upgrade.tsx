import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Crown, 
  Check, 
  X, 
  Zap, 
  Sparkles,
  Loader2,
  CreditCard,
  Star,
  QrCode,
  Copy,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserPlan } from "@/hooks/useUserPlan";
import { PaymentModal } from "@/components/plans/PaymentModal";

interface Plan {
  id: string;
  name: string;
  plan_type: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
}

const planOrder = (planType: string) => {
  const normalized = planType === "free" ? "starter" : planType === "pro_plus" ? "business" : planType;
  if (normalized === "starter") return 1;
  if (normalized === "pro") return 2;
  if (normalized === "business") return 3;
  return 9;
};

export default function Upgrade() {
  const navigate = useNavigate();
  const { plan: currentPlan, loading: planLoading } = useUserPlan();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{
    qr_code: string;
    qr_code_base64: string;
    ticket_url: string;
    payment_id: string;
  } | null>(null);
  const [showPixDialog, setShowPixDialog] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [copied, setCopied] = useState(false);
  const [selectedPlanForPix, setSelectedPlanForPix] = useState<Plan | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  // Status polling and realtime are now handled by the PaymentModal component

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      if (error) throw error;
      
      const parsedPlans = (data || []).map(p => ({
        ...p,
        features: Array.isArray(p.features) 
          ? (p.features as string[]) 
          : typeof p.features === "string" 
            ? JSON.parse(p.features) 
            : []
      }));
      
      setPlans((parsedPlans as Plan[]).sort((a, b) => planOrder(a.plan_type) - planOrder(b.plan_type)));
    } catch (error) {
      console.error("Error loading plans:", error);
      toast.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: Plan, method: "pix" = "pix") => {
    if (plan.plan_type === "starter" || plan.plan_type === "free") {
      toast.info("Você já está no plano gratuito");
      return;
    }

    const normalizedCurrent = (currentPlan.plan_type === "free" || currentPlan.plan_type === "starter") ? "starter" : (currentPlan.plan_type === "business" || currentPlan.plan_type === "pro_plus") ? "business" : currentPlan.plan_type;
    const planNormalized = (plan.plan_type === "free" || plan.plan_type === "starter") ? "starter" : (plan.plan_type === "business" || plan.plan_type === "pro_plus") ? "business" : plan.plan_type;
    if (planNormalized === normalizedCurrent) {
      toast.info("Você já está neste plano");
      return;
    }

    try {
      setProcessingPlan(plan.id);
      setSelectedPlanForPix(plan);
      
      const { data, error } = await supabase.functions.invoke("create-mercadopago-checkout", {
        body: { planId: plan.id, billingPeriod, paymentMethod: method },
      });

      if (error) throw error;

      if (data?.success === false) {
        toast.error(data.error || "Não foi possível iniciar o pagamento");
        return;
      }

      if (method === "pix" && data?.pix) {
        setPixData({ ...data.pix, payment_id: data.payment_id });
        setPaymentStatus("pending");
        setShowPixDialog(true);
        toast.success("Código PIX gerado com sucesso!");
      } else if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        toast.success("Redirecionando para o Mercado Pago...");
      } else {
        toast.error("Não foi possível iniciar o pagamento");
      }
    } catch (error: any) {
      console.error("Error creating charge:", error);
      toast.error("Erro ao processar: " + (error.message || "Tente novamente"));
    } finally {
      setProcessingPlan(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case "pro": return <Sparkles className="h-6 w-6" />;
      case "business":
      case "pro_plus": return <Crown className="h-6 w-6" />;
      default: return <Zap className="h-6 w-6" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case "pro": return "from-primary to-primary-glow";
      case "business":
      case "pro_plus": return "from-amber-500 to-orange-500";
      default: return "from-muted-foreground/60 to-muted-foreground/40";
    }
  };

  const isCurrentPlan = (planType: string) => {
    const normalized = (currentPlan.plan_type === "free" || currentPlan.plan_type === "starter") ? "starter" : (currentPlan.plan_type === "business" || currentPlan.plan_type === "pro_plus") ? "business" : currentPlan.plan_type;
    const incomingNormalized = (planType === "free" || planType === "starter") ? "starter" : (planType === "business" || planType === "pro_plus") ? "business" : planType;
    return incomingNormalized === normalized;
  };

  const annualSavings = (plan: Plan) => {
    if (plan.price_monthly === 0) return 0;
    const monthlyTotal = plan.price_monthly * 12;
    return monthlyTotal - plan.price_yearly;
  };

  const isTrialing = currentPlan.status === "trialing";
  const trialDaysRemaining = Math.max(0, Number(currentPlan.trial_days_remaining || 0));

  if (loading || planLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Planos e Preços">
      <div className="mx-auto max-w-7xl space-y-8 pb-8">
        {/* Header */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Crown className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">
            Escolha o plano ideal para você
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-lg text-muted-foreground">
            Desbloqueie todo o potencial do LocalFiny com recursos avançados.
          </p>

          {/* Current plan badge */}
          <Badge variant="outline" className="mt-4 rounded-full px-4 py-1 text-sm">
            {isTrialing
              ? `Starter grátis termina em ${trialDaysRemaining} ${trialDaysRemaining === 1 ? "dia" : "dias"}`
              : `Plano atual: ${currentPlan.plan_name}`}
          </Badge>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center pt-5">
            <Tabs value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as "monthly" | "yearly")}>
              <TabsList className="h-12 rounded-2xl bg-muted/70 p-1">
                <TabsTrigger value="monthly" className="h-10 rounded-xl px-5 sm:px-7">Mensal</TabsTrigger>
                <TabsTrigger value="yearly" className="relative h-10 rounded-xl px-5 sm:px-7">
                  Anual
                  <Badge variant="secondary" className="absolute -right-3 -top-3 rounded-full bg-success px-2 py-0.5 text-[10px] text-success-foreground">
                    Economize
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-bold">Pagamento seguro via PIX</p>
                <p className="text-sm text-muted-foreground">
                  A liberação acontece automaticamente após confirmação do pagamento.
                </p>
              </div>
            </div>
            <Badge className="w-fit rounded-full bg-primary px-3 py-1 text-primary-foreground">
              Garantia de 7 dias
            </Badge>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.plan_type);
            const isPro = plan.plan_type === "pro";
            const monthlyPrice = billingPeriod === "yearly" && plan.price_yearly > 0
              ? plan.price_yearly / 12 
              : plan.price_monthly;
            const savings = annualSavings(plan);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden rounded-2xl border-border/80 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                  isPro ? "border-primary shadow-primary/10 lg:scale-[1.02]" : ""
                } ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                {isPro && (
                  <div className="absolute right-0 top-0 rounded-bl-2xl bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
                    Mais popular
                  </div>
                )}
                
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${getPlanColor(plan.plan_type)}`} />

                <CardHeader className="pb-4 pt-7">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getPlanColor(plan.plan_type)} text-white`}>
                      {getPlanIcon(plan.plan_type)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription className="line-clamp-2 text-sm">{plan.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {plan.price_monthly === 0 ? "Grátis" : formatPrice(monthlyPrice)}
                      </span>
                      {plan.price_monthly > 0 && (
                        <span className="text-muted-foreground text-sm">/mês</span>
                      )}
                    </div>
                    {billingPeriod === "yearly" && savings > 0 && (
                      <p className="mt-2 text-sm font-medium text-success">
                        <Star className="mr-1 inline h-3 w-3" />
                        Economize {formatPrice(savings)}/ano
                      </p>
                    )}
                    {plan.price_monthly === 0 && (
                      <p className="mt-2 text-sm font-medium text-primary">
                        Grátis por 30 dias
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="pt-0">
                  <Button 
                    className="h-12 w-full rounded-2xl font-bold"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || processingPlan === plan.id}
                    onClick={() => handleSelectPlan(plan, "pix")}
                  >
                    {processingPlan === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      "Plano atual"
                    ) : plan.price_monthly === 0 ? (
                      "Plano gratuito"
                    ) : (
                      <>
                        <QrCode className="mr-2 h-4 w-4" />
                        Pagar com PIX
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <Card className="rounded-2xl border-border/80 bg-card shadow-sm">
          <CardContent className="py-6">
            <div className="space-y-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <h3 className="font-semibold">Garantia de 7 dias</h3>
              </div>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Não ficou satisfeito? Devolvemos 100% do seu dinheiro nos primeiros 7 dias. Pagamento seguro via Pix.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <PaymentModal
        open={showPixDialog}
        onOpenChange={setShowPixDialog}
        pixData={pixData}
        initialStatus={paymentStatus}
        onSuccess={() => navigate("/dashboard")}
        onRetry={() => selectedPlanForPix && handleSelectPlan(selectedPlanForPix, "pix")}
      />
    </AppLayout>
  );
}

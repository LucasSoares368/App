import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  PieChart, 
  Target, 
  Shield, 
  TrendingUp, 
  Award,
  Smartphone,
  Calculator,
  Bell,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Transações sem atrito",
    description: "Registre entradas, saídas e transferências com banco, cartão, categoria e meio de pagamento."
  },
  {
    icon: <PieChart className="h-6 w-6" />,
    title: "Dashboard vivo",
    description: "Veja saldo, receitas, despesas, distribuição financeira e evolução mensal em tempo real."
  },
  {
    icon: <Target className="h-6 w-6" />,
    title: "Metas conectadas",
    description: "Crie objetivos de investimento, quitação de dívidas ou reserva com acompanhamento claro."
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Reserva de emergência",
    description: "Calcule custos fixos, variáveis e acompanhe quanto falta para sua proteção financeira."
  },
  {
    icon: <Calculator className="h-6 w-6" />,
    title: "Simuladores Integrados",
    description: "Projete juros, financiamentos e investimentos com ferramentas precisas."
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Relatórios inteligentes",
    description: "Entenda padrões, categorias, fluxo de caixa e decisões que melhoram seu resultado."
  },
  {
    icon: <Smartphone className="h-6 w-6" />,
    title: "Multiplataforma",
    description: "Sincronização total entre dispositivos para você usar onde quiser."
  },
  {
    icon: <Award className="h-6 w-6" />,
    title: "Conquistas Reais",
    description: "Ganhe medalhas e marcos conforme evolui na sua jornada para a liberdade."
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Alertas no WhatsApp",
    description: "Receba lembretes e avisos importantes com integração via Evolution API."
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

const FeaturesSection = () => {
  return (
    <section id="features" className="relative py-24 sm:py-32 overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <motion.div 
            className="max-w-2xl space-y-4"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider uppercase">
              Funcionalidades
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Tudo para controlar, planejar e <span className="text-primary">evoluir</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Uma base completa para organizar a vida financeira pessoal e empresarial sem depender de planilhas espalhadas.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button variant="ghost" className="group text-primary hover:text-primary hover:bg-primary/5">
              Ver todas as ferramentas
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>

        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants} className="group">
              <div className="relative h-full p-8 rounded-3xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-primary/5 flex flex-col items-start gap-6">
                <div className="relative">
                  <div className="absolute -inset-2 bg-primary/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative bg-gradient-to-br from-primary to-primary-glow w-16 h-16 rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                    {feature.icon}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-auto pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="text-sm font-semibold text-primary flex items-center gap-1">
                    Saiba mais <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;

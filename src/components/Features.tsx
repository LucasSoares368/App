
import { FeatureCard } from "./FeatureCard";
import { BarChart3, Target, Tag, FileText, MessageCircle, TrendingUp } from "lucide-react";

export const Features = () => {
  const features = [
    {
      icon: BarChart3,
      title: "Dashboard Intuitivo",
      description: "Visualize suas finanÃ§as em tempo real com grÃ¡ficos e indicadores que mostram exatamente para onde seu dinheiro estÃ¡ indo.",
      color: "blue"
    },
    {
      icon: TrendingUp,
      title: "Controle de Entradas e SaÃ­das",
      description: "Registre e categorize suas receitas e despesas de forma simples, mantendo um controle detalhado de suas finanÃ§as.",
      color: "green"
    },
    {
      icon: Target,
      title: "Metas Financeiras",
      description: "Defina e acompanhe suas metas financeiras, visualizando seu progresso e mantendo-se motivado a alcanÃ§ar seus objetivos.",
      color: "purple"
    },
    {
      icon: Tag,
      title: "Categorias PersonalizÃ¡veis",
      description: "Crie e personalize categorias de acordo com suas necessidades, organizando suas transaÃ§Ãµes conforme seu estilo de vida.",
      color: "yellow"
    },
    {
      icon: FileText,
      title: "RelatÃ³rios Detalhados",
      description: "Gere relatÃ³rios personalizados para analisar seus gastos e receitas, identificando padrÃµes e oportunidades de economia.",
      color: "indigo"
    },
    {
      icon: MessageCircle,
      title: "Mordomo no WhatsApp",
      description: "Registre receitas e despesas diretamente pelo WhatsApp. Basta enviar uma mensagem para nosso assistente virtual e ele lanÃ§arÃ¡ automaticamente em sua conta.",
      color: "orange"
    }
  ];

  return (
    <section id="recursos" className="py-20 bg-gray-50 dark:bg-slate-900/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4">RECURSOS</h2>
          <p className="text-xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
            Tudo o que vocÃª precisa para controlar suas finanÃ§as
          </p>
          <p className="text-gray-500 dark:text-slate-400 mt-4">
            ConheÃ§a as principais funcionalidades que tornam o Mordomo a melhor escolha para gerenciar suas finanÃ§as pessoais.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              color={feature.color}
            />
          ))}
        </div>
      </div>
    </section>
  );
};


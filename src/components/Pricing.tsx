
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const Pricing = () => {
  const plans = [
    {
      name: "Gratuito",
      price: "R$ 0",
      period: "/mÃªs",
      description: "Perfeito para comeÃ§ar",
      features: [
        "Dashboard bÃ¡sico",
        "Controle de receitas e despesas",
        "Categorias bÃ¡sicas",
        "RelatÃ³rios simples",
        "Suporte por email"
      ],
      popular: false
    },
    {
      name: "Premium",
      price: "R$ 29",
      period: "/mÃªs",
      description: "Para uso pessoal avanÃ§ado",
      features: [
        "Tudo do plano Gratuito",
        "Metas financeiras ilimitadas",
        "RelatÃ³rios avanÃ§ados",
        "Categorias personalizadas",
        "IntegraÃ§Ã£o WhatsApp",
        "Controle de veÃ­culos",
        "Suporte prioritÃ¡rio"
      ],
      popular: true
    },
    {
      name: "Empresarial",
      price: "R$ 99",
      period: "/mÃªs",
      description: "Para empresas e freelancers",
      features: [
        "Tudo do plano Premium",
        "MÃºltiplos usuÃ¡rios",
        "API completa",
        "RelatÃ³rios personalizados",
        "Suporte 24/7"
      ],
      popular: false
    }
  ];

  return (
    <section id="precos" className="py-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4">PLANOS E PREÃ‡OS</h2>
          <p className="text-xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
            Escolha o plano ideal para suas necessidades
          </p>
          <p className="text-gray-500 dark:text-slate-400 mt-4">
            Comece gratuitamente e faÃ§a upgrade quando precisar de mais recursos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.popular ? 'border-orange-500 border-2 scale-105' : 'border-gray-200 dark:border-slate-700'} shadow-lg hover:shadow-xl transition-all`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                    MAIS POPULAR
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">{plan.name}</CardTitle>
                <div className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                  {plan.price}<span className="text-lg text-gray-500 dark:text-slate-400 font-normal">{plan.period}</span>
                </div>
                <p className="text-gray-600 dark:text-slate-300">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/dashboard">
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-900 hover:bg-gray-800'} text-white`}
                    size="lg"
                  >
                    {plan.name === "Gratuito" ? "ComeÃ§ar GrÃ¡tis" : "Assinar Agora"}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-slate-300">
            Todos os planos incluem 30 dias de garantia. Cancele a qualquer momento.
          </p>
        </div>
      </div>
    </section>
  );
};



import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const FAQ = () => {
  const faqs = [
    {
      question: "O Mordomo Ã© gratuito?",
      answer: "Sim! O Mordomo oferece um plano gratuito completo com recursos essenciais para controle financeiro. VocÃª pode fazer upgrade para planos pagos quando precisar de recursos avanÃ§ados."
    },
    {
      question: "Como funciona a integraÃ§Ã£o com WhatsApp?",
      answer: "Nosso assistente virtual permite que vocÃª registre receitas e despesas enviando mensagens simples. Basta escrever algo como 'Gastei R$ 50 no supermercado' e a transaÃ§Ã£o serÃ¡ automaticamente registrada."
    },
    {
      question: "Meus dados estÃ£o seguros?",
      answer: "Absolutamente! Utilizamos criptografia de ponta e seguimos as melhores prÃ¡ticas de seguranÃ§a. Seus dados financeiros sÃ£o protegidos com o mesmo nÃ­vel de seguranÃ§a dos bancos."
    },
    {
      question: "Posso cancelar a qualquer momento?",
      answer: "Sim, vocÃª pode cancelar sua assinatura a qualquer momento. NÃ£o hÃ¡ contratos ou taxas de cancelamento. Seu acesso aos recursos premium serÃ¡ mantido atÃ© o final do perÃ­odo pago."
    },
    {
      question: "HÃ¡ limite de transaÃ§Ãµes?",
      answer: "No plano gratuito, vocÃª pode registrar atÃ© 100 transaÃ§Ãµes por mÃªs. Nos planos pagos, nÃ£o hÃ¡ limite de transaÃ§Ãµes."
    },
    {
      question: "Posso importar dados de outros apps?",
      answer: "Sim! Oferecemos importaÃ§Ã£o de dados de planilhas Excel, CSV e integraÃ§Ã£o com os principais bancos brasileiros (em desenvolvimento)."
    }
  ];

  return (
    <section className="py-20 bg-gray-50 dark:bg-slate-900/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4">PERGUNTAS FREQUENTES</h2>
          <p className="text-xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
            Tire suas dÃºvidas sobre o Mordomo
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="bg-white dark:bg-slate-900 mb-4 rounded-lg border border-gray-200 dark:border-slate-700">
                <AccordionTrigger className="px-6 py-4 text-left font-semibold text-gray-900 dark:text-slate-100 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600 dark:text-slate-300 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};


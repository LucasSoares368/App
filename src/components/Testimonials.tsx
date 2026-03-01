
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export const Testimonials = () => {
  const testimonials = [
    {
      name: "Maria Silva",
      role: "EmpresÃ¡ria",
      content: "O Mordomo transformou como eu gerencio minhas finanÃ§as. Agora tenho controle total sobre meus gastos e receitas.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b75c?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "JoÃ£o Santos",
      role: "Freelancer",
      content: "A integraÃ§Ã£o com WhatsApp Ã© fantÃ¡stica! Posso registrar transaÃ§Ãµes rapidamente, onde quer que eu esteja.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Ana Costa",
      role: "Consultora",
      content: "Os relatÃ³rios sÃ£o muito detalhados e me ajudam a tomar decisÃµes financeiras mais inteligentes.",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    }
  ];

  return (
    <section className="py-20 bg-gray-50 dark:bg-slate-900/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4">O QUE DIZEM NOSSOS USUÃRIOS</h2>
          <p className="text-xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto">
            Milhares de pessoas jÃ¡ transformaram suas finanÃ§as com o Mordomo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-white dark:bg-slate-900 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-slate-300 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-slate-100">{testimonial.name}</h4>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};


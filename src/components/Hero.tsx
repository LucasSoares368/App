
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { DemoVideoModal } from "@/components/DemoVideoModal";

export const Hero = () => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <section className="bg-gradient-to-br from-orange-50 to-white py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <MessageCircle className="w-4 h-4 mr-2" />
            Agora com assistente no WhatsApp
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-slate-100 mb-6">
            Gerencie suas
            <span className="text-orange-500 block">finanÃ§as de forma</span>
            simples e inteligente
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            O Mordomo Ã© a plataforma completa para gerenciar suas finanÃ§as pessoais e empresariais. 
            Dashboard intuitivo, relatÃ³rios detalhados e agora com assistente no WhatsApp.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link to="/login">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-lg px-8 py-4">
                ComeÃ§ar GrÃ¡tis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-4"
              onClick={() => setIsDemoModalOpen(true)}
            >
              Ver DemonstraÃ§Ã£o
            </Button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 mb-16">
            <img 
              src="https://cdn.jsdelivr.net/gh/mathuzabr/img-packtypebot/mordomo.jpg" 
              alt="Dashboard do Mordomo"
              className="w-full h-auto rounded-lg"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">R$</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">Receitas Controladas</h3>
              <p className="text-gray-600 dark:text-slate-300">Organize todas suas fontes de renda</p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">RelatÃ³rios Inteligentes</h3>
              <p className="text-gray-600 dark:text-slate-300">AnÃ¡lises detalhadas dos seus gastos</p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">WhatsApp Integrado</h3>
              <p className="text-gray-600 dark:text-slate-300">Lance transaÃ§Ãµes por mensagem</p>
            </div>
          </div>
        </div>
      </div>

      <DemoVideoModal 
        isOpen={isDemoModalOpen} 
        onClose={() => setIsDemoModalOpen(false)} 
      />
    </section>
  );
};


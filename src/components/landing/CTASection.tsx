import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { goToAppAuth } from "@/lib/app-url";

const CTASection = () => {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-background">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative max-w-6xl mx-auto rounded-[3rem] bg-secondary p-1 overflow-hidden shadow-2xl">
            {/* Inner Glow and Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-secondary opacity-90" />
            
            <div className="relative bg-black/10 backdrop-blur-sm p-10 sm:p-20 text-center text-white flex flex-col items-center">
              <motion.div 
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-8 border border-white/20"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles className="h-4 w-4" />
                Comece com o plano gratuito
              </motion.div>

              <motion.h2 
                className="text-4xl sm:text-5xl lg:text-7xl font-black mb-8 leading-[1.1] tracking-tight max-w-4xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                Organize sua vida financeira com clareza <span className="text-white/60">a partir de hoje</span>
              </motion.h2>

              <motion.p 
                className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-12 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                Cadastre sua conta, conecte sua rotina e acompanhe bancos, transações, metas, reserva e relatórios em um só painel.
              </motion.p>

              <motion.div 
                className="flex flex-col sm:flex-row gap-6 justify-center w-full sm:w-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <Button 
                  size="lg" 
                  onClick={goToAppAuth}
                  className="bg-white text-primary hover:bg-white/90 text-lg font-black h-16 px-12 rounded-2xl shadow-2xl shadow-black/20 active:scale-95 transition-all w-full sm:w-auto"
                >
                  Criar conta grátis
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-transparent text-white border-white/30 hover:bg-white/10 text-lg font-bold h-16 px-12 rounded-2xl backdrop-blur-md w-full sm:w-auto"
                >
                  Ver todos os planos
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;

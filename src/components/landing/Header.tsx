import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { motion, AnimatePresence } from "framer-motion";
import { goToAppAuth } from "@/lib/app-url";

const Header = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Funcionalidades", href: "#features" },
    { label: "Como Funciona", href: "#how-it-works" },
    { label: "Planos", href: "#pricing" },
    { label: "Depoimentos", href: "#testimonials" },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 md:py-4">
      <div className="container mx-auto">
        <div className="bg-background/90 backdrop-blur-xl border border-border/70 rounded-2xl shadow-[0_10px_40px_rgba(13,27,42,0.08)] px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/")}>
            <img src="/brand/logo.png" alt="LocalFiny" className="h-10 w-auto max-w-[170px] object-contain dark:hidden" />
            <img src="/brand/logo-dark.png" alt="LocalFiny" className="hidden h-10 w-auto max-w-[170px] object-contain dark:block" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-sm text-muted-foreground hover:text-primary transition-all duration-300 font-bold tracking-tight"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <div className="h-4 w-px bg-border mx-2" />
            <Button 
              variant="ghost" 
              onClick={goToAppAuth}
              className="font-bold text-sm hover:text-primary transition-colors"
            >
              Entrar
            </Button>
            <Button 
              onClick={goToAppAuth}
              className="bg-primary text-white hover:bg-primary/90 rounded-xl px-6 font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              Começar agora
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle />
            <button
              className="p-2 bg-muted rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden absolute top-full left-4 right-4 mt-2 bg-card/95 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl z-50"
            >
              <nav className="flex flex-col gap-4 mb-6">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => scrollToSection(link.href)}
                    className="text-left text-lg font-bold text-foreground py-2 border-b border-border/50"
                  >
                    {link.label}
                  </button>
                ))}
              </nav>
              <div className="flex flex-col gap-3">
                <Button variant="outline" onClick={goToAppAuth} className="w-full h-12 rounded-xl font-bold">
                  Entrar
                </Button>
                <Button 
                  onClick={goToAppAuth}
                  className="w-full bg-primary text-white h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
                >
                  Criar conta grátis
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Header;

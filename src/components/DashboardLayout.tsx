import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Home,
  TrendingUp,
  TrendingDown,
  FileText,
  BarChart3,
  Tag,
  Wallet,
  Target,
  Users,
  Bot,
  ShoppingCart,
  Car,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Wallet, label: "Carteira", path: "/carteira" },
    { icon: TrendingUp, label: "Receitas", path: "/receitas" },
    { icon: TrendingDown, label: "Despesas", path: "/despesas" },
    { icon: FileText, label: "Transações", path: "/transacoes" },
    { icon: Tag, label: "Categorias", path: "/categorias" },
    { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
    { icon: Target, label: "Metas", path: "/metas" },
    { icon: ShoppingCart, label: "Mercado", path: "/mercado" },
    { icon: Car, label: "Veículos", path: "/veiculos" },
    { icon: Users, label: "Perfil", path: "/perfil" },
    { icon: Bot, label: "IA", path: "/ia" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("isAuthenticated");

    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });

    navigate("/");
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const nextDarkMode = !isDarkMode;
    setIsDarkMode(nextDarkMode);

    if (nextDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative">
      {!isMobileMenuOpen && (
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-card shadow-md rounded-full hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      )}

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobileMenu}
        ></div>
      )}

      <div
        className={`
          fixed top-0 left-0 h-screen
          ${
            isMobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
          transition-all duration-300
          bg-card border-r border-border flex flex-col
          z-40
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        <div className="p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-500 rounded-lg p-2">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              {!isCollapsed && (
                <span className="text-xl font-bold text-foreground">Mordomo</span>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 hover:bg-muted transition-colors"
              onClick={closeMobileMenu}
            >
              <X className="h-5 w-5 text-foreground" />
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={`
            hidden lg:flex absolute top-6 -right-3
            h-6 w-6 rounded-full bg-card border border-border
            hover:bg-muted
            transition-all duration-200 shadow-sm
            items-center justify-center
          `}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-foreground" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-foreground" />
          )}
        </Button>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? "bg-orange-100 text-orange-600"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                } ${isCollapsed ? "justify-center" : "space-x-3"}`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-border flex-shrink-0 space-y-2">
          <Button
            variant="ghost"
            className={`w-full text-muted-foreground hover:text-foreground hover:bg-muted ${
              isCollapsed ? "justify-center px-0" : "justify-start"
            }`}
            onClick={toggleTheme}
            title={isCollapsed ? "Alternar tema" : undefined}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 flex-shrink-0" />
            ) : (
              <Moon className="w-5 h-5 flex-shrink-0" />
            )}
            {!isCollapsed && (
              <span className="ml-3">{isDarkMode ? "Modo claro" : "Modo escuro"}</span>
            )}
          </Button>

          <Button
            variant="ghost"
            className={`w-full text-muted-foreground hover:text-foreground hover:bg-muted ${
              isCollapsed ? "justify-center px-0" : "justify-start"
            }`}
            onClick={() => {
              handleLogout();
              closeMobileMenu();
            }}
            title={isCollapsed ? "Sair" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Sair</span>}
          </Button>
        </div>
      </div>

      <div
        className={`flex-1 ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        } transition-all duration-300`}
      >
        <div className="lg:hidden h-16"></div>{" "}
        {children}
      </div>
    </div>
  );
};

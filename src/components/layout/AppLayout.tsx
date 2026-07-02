import { ReactNode, useEffect, useState, memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./AppSidebar";
import ProfileSwitcher, { FinancialProfile } from "@/components/dashboard/ProfileSwitcher";
import { User, Building2, Menu } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useUserPlan } from "@/hooks/useUserPlan";
import { UpgradePrompt } from "@/components/plans/UpgradePrompt";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
  currentProfile?: FinancialProfile;
  onProfileChange?: (profile: FinancialProfile) => void;
  showProfileSwitcher?: boolean;
  title?: string;
}

export const AppLayout = memo(function AppLayout(props: AppLayoutProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    let redirectTimer: number | null = null;
    let subscription: { unsubscribe: () => void } | null = null;

    const finishWithSession = (session: any) => {
      setUser(session.user);
      setLoading(false);
    };

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (session?.user) {
        finishWithSession(session);
        return;
      }

      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!isMounted) return;
        if (nextSession?.user) {
          if (redirectTimer) window.clearTimeout(redirectTimer);
          finishWithSession(nextSession);
        }
      });
      subscription = data.subscription;

      redirectTimer = window.setTimeout(async () => {
        const {
          data: { session: retrySession },
        } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (retrySession?.user) {
          finishWithSession(retrySession);
          return;
        }

        setLoading(false);
        navigate("/auth");
      }, 800);
    };

    init();

    return () => {
      isMounted = false;
      if (redirectTimer) window.clearTimeout(redirectTimer);
      subscription?.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppLayoutContent {...props} user={user}>
        {props.children}
      </AppLayoutContent>
    </SidebarProvider>
  );
});

interface AppLayoutContentProps extends AppLayoutProps {
  user: any;
}

const AppLayoutContent = ({
  children,
  currentProfile = "personal",
  onProfileChange,
  showProfileSwitcher = false,
  title,
  user,
}: AppLayoutContentProps) => {
  const { state } = useSidebar();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { canUseBusinessProfile, loading: planLoading, plan, isAdmin } = useUserPlan();

  const userInitial = useMemo(() => {
    return user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U";
  }, [user?.user_metadata?.full_name, user?.email]);

  const isPersonal = currentProfile === "personal";

  return (
    <>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        {/* Top Header - Fixed as requested */}
        <header
          className={cn(
            "fixed top-0 right-0 z-40 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4 transition-all duration-300 ease-in-out left-0",
            state === "expanded" ? "md:left-[--sidebar-width]" : "md:left-[--sidebar-width-icon]",
          )}
        >
          <SidebarTrigger className="-ml-1 h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-colors duration-200">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>

          {title && (
            <>
              <Separator orientation="vertical" className="h-5 hidden sm:block" />
              <h1 className="text-sm sm:text-lg font-semibold truncate">{title}</h1>
            </>
          )}

          <div className="flex-1 min-w-0" />

          {showProfileSwitcher && onProfileChange && (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ProfileSwitcher
                currentProfile={currentProfile}
                onProfileChange={(profile) => {
                  if (profile === "business" && planLoading) {
                    return;
                  }
                  if (profile === "business" && !canUseBusinessProfile()) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  onProfileChange(profile);
                }}
              />
            </div>
          )}

          <UpgradePrompt
            feature="Controle PF/PJ"
            description="O controle separado de perfil Pessoal e Empresarial está disponível no plano Business."
            variant="modal"
            requiredPlan="pro_plus"
            open={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            benefits={[
              "Controle separado PF e PJ",
              "Caixa empresarial",
              "Relatório de rentabilidade",
              "Dashboard avançado consolidado",
            ]}
          />

          {/* ThemeToggle removed from header as it is now in Sidebar Footer */}
        </header>

        {/* Main Content - Added top margin for fixed header */}
        <main className="flex-1 p-4 sm:p-6 bg-muted/30 overflow-x-hidden max-w-full mt-12 sm:mt-14">
          {!planLoading && !isAdmin && plan.status === "trialing" && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-foreground">Starter grátis ativo</p>
                <p className="text-muted-foreground">
                  Seu teste termina em {Math.max(0, Number(plan.trial_days_remaining || 0))} {Number(plan.trial_days_remaining || 0) === 1 ? "dia" : "dias"}.
                </p>
              </div>
              <Button className="h-10 rounded-xl" onClick={() => navigate("/upgrade")}>
                Ver planos
              </Button>
            </div>
          )}

          {!planLoading && !isAdmin && plan.status === "expired" && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-foreground">Seu teste grátis terminou</p>
                <p className="text-muted-foreground">
                  Escolha um plano para continuar usando o LocalFiny sem interrupções.
                </p>
              </div>
              <Button className="h-10 rounded-xl" onClick={() => navigate("/upgrade")}>
                Escolher plano
              </Button>
            </div>
          )}

          {children}
        </main>
      </SidebarInset>
    </>
  );
};

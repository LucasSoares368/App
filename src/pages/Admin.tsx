import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users,
  Crown,
  Shield,
  TrendingUp,
  Calendar,
  Clock,
  Search,
  MoreVertical,
  UserCheck,
  UserX,
  ShieldOff,
  Trash2,
  Mail,
  Loader2,
  Settings,
  Globe,
  Key,
  Smartphone,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Bot,
  CreditCard,
  QrCode,
  DollarSign,
  AlertTriangle,
  Zap
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RegistrationControl } from "@/components/admin/RegistrationControl";

interface UserWithPlan {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  phone_number: string | null;
  subscription_status: string | null;
  plan_type: string | null;
  plan_name: string | null;
  is_blocked?: boolean;
}

interface DashboardStats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  newUsersThisMonth: number;
}

const adminCardClass = "rounded-2xl border-border/80 bg-card shadow-sm";
const adminInputClass = "h-12 rounded-2xl";
const adminButtonClass = "h-11 rounded-2xl font-semibold";
const adminTableWrapClass = "overflow-hidden rounded-2xl border border-border/80 bg-card";
const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function adminApi(path: string, options: RequestInit = {}) {
  const rawSession = localStorage.getItem("localfiny_session");
  const session = rawSession ? JSON.parse(rawSession) : null;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Erro na API");
  return payload.data;
}

const planFeatureFields = [
  { key: "whatsapp_enabled", label: "WhatsApp" },
  { key: "reports_enabled", label: "Relatórios" },
  { key: "cashflow_projection_enabled", label: "Projeção de caixa" },
  { key: "export_enabled", label: "Exportação" },
  { key: "split_enabled", label: "Divisão automática" },
  { key: "business_profile_enabled", label: "Perfil empresarial" },
  { key: "advanced_dashboard_enabled", label: "Dashboard avançado" },
  { key: "annual_projection_enabled", label: "Projeção anual" },
  { key: "monthly_planning_enabled", label: "Planejamento mensal" },
  { key: "ai_enabled", label: "Assistente IA" },
  { key: "import_enabled", label: "Importação de dados" },
] as const;

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<UserWithPlan[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    proUsers: 0,
    freeUsers: 0,
    newUsersThisMonth: 0,
  });
  const [plans, setPlans] = useState<{ id: string; name: string; plan_type: string }[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalCount, setPaymentsTotalCount] = useState(0);
  const [paymentsPageSize] = useState(10);
  const [clearingPayments, setClearingPayments] = useState(false);
  const [isClearPaymentsDialogOpen, setIsClearPaymentsDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Evolution API Config State
  const [evolutionConfig, setEvolutionConfig] = useState({
    id: "",
    api_url: "",
    api_key: "",
    instance_name: "",
  });

  // OpenAI Config State
  const [openAiConfig, setOpenAiConfig] = useState({
    id: "",
    api_key: "",
    model: "gpt-4o-mini",
  });

  const [testingConnection, setTestingConnection] = useState(false);
  const [testingOpenAi, setTestingOpenAi] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingOpenAi, setSavingOpenAi] = useState(false);

  // Mercado Pago Config State
  const [mercadoPagoConfig, setMercadoPagoConfig] = useState({
    id: "",
    access_token: "",
    public_key: "",
    is_active: true
  });
  const [savingMercadoPago, setSavingMercadoPago] = useState(false);
  const [pushinPayConfig, setPushinPayConfig] = useState({
    id: "",
    api_url: "https://api.pushinpay.com.br/api",
    api_key: "",
    webhook_secret: "",
    is_active: false,
  });
  const [savingPushinPay, setSavingPushinPay] = useState(false);
  const [testingPushinPay, setTestingPushinPay] = useState(false);

  const [fullPlans, setFullPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);

  const formatCentsToBRL = (cents: number) => {
    if (isNaN(cents)) return "0,00";
    return (cents / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Acesso negado. Você não tem permissão para acessar esta página.");
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadPlans();
      loadEvolutionConfig();
      loadOpenAiConfig();
      loadMercadoPagoConfig();
      loadPushinPayConfig();
      loadFullPlans();
      loadPayments();
    }
  }, [isAdmin]);

  const loadPayments = async (page: number = 1) => {
    setLoadingPayments(true);
    try {
      const data = await adminApi(`/admin/payments?page=${page}&pageSize=${paymentsPageSize}`);
      setPayments(data.data || []);
      setPaymentsTotalCount(data.count || 0);
      setPaymentsPage(page);
    } catch (error: any) {
      console.error("Error loading payments:", error);
      toast.error("Erro ao carregar histórico de pagamentos: " + error.message);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      await adminApi(`/admin/payments/${paymentId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success("Status do pagamento atualizado!");
      loadPayments(paymentsPage);
    } catch (error: any) {
      console.error("Error updating payment status:", error);
      toast.error("Erro ao atualizar status do pagamento: " + error.message);
    }
  };

  const handleClearPayments = async () => {
    setIsClearPaymentsDialogOpen(false);
    setClearingPayments(true);
    try {
      await adminApi("/admin/payments", { method: "DELETE" });
      toast.success("Histórico limpo com sucesso!");
      loadPayments(1);
    } catch (error: any) {
      console.error("Error clearing payments:", error);
      toast.error("Erro ao limpar histórico: " + error.message);
    } finally {
      setClearingPayments(false);
    }
  };

  const loadMercadoPagoConfig = async () => {
    try {
      const data = await adminApi("/admin/config/mercado_pago");
      if (data) setMercadoPagoConfig(data);
    } catch (error) {
      console.error("Error loading Mercado Pago config:", error);
    }
  };

  const handleSaveMercadoPagoConfig = async () => {
    setSavingMercadoPago(true);
    try {
      const data = await adminApi("/admin/config/mercado_pago", {
        method: "PUT",
        body: JSON.stringify(mercadoPagoConfig),
      });
      if (data) setMercadoPagoConfig(data);
      toast.success("Configuração do Mercado Pago salva com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar configuração: " + error.message);
    } finally {
      setSavingMercadoPago(false);
    }
  };

  const loadPushinPayConfig = async () => {
    try {
      const data = await adminApi("/admin/config/pushinpay");
      if (data) setPushinPayConfig({ ...pushinPayConfig, ...data });
    } catch (error) {
      console.error("Error loading PushinPay config:", error);
    }
  };

  const handleSavePushinPayConfig = async () => {
    setSavingPushinPay(true);
    try {
      const data = await adminApi("/admin/config/pushinpay", {
        method: "PUT",
        body: JSON.stringify(pushinPayConfig),
      });
      if (data) setPushinPayConfig({ ...pushinPayConfig, ...data });
      toast.success("Configuração da PushinPay salva com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar PushinPay: " + error.message);
    } finally {
      setSavingPushinPay(false);
    }
  };

  const handleTestPushinPayConfig = async () => {
    setTestingPushinPay(true);
    try {
      const data = await adminApi("/admin/config/pushinpay/test", {
        method: "POST",
        body: JSON.stringify(pushinPayConfig),
      });
      toast.success(data.message || "PushinPay pronta para gerar PIX");
    } catch (error: any) {
      toast.error("Erro ao testar PushinPay: " + error.message);
    } finally {
      setTestingPushinPay(false);
    }
  };

  const loadFullPlans = async () => {
    setLoadingPlans(true);
    try {
      const data = await adminApi("/admin/plans");
      setFullPlans(data || []);
    } catch (error) {
      console.error("Error loading plans:", error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleUpdatePlan = async (plan: any) => {
    setSavingPlan(plan.id);
    try {
      const price_monthly = typeof plan.price_monthly === "string"
        ? parseInt(plan.price_monthly.replace(/[^\d]/g, "")) || 0
        : Math.round(plan.price_monthly || 0);

      const price_yearly = typeof plan.price_yearly === "string"
        ? parseInt(plan.price_yearly.replace(/[^\d]/g, "")) || 0
        : Math.round(plan.price_yearly || 0);

      await adminApi(`/admin/plans/${plan.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...plan, price_monthly, price_yearly }),
      });
      toast.success(`Plano ${plan.name} atualizado com sucesso!`);
      loadFullPlans();
      loadPlans();
    } catch (error: any) {
      toast.error("Erro ao atualizar plano: " + error.message);
    } finally {
      setSavingPlan(null);
    }
  };

  const loadOpenAiConfig = async () => {
    try {
      const data = await adminApi("/admin/config/openai");
      if (data) setOpenAiConfig(data);
    } catch (error) {
      console.error("Error loading OpenAI config:", error);
    }
  };

  const handleSaveOpenAiConfig = async () => {
    setSavingOpenAi(true);
    try {
      const data = await adminApi("/admin/config/openai", {
        method: "PUT",
        body: JSON.stringify(openAiConfig),
      });
      if (data) setOpenAiConfig(data);
      toast.success("Configuração da OpenAI salva com sucesso!");
    } catch (error: any) {
      console.error("Error saving OpenAI config:", error);
      toast.error("Erro ao salvar configuração: " + error.message);
    } finally {
      setSavingOpenAi(false);
    }
  };

  const handleTestOpenAiConnection = async () => {
    setTestingOpenAi(true);
    try {
      const data = await adminApi("/admin/config/openai/test", {
        method: "POST",
        body: JSON.stringify(openAiConfig),
      });
      toast.success(data.message || "Conexão estabelecida com sucesso!");
    } catch (error: any) {
      console.error("Error testing OpenAI connection:", error);
      toast.error("Erro ao testar conexão: " + error.message);
    } finally {
      setTestingOpenAi(false);
    }
  };

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, planFilter]);

  const loadEvolutionConfig = async () => {
    try {
      const data = await adminApi("/admin/config/evolution");
      if (data) setEvolutionConfig(data);
    } catch (error) {
      console.error("Error loading Evolution config:", error);
    }
  };

  const handleSaveEvolutionConfig = async () => {
    setSavingConfig(true);
    try {
      const data = await adminApi("/admin/config/evolution", {
        method: "PUT",
        body: JSON.stringify(evolutionConfig),
      });
      if (data) setEvolutionConfig(data);
      toast.success("Configuração da Evolution API salva com sucesso!");
    } catch (error: any) {
      console.error("Error saving Evolution config:", error);
      toast.error("Erro ao salvar configuração: " + error.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestEvolutionConnection = async () => {
    setTestingConnection(true);
    try {
      const data = await adminApi("/admin/config/evolution/test", {
        method: "POST",
        body: JSON.stringify(evolutionConfig),
      });
      toast.success(data.message || "Conexão estabelecida com sucesso!");
    } catch (error: any) {
      console.error("Error testing connection:", error);
      toast.error("Erro ao testar conexão: " + error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const loadPlans = async () => {
    try {
      const data = await adminApi("/admin/plans");
      setPlans((data || []).filter((plan: any) => plan.is_active).map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        plan_type: plan.plan_type,
      })));
    } catch (error: any) {
      console.error("Error loading plans:", error);
      toast.error("Erro ao carregar planos: " + error.message);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersWithPlans: UserWithPlan[] = await adminApi("/admin/users");
      setUsers(usersWithPlans || []);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const proCount = (usersWithPlans || []).filter(u =>
        ["active", "trialing"].includes(String(u.subscription_status || "")) && u.plan_type !== "free" && u.plan_type !== "starter"
      ).length;
      const newThisMonth = (usersWithPlans || []).filter(u =>
        u.created_at && new Date(u.created_at) >= startOfMonth
      ).length;

      setStats({
        totalUsers: usersWithPlans?.length || 0,
        proUsers: proCount,
        freeUsers: (usersWithPlans?.length || 0) - proCount,
        newUsersThisMonth: newThisMonth,
      });
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast.error("Erro ao carregar usuários: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email?.toLowerCase().includes(term) ||
          u.full_name?.toLowerCase().includes(term)
      );
    }

    if (planFilter !== "all") {
      if (planFilter === "pro") {
        filtered = filtered.filter(u => ["active", "trialing"].includes(String(u.subscription_status || "")) && u.plan_type !== "free" && u.plan_type !== "starter");
      } else if (planFilter === "free") {
        filtered = filtered.filter(u => !["active", "trialing"].includes(String(u.subscription_status || "")) || u.plan_type === "free" || u.plan_type === "starter");
      }
    }

    setFilteredUsers(filtered);
  };

  const handleSetPlan = async (userId: string, planType: "free" | "starter" | "pro" | "business") => {
    try {
      await adminApi(`/admin/users/${userId}/plan`, {
        method: "PUT",
        body: JSON.stringify({ plan_type: planType, billing_period: "yearly" }),
      });
      const plan = plans.find(p => p.plan_type === planType);
      toast.success(planType === "free" ? "Usuário alterado para sem plano ativo" : `Usuário alterado para plano ${plan?.name || planType}`);
      loadUsers();
    } catch (error: any) {
      console.error("Error setting plan:", error);
      toast.error("Erro ao alterar plano do usuário: " + error.message);
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === userId) {
        toast.error("Você não pode bloquear a si próprio!");
        return;
      }
      await adminApi(`/admin/users/${userId}/block`, {
        method: "PATCH",
        body: JSON.stringify({ is_blocked: !currentStatus }),
      });
      toast.success(currentStatus ? "Usuário desbloqueado!" : "Usuário bloqueado!");
      loadUsers();
    } catch (error: any) {
      console.error("Error toggling block:", error);
      toast.error("Erro ao alterar status do usuário: " + error.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    const userId = userToDelete;

    try {
      await adminApi(`/admin/users/${userId}`, { method: "DELETE" });
      toast.success("Usuário excluído com sucesso!");
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao excluir usuário: " + error.message);
    }
  };


  if (adminLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-normal">Painel Administrativo</h1>
              <p className="text-muted-foreground">Gerencie usuários, assinaturas e configurações do sistema</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl p-1 lg:w-[820px] lg:grid-cols-4">
            <TabsTrigger value="users" className="flex h-11 items-center gap-2 rounded-xl">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex h-11 items-center gap-2 rounded-xl">
              <Settings className="h-4 w-4" />
              Config. Pagamento
            </TabsTrigger>
            <TabsTrigger value="pix_history" className="flex h-11 items-center gap-2 rounded-xl">
              <CreditCard className="h-4 w-4" />
              Histórico PIX
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex h-11 items-center gap-2 rounded-xl">
              <Shield className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6 mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className={adminCardClass}>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <span className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Users className="h-4 w-4" />
                    </span>
                    Total de Usuários
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </CardContent>
              </Card>

              <Card className={adminCardClass}>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <span className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Crown className="h-4 w-4" />
                    </span>
                    Usuários Pro
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">{stats.proUsers}</p>
                </CardContent>
              </Card>

              <Card className={adminCardClass}>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <span className="rounded-xl bg-muted p-2 text-muted-foreground">
                      <UserCheck className="h-4 w-4" />
                    </span>
                    Usuários Free
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.freeUsers}</p>
                </CardContent>
              </Card>
              <Card className={adminCardClass}>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <span className="rounded-xl bg-primary/10 p-2 text-primary">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                    Novos Este Mês
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">{stats.newUsersThisMonth}</p>
                </CardContent>
              </Card>
            </div>{/* Users Table */}
            <Card className={adminCardClass}>
              <CardHeader>
                <CardTitle>Gerenciar Usuários</CardTitle>
                <CardDescription>
                  Visualize e gerencie todos os usuários cadastrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`${adminInputClass} pl-10`}
                    />
                  </div>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className={`${adminInputClass} w-full sm:w-[200px]`}>
                      <SelectValue placeholder="Filtrar por plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os planos</SelectItem>
                      <SelectItem value="pro">Plano Pro/Business</SelectItem>
                      <SelectItem value="free">Plano Gratuito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className={adminTableWrapClass}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead className="hidden sm:table-cell">Email</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Nenhum usuário encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">{user.full_name || "Sem nome"}</div>
                                  {user.is_blocked && (
                                    <Badge variant="destructive" className="h-5 rounded-full px-2 text-[9px] uppercase">Bloqueado</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground sm:hidden">
                                  {user.email}
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  {user.email}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    ["active", "trialing"].includes(String(user.subscription_status || "")) && user.plan_type !== "free"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {user.subscription_status === "trialing" ? `${user.plan_name} Trial` : user.plan_name}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  {user.created_at
                                    ? format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })
                                    : "-"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleSetPlan(user.id, "free")}>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Remover plano ativo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSetPlan(user.id, "starter")}>
                                      <Zap className="h-4 w-4 mr-2" />
                                      Definir como Starter
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSetPlan(user.id, "pro")}>
                                      <Crown className="h-4 w-4 mr-2" />
                                      Definir como Pro
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSetPlan(user.id, "business")}>
                                      <Shield className="h-4 w-4 mr-2" />
                                      Definir como Business
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleToggleBlock(user.id, user.is_blocked || false)}
                                      className={user.is_blocked ? "text-green-600" : "text-amber-600"}
                                    >
                                      {user.is_blocked ? (
                                        <UserCheck className="h-4 w-4 mr-2" />
                                      ) : (
                                        <ShieldOff className="h-4 w-4 mr-2" />
                                      )}
                                      {user.is_blocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setUserToDelete(user.id)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir Permanentemente
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="mt-4 text-sm text-muted-foreground">
                  Mostrando {filteredUsers.length} de {users.length} usuários
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Mercado Pago Config Card */}
              <Card className={adminCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Configuração Mercado Pago
                  </CardTitle>
                  <CardDescription>
                    Configure as chaves da API do Mercado Pago para processamento de pagamentos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Access Token (Chave Privada - BACKEND)</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="APP_USR-..."
                        className={`${adminInputClass} pl-10 border-amber-200`}
                        value={mercadoPagoConfig.access_token}
                        onChange={(e) => setMercadoPagoConfig({ ...mercadoPagoConfig, access_token: e.target.value })}
                      />
                    </div>
                    <p className="mt-1 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-[10px] font-medium text-amber-700">
                      ⚠️ <strong>ERRO COMUM:</strong> O <strong>Access Token</strong> é muito mais longo (aprox. 80 caracteres).
                      Copie do campo "Access Token" no painel do Mercado Pago.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Public Key (Chave Pública - FRONTEND)</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="APP_USR-..."
                        className={`${adminInputClass} pl-10`}
                        value={mercadoPagoConfig.public_key}
                        onChange={(e) => setMercadoPagoConfig({ ...mercadoPagoConfig, public_key: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    className={`w-full ${adminButtonClass}`}
                    onClick={handleSaveMercadoPagoConfig}
                    disabled={savingMercadoPago}
                  >
                    {savingMercadoPago ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Configuração"
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className={adminCardClass}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-primary" />
                    Configuração PushinPay
                  </CardTitle>
                  <CardDescription>
                    Configure o PIX da PushinPay. Quando ativo, ele será priorizado no checkout.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>API URL</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        className={`${adminInputClass} pl-10`}
                        value={pushinPayConfig.api_url}
                        onChange={(e) => setPushinPayConfig({ ...pushinPayConfig, api_url: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Token de Integração</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Token PushinPay"
                        className={`${adminInputClass} pl-10`}
                        value={pushinPayConfig.api_key}
                        onChange={(e) => setPushinPayConfig({ ...pushinPayConfig, api_key: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                    <div>
                      <Label>Usar PushinPay no PIX</Label>
                      <p className="text-xs text-muted-foreground">Se ativo, o checkout prioriza PushinPay.</p>
                    </div>
                    <Switch
                      checked={!!pushinPayConfig.is_active}
                      onCheckedChange={(checked) => setPushinPayConfig({ ...pushinPayConfig, is_active: checked })}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className={adminButtonClass}
                      onClick={handleTestPushinPayConfig}
                      disabled={testingPushinPay || !pushinPayConfig.api_key}
                    >
                      {testingPushinPay ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Testar
                    </Button>
                    <Button
                      className={adminButtonClass}
                      onClick={handleSavePushinPayConfig}
                      disabled={savingPushinPay}
                    >
                      {savingPushinPay ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Summary / Status Card */}
              <Card className={adminCardClass}>
                <CardHeader>
                  <CardTitle>Status da Integração</CardTitle>
                  <CardDescription>Visão geral do sistema de cobrança</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${mercadoPagoConfig.access_token ? 'bg-green-100' : 'bg-red-100'}`}>
                          {mercadoPagoConfig.access_token ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Mercado Pago</p>
                          <p className="text-xs text-muted-foreground">
                            {mercadoPagoConfig.access_token ? "Configurado e Ativo" : "Pendente"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${pushinPayConfig.api_key && pushinPayConfig.is_active ? 'bg-green-100' : 'bg-red-100'}`}>
                          {pushinPayConfig.api_key && pushinPayConfig.is_active ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">PushinPay</p>
                          <p className="text-xs text-muted-foreground">
                            {pushinPayConfig.api_key && pushinPayConfig.is_active ? "Configurado e Ativo" : "Pendente ou Inativo"}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div></CardContent>
              </Card>
            </div>{/* Plan Prices Section */}
            <Card className={adminCardClass}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Planos e permissões
                </CardTitle>
                <CardDescription>
                  Edite textos, preços, limites e recursos liberados em cada plano.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPlans ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid gap-5 xl:grid-cols-2">
                    {fullPlans.map((plan) => {
                      const featuresValue = Array.isArray(plan.features)
                        ? plan.features.join("\n")
                        : typeof plan.features === "string"
                          ? (() => {
                              try {
                                const parsed = JSON.parse(plan.features);
                                return Array.isArray(parsed) ? parsed.join("\n") : plan.features;
                              } catch {
                                return plan.features;
                              }
                            })()
                          : "";

                      return (
                        <div key={plan.id} className="rounded-2xl border border-border/80 bg-background/60 p-5 shadow-sm">
                          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                                <Badge variant={plan.is_active ? "default" : "secondary"} className="rounded-full">
                                  {plan.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{plan.plan_type}</p>
                            </div>
                            <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2">
                              <Label className="text-xs text-muted-foreground">Plano ativo</Label>
                              <Switch
                                checked={!!plan.is_active}
                                onCheckedChange={(checked) => setFullPlans((current) => current.map((p) => p.id === plan.id ? { ...p, is_active: checked } : p))}
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Nome do card</Label>
                              <Input
                                className={adminInputClass}
                                value={plan.name || ""}
                                onChange={(e) => setFullPlans((current) => current.map((p) => p.id === plan.id ? { ...p, name: e.target.value } : p))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo interno</Label>
                              <Input
                                className={adminInputClass}
                                value={plan.plan_type || ""}
                                onChange={(e) => setFullPlans((current) => current.map((p) => p.id === plan.id ? { ...p, plan_type: e.target.value } : p))}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Texto/descrição do card</Label>
                              <Textarea
                                className="min-h-20 rounded-2xl"
                                value={plan.description || ""}
                                onChange={(e) => setFullPlans((current) => current.map((p) => p.id === plan.id ? { ...p, description: e.target.value } : p))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Preço mensal (R$)</Label>
                              <Input
                                type="text"
                                className={adminInputClass}
                                value={formatCentsToBRL(plan.price_monthly)}
                                onChange={(e) => {
                                  const cents = parseInt(e.target.value.replace(/[^\d]/g, "")) || 0;
                                  setFullPlans((current) => current.map((p) => p.id === plan.id ? { ...p, price_monthly: cents } : p));
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Preço anual (R$)</Label>
                              <Input
                                type="text"
                                className={adminInputClass}
                                value={formatCentsToBRL(plan.price_yearly)}
                                onChange={(e) => {
                                  const cents = parseInt(e.target.value.replace(/[^\d]/g, "")) || 0;
                                  setFullPlans((current) => current.map((p) => p.id === plan.id ? { ...p, price_yearly: cents } : p));
                                }}
                              />
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                              ["max_banks", "Bancos"],
                              ["max_goals", "Metas"],
                              ["max_reminders", "Lembretes"],
                              ["history_months", "Histórico (meses)"],
                            ].map(([field, label]) => (
                              <div key={field} className="space-y-2">
                                <Label>{label}</Label>
                                <Input
                                  type="number"
                                  className={adminInputClass}
                                  value={plan[field] ?? 0}
                                  onChange={(e) => setFullPlans((current) => current.map((p) => p.id === plan.id ? { ...p, [field]: Number(e.target.value || 0) } : p))}
                                />
                              </div>
                            ))}
                          </div>

                          <div className="mt-5 space-y-2">
                            <Label>Itens exibidos no card do plano</Label>
                            <Textarea
                              className="min-h-24 rounded-2xl"
                              placeholder="Uma vantagem por linha"
                              value={featuresValue}
                              onChange={(e) => {
                                const features = e.target.value.split("\n").map((item) => item.trim()).filter(Boolean);
                                setFullPlans((current) => current.map((p) => p.id === plan.id ? { ...p, features } : p));
                              }}
                            />
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {planFeatureFields.map((feature) => (
                              <div key={feature.key} className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-3 py-3">
                                <Label className="text-sm">{feature.label}</Label>
                                <Switch
                                  checked={!!plan[feature.key]}
                                  onCheckedChange={(checked) => setFullPlans((current) => current.map((p) => p.id === plan.id ? { ...p, [feature.key]: checked } : p))}
                                />
                              </div>
                            ))}
                          </div>

                          <div className="mt-5 flex justify-end">
                            <Button
                              onClick={() => handleUpdatePlan(plan)}
                              disabled={savingPlan === plan.id}
                              className={adminButtonClass}
                            >
                              {savingPlan === plan.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              Salvar plano
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pix_history" className="space-y-6 mt-6">
            <Card className={adminCardClass}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Histórico de Pagamentos PIX</CardTitle>
                    <CardDescription>
                      Acompanhe todos os pagamentos PIX gerados e seus status
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setIsClearPaymentsDialogOpen(true)}
                      disabled={loadingPayments || clearingPayments || payments.length === 0}
                    >
                      {clearingPayments ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Limpar Histórico
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => loadPayments(paymentsPage)} disabled={loadingPayments}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${loadingPayments ? 'animate-spin' : ''}`} />
                      Atualizar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPayments ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className={adminTableWrapClass}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>ID Pagamento</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                Nenhum pagamento encontrado
                              </TableCell>
                            </TableRow>
                          ) : (
                            payments.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  <div className="font-medium">{payment.profiles?.full_name || "Usuário"}</div>
                                  <div className="text-xs text-muted-foreground">{payment.profiles?.email}</div>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {payment.mercadopago_payment_id || "-"}
                                </TableCell>
                                <TableCell>
                                  R$ {formatCentsToBRL(payment.amount)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {payment.created_at ? format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 rounded-xl px-2 hover:bg-transparent">
                                        <Badge
                                          className={
                                            payment.status === "completed" ? "bg-green-500 hover:bg-green-600" :
                                              payment.status === "pending" ? "bg-yellow-500 hover:bg-yellow-600" :
                                                "bg-red-500 hover:bg-red-600"
                                          }
                                        >
                                          {payment.status === "completed" ? "Aprovado" :
                                            payment.status === "pending" ? "Pendente" :
                                              "Falhou"}
                                        </Badge>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(payment.id, "completed")}>
                                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                                        Aprovado
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(payment.id, "pending")}>
                                        <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                                        Pendente
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(payment.id, "failed")}>
                                        <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                        Falhou
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {paymentsTotalCount > paymentsPageSize && (
                      <div className="flex items-center justify-between px-2">
                        <div className="text-sm text-muted-foreground">
                          Mostrando {(paymentsPage - 1) * paymentsPageSize + 1} a {Math.min(paymentsPage * paymentsPageSize, paymentsTotalCount)} de {paymentsTotalCount}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => loadPayments(paymentsPage - 1)}
                            disabled={paymentsPage === 1 || loadingPayments}
                          >
                            Anterior
                          </Button>
                          <div className="text-sm font-medium">
                            Página {paymentsPage} de {Math.ceil(paymentsTotalCount / paymentsPageSize)}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => loadPayments(paymentsPage + 1)}
                            disabled={paymentsPage >= Math.ceil(paymentsTotalCount / paymentsPageSize) || loadingPayments}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-6">
            <RegistrationControl />
            <Card className={adminCardClass}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <CardTitle>Configuração Evolution API</CardTitle>
                </div>
                <CardDescription>
                  Configure as credenciais da Evolution API para envio de notificações via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      URL da API
                    </label>
                    <Input
                      className={adminInputClass}
                      placeholder="https://sua-api.com"
                      value={evolutionConfig.api_url}
                      onChange={(e) => setEvolutionConfig({ ...evolutionConfig, api_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      API Key
                    </label>
                    <Input
                      className={adminInputClass}
                      type="password"
                      placeholder="Sua API Key"
                      value={evolutionConfig.api_key}
                      onChange={(e) => setEvolutionConfig({ ...evolutionConfig, api_key: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Nome da Instância
                    </label>
                    <Input
                      className={adminInputClass}
                      placeholder="Ex: LocalFiny"
                      value={evolutionConfig.instance_name}
                      onChange={(e) => setEvolutionConfig({ ...evolutionConfig, instance_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button
                    onClick={handleSaveEvolutionConfig}
                    disabled={savingConfig}
                    className={`flex-1 sm:flex-none ${adminButtonClass}`}
                  >
                    {savingConfig ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Salvar Configuração
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleTestEvolutionConnection}
                    disabled={testingConnection || !evolutionConfig.api_url}
                    className={`flex-1 sm:flex-none ${adminButtonClass}`}
                  >
                    {testingConnection ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Testar Conexão
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className={adminCardClass}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>Configuração OpenAI</CardTitle>
                </div>
                <CardDescription>
                  Configure as credenciais da OpenAI para o Assistente Financeiro IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      OpenAI API Key
                    </label>
                    <Input
                      className={adminInputClass}
                      type="password"
                      placeholder="sk-..."
                      value={openAiConfig.api_key}
                      onChange={(e) => setOpenAiConfig({ ...openAiConfig, api_key: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Modelo de IA
                    </label>
                    <Select
                      value={openAiConfig.model}
                      onValueChange={(value) => setOpenAiConfig({ ...openAiConfig, model: value })}
                    >
                      <SelectTrigger className={adminInputClass}>
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o (Mais inteligente)</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o mini (Mais rápido/barato)</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button
                    onClick={handleSaveOpenAiConfig}
                    disabled={savingOpenAi}
                    className={`flex-1 sm:flex-none ${adminButtonClass}`}
                  >
                    {savingOpenAi ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Salvar Configuração
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleTestOpenAiConnection}
                    disabled={testingOpenAi || !openAiConfig.api_key}
                    className={`flex-1 sm:flex-none ${adminButtonClass}`}
                  >
                    {testingOpenAi ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Testar Conexão
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-dashed border-border/80 bg-muted/40 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Informações Importantes</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• A OpenAI é utilizada para o Assistente Financeiro IA processar perguntas complexas.</p>
                <p>• O modelo sugerido é o **GPT-4o mini** por ser eficiente e econômico.</p>
                <p>• O sistema utiliza estas configurações globalmente para todos os usuários.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Clear Payments Confirmation */}
      <AlertDialog open={isClearPaymentsDialogOpen} onOpenChange={setIsClearPaymentsDialogOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Histórico de Pagamentos?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja limpar todo o histórico de pagamentos? Esta ação não pode ser desfeita e todos os registros sumirão do painel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearPayments} className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Limpeza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              EXCLUIR USUÁRIO PERMANENTEMENTE?
            </AlertDialogTitle>
            <AlertDialogDescription>
              TEM CERTEZA? Esta ação excluirá PERMANENTEMENTE o usuário, sua conta de login e TODOS os seus dados financeiros. Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Admin;


import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Check,
  CreditCard,
  DollarSign,
  Edit,
  Loader2,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCards } from "@/hooks/useCards";
import { BankAccountType, useBankAccounts } from "@/hooks/useBankAccounts";
import { supabase } from "@/integrations/supabase/client";
import { type BankOption, getBanks } from "@/lib/bankService";
import {
  generateBankColor,
  getBankAssetBySlug,
  getBankInitials,
  resolveBankSlug,
} from "@/lib/bankAssets";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const formatPercent = (value: number) => `${value.toFixed(1).replace(".", ",")}%`;

const contaTipoLabel: Record<BankAccountType, string> = {
  corrente: "Corrente",
  poupanca: "Poupanca",
  investimento: "Investimento",
};

type CreditExpenseRow = {
  valor: number | null;
  data: string | null;
  created_at: string | null;
  recorrente: boolean | null;
  despesa_pai_id: string | null;
  installment_group_id: string | null;
  installments_total: number | null;
  cartao_id: string | null;
};

type CardWithUsage = {
  id: string;
  name: string;
  issuer_bank: string | null;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  usedMonth: number;
  available: number;
  utilization: number;
};

const normalizeBankText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getBankOptionMeta = (bank: BankOption) => {
  const parts: string[] = [];
  if (bank.code) parts.push(`Codigo ${bank.code}`);
  if (bank.ispb) parts.push(`ISPB ${bank.ispb}`);
  if (!parts.length) parts.push("Sem codigo bancario");
  return parts.join(" • ");
};

const UtilizationBar = ({ value }: { value: number }) => {
  const bounded = Math.max(0, Math.min(100, value));
  const barColor =
    bounded >= 85 ? "bg-red-500" : bounded >= 60 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="flex min-w-[140px] items-center gap-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${bounded}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
        {formatPercent(value)}
      </span>
    </div>
  );
};

const WalletSummaryCard = ({
  icon: Icon,
  label,
  value,
  hint,
  iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  iconClassName: string;
}) => (
  <Card className="border border-slate-200 p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 md:p-6">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100 md:text-3xl">
          {value}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
      <div className={`rounded-xl p-3 ${iconClassName}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </Card>
);

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) => (
  <Card className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
      <Icon className="h-8 w-8 text-slate-500 dark:text-slate-300" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
      {description}
    </p>
    <Button
      onClick={onAction}
      className="mt-6 h-10 bg-orange-500 px-5 font-semibold shadow-sm transition hover:bg-orange-600 hover:shadow-md"
    >
      <Plus className="mr-2 h-4 w-4" />
      {actionLabel}
    </Button>
  </Card>
);

const Carteira = () => {
  const { toast } = useToast();
  const { cards, createCard, updateCard, deleteCard } = useCards();
  const { accounts, createAccount, updateAccount, deleteAccount } = useBankAccounts();

  const [activeTab, setActiveTab] = useState<"cards" | "accounts">("cards");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creditUsageMonth, setCreditUsageMonth] = useState(0);
  const [creditUsageByCard, setCreditUsageByCard] = useState<Record<string, number>>({});

  const [cardEditingId, setCardEditingId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState({
    name: "",
    bank_name: "",
    bank_code: "",
    bank_slug: "",
    brand_color: "",
    credit_limit: "",
    closing_day: "",
    due_day: "",
  });
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksInitialized, setBanksInitialized] = useState(false);
  const [bankQuery, setBankQuery] = useState("");
  const [bankSuggestions, setBankSuggestions] = useState<BankOption[]>([]);
  const [bankSearchLoading, setBankSearchLoading] = useState(false);
  const [bankOptionsOpen, setBankOptionsOpen] = useState(false);

  const [accountEditingId, setAccountEditingId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState({
    name: "",
    bank_name: "",
    account_type: "corrente" as BankAccountType,
    balance: "",
    balance_reference_date: "",
  });

  const isCardsTab = activeTab === "cards";
  const resetCardForm = () => {
    setCardEditingId(null);
    setCardForm({
      name: "",
      bank_name: "",
      bank_code: "",
      bank_slug: "",
      brand_color: "",
      credit_limit: "",
      closing_day: "",
      due_day: "",
    });
    setBankQuery("");
    setBankSuggestions([]);
    setBankOptionsOpen(false);
  };

  const resetAccountForm = () => {
    setAccountEditingId(null);
    setAccountForm({
      name: "",
      bank_name: "",
      account_type: "corrente",
      balance: "",
      balance_reference_date: "",
    });
  };

  const openCreateDialog = () => {
    if (isCardsTab) {
      resetCardForm();
    } else {
      resetAccountForm();
    }
    setDialogOpen(true);
  };

  const openEditCard = (id: string) => {
    const card = cards.find((item) => item.id === id);
    if (!card) return;
    setCardEditingId(id);
    const currentBankName = card.issuer_bank || "";
    setCardForm({
      name: card.name,
      bank_name: (card.bank_name || currentBankName) as string,
      bank_code: card.bank_code || "",
      bank_slug: card.bank_slug || "",
      brand_color: card.brand_color || "",
      credit_limit: String(card.credit_limit),
      closing_day: String(card.closing_day),
      due_day: String(card.due_day),
    });
    setBankQuery(currentBankName);
    setDialogOpen(true);
  };

  const openEditAccount = (id: string) => {
    const account = accounts.find((item) => item.id === id);
    if (!account) return;
    setAccountEditingId(id);
    setAccountForm({
      name: account.name,
      bank_name: account.bank_name,
      account_type: account.account_type,
      balance: String(account.balance),
      balance_reference_date: account.balance_reference_date || "",
    });
    setDialogOpen(true);
  };

  const loadCreditUsageMonth = async () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("despesas")
      .select(
        "valor, data, created_at, recorrente, despesa_pai_id, installment_group_id, installments_total, cartao_id"
      )
      .eq("forma_pagamento", "Credito");

    if (error) {
      setCreditUsageMonth(0);
      setCreditUsageByCard({});
      return;
    }

    const rows = (data || []) as CreditExpenseRow[];
    const grouped = new Map<string, { total: number; cardId: string | null }>();
    const byCard: Record<string, number> = {};
    let total = 0;

    for (const item of rows) {
      const value = Number(item.valor || 0);
      if (!Number.isFinite(value) || value <= 0) continue;

      const isInstallment = Boolean(
        item.installment_group_id || Number(item.installments_total || 0) > 1
      );
      const isRecurringModel = Boolean(item.recorrente && !item.despesa_pai_id);

      if (isInstallment) {
        if (!item.created_at) continue;
        const createdDate = item.created_at.split("T")[0];
        if (createdDate < firstDay || createdDate > lastDay) continue;

        const key =
          item.installment_group_id ||
          `installments:${item.cartao_id || "no-card"}:${createdDate}:${item.data || "no-date"}`;
        const prev = grouped.get(key);
        grouped.set(key, {
          total: (prev?.total || 0) + value,
          cardId: item.cartao_id || prev?.cardId || null,
        });
        continue;
      }

      if (isRecurringModel || !item.data) continue;

      const dueDate = item.data.split("T")[0];
      if (dueDate < firstDay || dueDate > lastDay) continue;
      total += value;
      if (item.cartao_id) {
        byCard[item.cartao_id] = (byCard[item.cartao_id] || 0) + value;
      }
    }

    for (const item of grouped.values()) {
      total += item.total;
      if (item.cardId) {
        byCard[item.cardId] = (byCard[item.cardId] || 0) + item.total;
      }
    }

    setCreditUsageMonth(total);
    setCreditUsageByCard(byCard);
  };

  useEffect(() => {
    loadCreditUsageMonth();
  }, []);

  useEffect(() => {
    if (!dialogOpen || !isCardsTab || banksInitialized) return;

    let active = true;
    setBanksLoading(true);
    getBanks()
      .then((result) => {
        if (!active) return;
        setBanks(result);
      })
      .finally(() => {
        if (!active) return;
        setBanksLoading(false);
        setBanksInitialized(true);
      });

    return () => {
      active = false;
    };
  }, [banksInitialized, dialogOpen, isCardsTab]);

  useEffect(() => {
    if (!dialogOpen || !isCardsTab) return;

    setBankSearchLoading(true);
    const timeoutId = window.setTimeout(() => {
      const query = normalizeBankText(bankQuery);
      if (!query) {
        setBankSuggestions(banks.slice(0, 8));
        setBankSearchLoading(false);
        return;
      }

      const filtered = banks
        .filter((bank) => {
          const codeLabel = bank.code ? `codigo ${bank.code}` : "";
          const source = `${bank.name} ${bank.fullName} ${codeLabel} ${bank.ispb}`;
          return normalizeBankText(source).includes(query);
        })
        .slice(0, 8);

      setBankSuggestions(filtered);
      setBankSearchLoading(false);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bankQuery, banks, dialogOpen, isCardsTab]);

  const cardsWithUsage = useMemo<CardWithUsage[]>(
    () =>
      cards.map((card) => {
        const usedMonth = Number(creditUsageByCard[card.id] || 0);
        const creditLimit = Number(card.credit_limit || 0);
        const available = creditLimit - usedMonth;
        const utilization = creditLimit > 0 ? (usedMonth / creditLimit) * 100 : 0;
        return {
          id: card.id,
          name: card.name,
          issuer_bank: card.issuer_bank,
          credit_limit: creditLimit,
          closing_day: card.closing_day,
          due_day: card.due_day,
          usedMonth,
          available,
          utilization,
        };
      }),
    [cards, creditUsageByCard]
  );

  const cardsKpis = useMemo(() => {
    const totalLimit = cardsWithUsage.reduce((sum, card) => sum + card.credit_limit, 0);
    const totalUsed = cardsWithUsage.reduce((sum, card) => sum + card.usedMonth, 0);
    const totalAvailable = totalLimit - totalUsed;
    return {
      totalLimit,
      cardsCount: cardsWithUsage.length,
      usedMonth: totalUsed,
      available: totalAvailable,
    };
  }, [cardsWithUsage]);

  const accountsKpis = useMemo(() => {
    const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
    const sorted = [...accounts].sort((a, b) => b.balance - a.balance);
    return {
      totalBalance,
      accountsCount: accounts.length,
      highest: sorted[0] || null,
      lowest: sorted[sorted.length - 1] || null,
    };
  }, [accounts]);

  const resolvedBankSlug = useMemo(
    () => resolveBankSlug(cardForm.bank_name, cardForm.bank_code) || cardForm.bank_slug || null,
    [cardForm.bank_name, cardForm.bank_code, cardForm.bank_slug]
  );
  const bankAsset = useMemo(() => getBankAssetBySlug(resolvedBankSlug), [resolvedBankSlug]);
  const bankBrandColor = useMemo(
    () => bankAsset?.color || cardForm.brand_color || generateBankColor(cardForm.bank_name),
    [bankAsset?.color, cardForm.brand_color, cardForm.bank_name]
  );
  const bankInitials = useMemo(() => getBankInitials(cardForm.bank_name), [cardForm.bank_name]);

  const handleSaveCard = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!cardForm.name.trim() || !cardForm.credit_limit || !cardForm.closing_day || !cardForm.due_day) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatorios.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: cardForm.name.trim(),
      issuer_bank: cardForm.bank_name.trim() || null,
      bank_name: cardForm.bank_name.trim() || null,
      bank_code: cardForm.bank_code.trim() || null,
      bank_slug: resolvedBankSlug,
      brand_color: bankBrandColor,
      credit_limit: Number(cardForm.credit_limit),
      closing_day: Number(cardForm.closing_day),
      due_day: Number(cardForm.due_day),
      provider: null,
      external_id: null,
      last_sync_at: null,
    };

    if (cardEditingId) {
      await updateCard(cardEditingId, payload);
    } else {
      await createCard(payload);
    }

    setDialogOpen(false);
    resetCardForm();
    await loadCreditUsageMonth();
  };

  const handleSaveAccount = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!accountForm.name.trim() || !accountForm.bank_name.trim() || !accountForm.balance) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatorios.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: accountForm.name.trim(),
      bank_name: accountForm.bank_name.trim(),
      account_type: accountForm.account_type,
      balance: Number(accountForm.balance),
      balance_reference_date: accountForm.balance_reference_date || null,
      provider: null,
      external_id: null,
      last_sync_at: null,
    };

    if (accountEditingId) {
      await updateAccount(accountEditingId, payload);
    } else {
      await createAccount(payload);
    }

    setDialogOpen(false);
    resetAccountForm();
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="mb-0 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-4xl">
                Carteira
              </h1>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                {isCardsTab ? "Cartoes" : "Bancos/Contas"}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300 md:text-base">
              Acompanhe limites, uso mensal e saldo das suas contas em um unico painel.
            </p>
          </div>
          <Button
            onClick={openCreateDialog}
            className="h-11 w-full bg-orange-500 px-5 text-sm font-semibold shadow-sm transition hover:bg-orange-600 hover:shadow-md sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            {isCardsTab ? "Novo Cartao" : "Nova Conta"}
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "cards" | "accounts")}
          className="space-y-0"
        >
          <div className="flex items-center justify-start mt-4 mb-6">
            <TabsList className="w-full grid grid-cols-2 sm:w-auto sm:inline-flex">
              <TabsTrigger value="cards" className="text-sm">
                Cartoes
              </TabsTrigger>
              <TabsTrigger value="accounts" className="text-sm">
                Bancos/Contas
              </TabsTrigger>
            </TabsList>
          </div>
          {isCardsTab ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
              <WalletSummaryCard icon={CreditCard} label="Limite Total" value={formatCurrency(cardsKpis.totalLimit)} hint="Total" iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" />
              <WalletSummaryCard icon={Wallet} label="Cartoes" value={String(cardsKpis.cardsCount)} hint="Cadastrados" iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300" />
              <WalletSummaryCard icon={DollarSign} label="Uso no Mes" value={formatCurrency(cardsKpis.usedMonth)} hint="Neste mes" iconClassName="bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300" />
              <WalletSummaryCard icon={Building2} label="Disponivel" value={formatCurrency(cardsKpis.available)} hint="Limite restante" iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300" />
            </div>

            <div className="h-8" />
            <div>
              {cardsWithUsage.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="Nenhum cartao cadastrado"
                  description="Cadastre seu primeiro cartao para acompanhar limite, uso mensal e ciclo da fatura."
                  actionLabel="Adicionar Cartao"
                  onAction={openCreateDialog}
                />
              ) : (
                <Card className="overflow-hidden border border-slate-200 shadow-sm dark:border-slate-700">
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Cartao</TableHead>
                          <TableHead>Banco</TableHead>
                          <TableHead className="text-right">Limite</TableHead>
                          <TableHead className="text-right">Uso no mes</TableHead>
                          <TableHead className="text-right">Disponivel</TableHead>
                          <TableHead>Utilizacao</TableHead>
                          <TableHead>Ciclo</TableHead>
                          <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cardsWithUsage.map((card) => (
                          <TableRow key={card.id}>
                            <TableCell className="font-medium">{card.name}</TableCell>
                            <TableCell>{card.issuer_bank || "-"}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(card.credit_limit)}</TableCell>
                            <TableCell className="text-right tabular-nums text-red-600">{formatCurrency(card.usedMonth)}</TableCell>
                            <TableCell className="text-right tabular-nums text-emerald-600">{formatCurrency(card.available)}</TableCell>
                            <TableCell><UtilizationBar value={card.utilization} /></TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">Fecha dia {card.closing_day} • Vence dia {card.due_day}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => openEditCard(card.id)}><Edit className="h-4 w-4" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Excluir cartao</AlertDialogTitle><AlertDialogDescription>Essa acao nao podera ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => { await deleteCard(card.id); await loadCreditUsageMonth(); }}>Excluir</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-3 p-4 md:hidden">
                    {cardsWithUsage.map((card) => (
                      <Card key={card.id} className="border border-slate-200 p-4 shadow-sm dark:border-slate-700">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div><p className="font-semibold text-slate-900 dark:text-slate-100">{card.name}</p><p className="text-sm text-slate-500 dark:text-slate-400">{card.issuer_bank || "Sem banco"}</p></div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600" onClick={() => openEditCard(card.id)}><Edit className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Excluir cartao</AlertDialogTitle><AlertDialogDescription>Essa acao nao podera ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => { await deleteCard(card.id); await loadCreditUsageMonth(); }}>Excluir</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between"><span className="text-slate-500 dark:text-slate-400">Limite</span><span className="font-semibold tabular-nums">{formatCurrency(card.credit_limit)}</span></div>
                          <div className="flex items-center justify-between"><span className="text-slate-500 dark:text-slate-400">Uso no mes</span><span className="font-semibold tabular-nums text-red-600">{formatCurrency(card.usedMonth)}</span></div>
                          <div className="flex items-center justify-between"><span className="text-slate-500 dark:text-slate-400">Disponivel</span><span className="font-semibold tabular-nums text-emerald-600">{formatCurrency(card.available)}</span></div>
                        </div>

                        <div className="mt-3"><UtilizationBar value={card.utilization} /><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Fecha dia {card.closing_day} • Vence dia {card.due_day}</p></div>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </>
          ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
              <WalletSummaryCard icon={DollarSign} label="Saldo Total" value={formatCurrency(accountsKpis.totalBalance)} hint="Total em contas" iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300" />
              <WalletSummaryCard icon={Wallet} label="Contas" value={String(accountsKpis.accountsCount)} hint="Ativas" iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300" />
              <WalletSummaryCard icon={Building2} label="Maior Saldo" value={accountsKpis.highest ? formatCurrency(accountsKpis.highest.balance) : "-"} hint={accountsKpis.highest?.name || "Sem conta"} iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" />
              <WalletSummaryCard icon={Building2} label="Menor Saldo" value={accountsKpis.lowest ? formatCurrency(accountsKpis.lowest.balance) : "-"} hint={accountsKpis.lowest?.name || "Sem conta"} iconClassName="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300" />
            </div>

            <div className="h-8" />
            <div>
              {accounts.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="Nenhuma conta cadastrada"
                  description="Cadastre sua primeira conta para centralizar saldos e acompanhar sua liquidez."
                  actionLabel="Adicionar Conta"
                  onAction={openCreateDialog}
                />
              ) : (
                <Card className="overflow-hidden border border-slate-200 shadow-sm dark:border-slate-700">
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Conta</TableHead>
                          <TableHead>Banco</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                          <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">{account.name}</TableCell>
                            <TableCell>{account.bank_name}</TableCell>
                            <TableCell>{contaTipoLabel[account.account_type]}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(account.balance)}</TableCell>
                            <TableCell className="text-right"><div className="flex items-center justify-end gap-2"><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => openEditAccount(account.id)}><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir conta</AlertDialogTitle><AlertDialogDescription>Essa acao nao podera ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteAccount(account.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-3 p-4 md:hidden">
                    {accounts.map((account) => (
                      <Card key={account.id} className="border border-slate-200 p-4 shadow-sm dark:border-slate-700">
                        <div className="mb-3 flex items-start justify-between gap-2"><div><p className="font-semibold text-slate-900 dark:text-slate-100">{account.name}</p><p className="text-sm text-slate-500 dark:text-slate-400">{account.bank_name}</p></div><div className="flex items-center gap-1"><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600" onClick={() => openEditAccount(account.id)}><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir conta</AlertDialogTitle><AlertDialogDescription>Essa acao nao podera ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteAccount(account.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div>
                        <div className="space-y-2 text-sm"><div className="flex items-center justify-between"><span className="text-slate-500 dark:text-slate-400">Tipo</span><span className="font-medium">{contaTipoLabel[account.account_type]}</span></div><div className="flex items-center justify-between"><span className="text-slate-500 dark:text-slate-400">Saldo</span><span className="font-semibold tabular-nums">{formatCurrency(account.balance)}</span></div></div>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </>
          )}
        </Tabs>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              resetCardForm();
              resetAccountForm();
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl">
            {isCardsTab ? (
              <>
                <DialogHeader>
                  <DialogTitle>{cardEditingId ? "Editar Cartao" : "Novo Cartao"}</DialogTitle>
                  <DialogDescription>Preencha os dados do cartao.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveCard} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="card-name">Nome do cartao *</Label>
                      <Input id="card-name" value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bank-name">Banco emissor</Label>
                      <div className="relative">
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                            {bankAsset?.logo ? (
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
                                <img
                                  src={bankAsset.logo}
                                  alt={`Logo ${cardForm.bank_name || "Banco"}`}
                                  className="h-4 w-4 object-contain"
                                />
                              </span>
                            ) : (
                              <span className="flex h-7 w-7 items-center justify-center gap-1 rounded-full bg-slate-200 px-1 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                <Building2 className="h-3 w-3" />
                                <span>{bankInitials}</span>
                              </span>
                            )}
                          </div>
                          <Input
                            id="bank-name"
                            value={cardForm.bank_name}
                            placeholder="Digite para buscar ou preencher manualmente"
                            onChange={(e) => {
                              setCardForm({ ...cardForm, bank_name: e.target.value });
                              setBankQuery(e.target.value);
                              setBankOptionsOpen(true);
                            }}
                            onFocus={() => {
                              setBankQuery(cardForm.bank_name);
                              setBankOptionsOpen(true);
                            }}
                            onBlur={() => {
                              window.setTimeout(() => setBankOptionsOpen(false), 120);
                            }}
                            className="pr-10 pl-12"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                            {banksLoading || bankSearchLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : null}
                          </div>
                        </div>
                        {bankOptionsOpen ? (
                          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                            {banksLoading || bankSearchLoading ? (
                              <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Carregando bancos...
                              </div>
                            ) : null}
                            {!banksLoading && !bankSearchLoading && bankSuggestions.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                                Nenhum banco encontrado. Voce pode digitar manualmente.
                              </div>
                            ) : null}
                            {!banksLoading && !bankSearchLoading
                              ? bankSuggestions.map((bank) => {
                                  const isSelected =
                                    cardForm.bank_name === bank.fullName &&
                                    (cardForm.bank_code || "") === (bank.code || "");
                                  return (
                                    <button
                                      key={`${bank.ispb || bank.fullName}-${bank.code || "no-code"}`}
                                      type="button"
                                      className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => {
                                        setCardForm({
                                          ...cardForm,
                                          bank_name: bank.fullName,
                                          bank_code: bank.code || "",
                                          bank_slug: resolveBankSlug(bank.fullName, bank.code || "") || "",
                                          brand_color:
                                            getBankAssetBySlug(resolveBankSlug(bank.fullName, bank.code || ""))?.color || "",
                                        });
                                        setBankQuery(bank.fullName);
                                        setBankOptionsOpen(false);
                                      }}
                                    >
                                      <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                          {bank.fullName}
                                        </span>
                                        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                                          {getBankOptionMeta(bank)}
                                        </span>
                                      </span>
                                      {isSelected ? (
                                        <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                                      ) : null}
                                    </button>
                                  );
                                })
                              : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bank-code">Codigo do banco</Label>
                      <Input
                        id="bank-code"
                        value={cardForm.bank_code}
                        placeholder="Ex.: 341"
                        onChange={(e) => setCardForm({ ...cardForm, bank_code: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="credit-limit">Limite de credito *</Label>
                      <CurrencyInput id="credit-limit" value={cardForm.credit_limit} onValueChange={(value) => setCardForm({ ...cardForm, credit_limit: value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="closing-day">Fechamento *</Label>
                        <Input id="closing-day" type="number" min={1} max={28} value={cardForm.closing_day} onChange={(e) => setCardForm({ ...cardForm, closing_day: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="due-day">Vencimento *</Label>
                        <Input id="due-day" type="number" min={1} max={28} value={cardForm.due_day} onChange={(e) => setCardForm({ ...cardForm, due_day: e.target.value })} />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div
                        className="rounded-xl border border-slate-200 p-4 text-white shadow-sm dark:border-slate-700"
                        style={{ background: `linear-gradient(135deg, ${bankBrandColor} 0%, #0f172a 100%)` }}
                      >
                        <p className="mb-3 text-xs uppercase tracking-wider text-slate-300">Preview do cartao</p>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold">{cardForm.name.trim() || "Nome do cartao"}</p>
                            <p className="mt-1 text-sm text-slate-300">{cardForm.bank_name.trim() || "Banco emissor"}</p>
                          </div>
                          {bankAsset?.logo ? (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                              <img
                                src={bankAsset.logo}
                                alt={`Logo ${cardForm.bank_name || "Banco"}`}
                                className="h-7 w-7 object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                              <div className="flex flex-col items-center leading-none">
                                <Building2 className="h-4 w-4" />
                                <span className="mt-1 text-[10px] font-bold">{bankInitials}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                          <span>Fechamento: dia {cardForm.closing_day || "--"}</span>
                          <span>Vencimento: dia {cardForm.due_day || "--"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600">{cardEditingId ? "Salvar alteracoes" : "Salvar cartao"}</Button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{accountEditingId ? "Editar Conta" : "Nova Conta"}</DialogTitle>
                  <DialogDescription>Preencha os dados da conta.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveAccount} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="account-name">Nome da conta *</Label>
                      <Input id="account-name" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank-name">Banco *</Label>
                      <Input id="bank-name" value={accountForm.bank_name} onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account-type">Tipo *</Label>
                      <select id="account-type" value={accountForm.account_type} onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value as BankAccountType })} className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                        <option value="corrente">Corrente</option>
                        <option value="poupanca">Poupanca</option>
                        <option value="investimento">Investimento</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account-balance">Saldo *</Label>
                      <CurrencyInput id="account-balance" value={accountForm.balance} onValueChange={(value) => setAccountForm({ ...accountForm, balance: value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600">{accountEditingId ? "Salvar alteracoes" : "Salvar conta"}</Button>
                  </div>
                </form>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Carteira;

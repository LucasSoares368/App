
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MonthYearCalendarPicker } from "@/components/MonthYearCalendarPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Edit,
  Loader2,
  Plus,
  Trash,
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
  digital: "Digital",
};

const contaTipoBadgeClass: Record<BankAccountType, string> = {
  corrente: "bg-blue-500/20 text-blue-400",
  poupanca: "bg-green-500/20 text-green-400",
  investimento: "bg-purple-500/20 text-purple-400",
  digital: "bg-orange-500/20 text-orange-400",
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

type PaidExpenseRow = {
  valor: number | null;
  data: string | null;
  forma_pagamento: string | null;
  status_pagamento: string | null;
  recorrente: boolean | null;
  despesa_pai_id: string | null;
};

type CardWithUsage = {
  id: string;
  name: string;
  card_holder_name: string | null;
  issuer_bank: string | null;
  bank_name: string | null;
  bank_code: string | null;
  bank_slug: string | null;
  brand_color: string | null;
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

const UtilizationBar = ({
  value,
  brandColor,
}: {
  value: number;
  brandColor: string | null;
}) => {
  const bounded = Math.max(0, Math.min(100, value));
  const baseColor =
    bounded >= 90 ?
       "#EF4444"
     : bounded >= 70 ?
         "#F97316"
       : bounded >= 40 ?
           "#F59E0B"
         : brandColor || "#22C55E";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${bounded}%`,
          backgroundColor: baseColor,
        }}
      />
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
  icon: React.ComponentType<{ className: string }>;
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

const BankLogoBadge = ({
  bankName,
  bankCode,
  bankSlug,
  size = "sm",
}: {
  bankName: string;
  bankCode: string | null;
  bankSlug: string | null;
  size: "sm" | "lg";
}) => {
  const resolvedSlug = bankSlug || resolveBankSlug(bankName, bankCode || undefined);
  const asset = getBankAssetBySlug(resolvedSlug);
  const initials = getBankInitials(bankName);
  const containerClass =
    size === "lg" ?
       "h-11 w-11 rounded-xl"
     : "h-7 w-7 rounded-full";
  const imageClass = size === "lg" ? "h-6 w-6 object-contain" : "h-4 w-4 object-contain";
  const initialsClass =
    size === "lg" ?
       "text-sm font-bold"
     : "text-[10px] font-semibold";

  if (asset?.logo) {
    return (
      <span className={`flex shrink-0 items-center justify-center bg-white ring-1 ring-slate-200 dark:ring-slate-700 ${containerClass}`}>
        <img src={asset.logo} alt={`Logo ${bankName}`} className={imageClass} />
      </span>
    );
  }

  return (
    <span className={`flex shrink-0 items-center justify-center bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 ${containerClass} ${initialsClass}`}>
      {initials}
    </span>
  );
};

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className: string }>;
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
  const [mesReferencia, setMesReferencia] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });
  const [creditUsageMonth, setCreditUsageMonth] = useState(0);
  const [creditUsageByCard, setCreditUsageByCard] = useState<Record<string, number>>({});
  const [receivedIncomeMonth, setReceivedIncomeMonth] = useState(0);
  const [expectedIncomeMonth, setExpectedIncomeMonth] = useState(0);
  const [receivedIncomeByAccount, setReceivedIncomeByAccount] = useState<Record<string, number>>({});
  const [expectedIncomeByAccount, setExpectedIncomeByAccount] = useState<Record<string, number>>({});
  const [paidExpensesTotal, setPaidExpensesTotal] = useState(0);

  const [cardEditingId, setCardEditingId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState({
    name: "",
    card_holder_name: "",
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
  const [accountBankQuery, setAccountBankQuery] = useState("");
  const [accountBankSuggestions, setAccountBankSuggestions] = useState<BankOption[]>([]);
  const [accountBankSearchLoading, setAccountBankSearchLoading] = useState(false);
  const [accountBankOptionsOpen, setAccountBankOptionsOpen] = useState(false);

  const [accountEditingId, setAccountEditingId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState({
    name: "",
    account_holder_name: "",
    bank_name: "",
    bank_code: "",
    bank_slug: "",
    brand_color: "",
    account_type: "corrente" as BankAccountType,
    balance: "",
    balance_reference_date: "",
  });

  const isCardsTab = activeTab === "cards";
  const resetCardForm = () => {
    setCardEditingId(null);
    setCardForm({
      name: "",
      card_holder_name: "",
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
      account_holder_name: "",
      bank_name: "",
      bank_code: "",
      bank_slug: "",
      brand_color: "",
      account_type: "corrente" as BankAccountType,
      balance: "",
      balance_reference_date: "",
    });
    setAccountBankQuery("");
    setAccountBankSuggestions([]);
    setAccountBankOptionsOpen(false);
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
      card_holder_name: card.card_holder_name || "",
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
      account_holder_name: account.account_holder_name || "",
      bank_name: account.bank_name,
      bank_code: "",
      bank_slug: resolveBankSlug(account.bank_name) || "",
      brand_color: getBankAssetBySlug(resolveBankSlug(account.bank_name))?.color || "",
      account_type: account.account_type,
      balance: String(account.balance),
      balance_reference_date: account.balance_reference_date || "",
    });
    setAccountBankQuery(account.bank_name);
    setDialogOpen(true);
  };

  const aplicarMesReferencia = (date: Date) => {
    const novoMes = new Date(date.getFullYear(), date.getMonth(), 1);
    setMesReferencia(novoMes);
  };

  const navegarMes = (direcao: number) => {
    const proximoMes = new Date(
      mesReferencia.getFullYear(),
      mesReferencia.getMonth() + direcao,
      1
    );
    aplicarMesReferencia(proximoMes);
  };

  const mesReferenciaLabel = useMemo(() => {
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(mesReferencia);
  }, [mesReferencia]);

  const loadCreditUsageMonth = async () => {
    const firstDay = new Date(
      mesReferencia.getFullYear(),
      mesReferencia.getMonth(),
      1
    )
      .toISOString()
      .split("T")[0];
    const lastDay = new Date(
      mesReferencia.getFullYear(),
      mesReferencia.getMonth() + 1,
      0
    )
      .toISOString()
      .split("T")[0];

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
          total: (prev.total || 0) + value,
          cardId: item.cartao_id || prev.cardId || null,
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

  const loadExpectedIncomeMonth = async () => {
    const endOfMonth = new Date(
      mesReferencia.getFullYear(),
      mesReferencia.getMonth() + 1,
      0
    )
      .toISOString()
      .split("T")[0];

    const { data, error } = await supabase
      .from("receitas")
      .select("valor, bank_account_id, status_recebimento, data, recorrente, receita_pai_id")
      .eq("recorrente", false)
      .not("bank_account_id", "is", null)
      .lte("data", endOfMonth);

    if (error) {
      toast({
        title: "Erro ao carregar receitas previstas",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    let receivedTotal = 0;
    let pendingTotal = 0;
    const receivedByAccount: Record<string, number> = {};
    const pendingByAccount: Record<string, number> = {};
    const referenceByAccount = new Map(
      accounts.map((account) => [
        account.id,
        account.balance_reference_date
          ? account.balance_reference_date.split("T")[0]
          : null,
      ])
    );

    for (const item of data || []) {
      const value = Number(item.valor || 0);
      const accountId = item.bank_account_id;
      const dataReceita = item.data ? item.data.split("T")[0] : null;
      if (!accountId || Number.isNaN(value)) continue;
      if (!dataReceita) continue;

      const accountReferenceDate = referenceByAccount.get(accountId);
      if (accountReferenceDate && dataReceita <= accountReferenceDate) {
        continue;
      }

      if (item.status_recebimento === "recebido") {
        receivedTotal += value;
        receivedByAccount[accountId] = (receivedByAccount[accountId] || 0) + value;
      } else {
        pendingTotal += value;
        pendingByAccount[accountId] = (pendingByAccount[accountId] || 0) + value;
      }
    }

    setReceivedIncomeMonth(receivedTotal);
    setExpectedIncomeMonth(pendingTotal);
    setReceivedIncomeByAccount(receivedByAccount);
    setExpectedIncomeByAccount(pendingByAccount);
  };

  const loadPaidExpensesTotal = async () => {
    const endOfMonth = new Date(
      mesReferencia.getFullYear(),
      mesReferencia.getMonth() + 1,
      0
    )
      .toISOString()
      .split("T")[0];
    let total = 0;

    const { data: despesasData, error: despesasError } = await supabase
      .from("despesas")
      .select("valor, data, forma_pagamento, status_pagamento, recorrente, despesa_pai_id")
      .lte("data", endOfMonth);

    if (!despesasError) {
      const rows = (despesasData || []) as PaidExpenseRow[];
      total += rows.reduce((sum, item) => {
        const isRecurringModel = Boolean(item.recorrente && !item.despesa_pai_id);
        if (isRecurringModel) return sum;
        if (item.status_pagamento !== "pago") return sum;
        if ((item.forma_pagamento || "").toLowerCase() === "credito") return sum;

        const value = Number(item.valor || 0);
        if (!Number.isFinite(value) || value <= 0) return sum;
        return sum + value;
      }, 0);
    }

    const { data: transacoesData, error: transacoesError } = await supabase
      .from("transacoes")
      .select("valor")
      .eq("tipo", "despesa")
      .lte("data", endOfMonth);

    if (!transacoesError) {
      total += (transacoesData || []).reduce((sum, item) => {
        const value = Number(item.valor || 0);
        if (!Number.isFinite(value) || value <= 0) return sum;
        return sum + value;
      }, 0);
    }

    setPaidExpensesTotal(total);
  };

  useEffect(() => {
    loadCreditUsageMonth();
    loadExpectedIncomeMonth();
    loadPaidExpensesTotal();
  }, [mesReferencia, accounts]);

  useEffect(() => {
    if (!dialogOpen || banksInitialized) return;

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
  }, [banksInitialized, dialogOpen]);

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

  useEffect(() => {
    if (!dialogOpen || isCardsTab) return;

    setAccountBankSearchLoading(true);
    const timeoutId = window.setTimeout(() => {
      const query = normalizeBankText(accountBankQuery);
      if (!query) {
        setAccountBankSuggestions(banks.slice(0, 8));
        setAccountBankSearchLoading(false);
        return;
      }

      const filtered = banks
        .filter((bank) => {
          const codeLabel = bank.code ? `codigo ${bank.code}` : "";
          const source = `${bank.name} ${bank.fullName} ${codeLabel} ${bank.ispb}`;
          return normalizeBankText(source).includes(query);
        })
        .slice(0, 8);

      setAccountBankSuggestions(filtered);
      setAccountBankSearchLoading(false);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [accountBankQuery, banks, dialogOpen, isCardsTab]);

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
          card_holder_name: card.card_holder_name,
          issuer_bank: card.issuer_bank,
          bank_name: card.bank_name,
          bank_code: card.bank_code,
          bank_slug: card.bank_slug,
          brand_color: card.brand_color,
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
    const baseBalance = accounts.reduce(
      (sum, account) => sum + Number(account.balance || 0),
      0
    );
    const realBalance = baseBalance + receivedIncomeMonth - paidExpensesTotal;

    const sorted = [...accounts].sort((a, b) => {
      const balanceA =
        Number(a.balance || 0) + Number(receivedIncomeByAccount[a.id] || 0);
      const balanceB =
        Number(b.balance || 0) + Number(receivedIncomeByAccount[b.id] || 0);
      return balanceB - balanceA;
    });

    return {
      totalBalance: baseBalance,
      realBalance,
      paidExpenses: paidExpensesTotal,
      receivedIncome: receivedIncomeMonth,
      expectedIncome: expectedIncomeMonth,
      projectedBalance: realBalance + expectedIncomeMonth,
      accountsCount: accounts.length,
      highest: sorted[0] || null,
      lowest: sorted[sorted.length - 1] || null,
    };
  }, [
    accounts,
    expectedIncomeMonth,
    paidExpensesTotal,
    receivedIncomeMonth,
    receivedIncomeByAccount,
  ]);

  const currentBalanceByAccount = useMemo(() => {
    const byAccount: Record<string, number> = {};
    for (const account of accounts) {
      byAccount[account.id] =
        Number(account.balance || 0) +
        Number(receivedIncomeByAccount[account.id] || 0);
    }
    return byAccount;
  }, [accounts, receivedIncomeByAccount]);

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
  const accountBankSlug = useMemo(
    () => accountForm.bank_slug || resolveBankSlug(accountForm.bank_name, accountForm.bank_code) || null,
    [accountForm.bank_slug, accountForm.bank_name, accountForm.bank_code]
  );
  const accountBankAsset = useMemo(
    () => getBankAssetBySlug(accountBankSlug),
    [accountBankSlug]
  );
  const accountBankInitials = useMemo(
    () => getBankInitials(accountForm.bank_name),
    [accountForm.bank_name]
  );
  const accountBrandColor = useMemo(
    () =>
      accountForm.brand_color ||
      accountBankAsset?.color ||
      generateBankColor(accountForm.bank_name),
    [accountForm.brand_color, accountBankAsset?.color, accountForm.bank_name]
  );

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
      card_holder_name: cardForm.card_holder_name.trim() || null,
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
      account_holder_name: accountForm.account_holder_name.trim() || null,
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
          <div className="flex w-full flex-row items-center justify-end gap-2 sm:w-auto">
            <div className="flex h-14 items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50/70 px-3 dark:border-slate-700 dark:bg-slate-900/40">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navegarMes(-1)}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-2 text-sm font-semibold text-gray-900 dark:text-slate-100"
                    aria-label="Selecionar mês no calendário"
                  >
                    {mesReferenciaLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <MonthYearCalendarPicker value={mesReferencia} onSelect={aplicarMesReferencia} />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navegarMes(1)}
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={openCreateDialog}
              className="h-14 w-auto bg-orange-500 px-5 text-sm font-semibold shadow-sm transition hover:bg-orange-600 hover:shadow-md"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isCardsTab ? "Novo Cartao" : "Nova Conta"}
            </Button>
          </div>
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
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cartao</TableHead>
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
                          <TableRow key={card.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900/40">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <BankLogoBadge
                                  bankName={card.bank_name || card.issuer_bank || card.name}
                                  bankCode={card.bank_code}
                                  bankSlug={card.bank_slug}
                                  size="lg"
                                />
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{card.name}</p>
                                  <p className="truncate text-sm text-gray-500 dark:text-slate-400">{card.issuer_bank || "-"}</p>
                                  {card.card_holder_name ? (
                                    <p className="truncate text-xs text-gray-400 dark:text-slate-500">
                                      {card.card_holder_name}
                                    </p>
                                 ) : null}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(card.credit_limit)}</TableCell>
                            <TableCell className="text-right tabular-nums text-red-600">{formatCurrency(card.usedMonth)}</TableCell>
                            <TableCell className="text-right tabular-nums text-emerald-600">{formatCurrency(card.available)}</TableCell>
                            <TableCell><UtilizationBar value={card.utilization} brandColor={card.brand_color} /></TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-300">Fecha dia {card.closing_day} • Vence dia {card.due_day}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                  onClick={() => openEditCard(card.id)}
                                >
                                  <Edit size={16} />
                                </button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      type="button"
                                      className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                    >
                                      <Trash size={16} />
                                    </button>
                                  </AlertDialogTrigger>
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
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{card.name}</p>
                            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                              <BankLogoBadge
                                bankName={card.bank_name || card.issuer_bank || card.name}
                                bankCode={card.bank_code}
                                bankSlug={card.bank_slug}
                              />
                              <p>{card.issuer_bank || "Sem banco"}</p>
                            </div>
                            {card.card_holder_name ? (
                              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{card.card_holder_name}</p>
                           ) : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              onClick={() => openEditCard(card.id)}
                            >
                              <Edit size={16} />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  type="button"
                                  className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                >
                                  <Trash size={16} />
                                </button>
                              </AlertDialogTrigger>
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

                        <div className="mt-3"><UtilizationBar value={card.utilization} brandColor={card.brand_color} /><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Fecha dia {card.closing_day} • Vence dia {card.due_day}</p></div>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </>
         ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-5">
              <WalletSummaryCard
                icon={DollarSign}
                label="Saldo Total"
                value={formatCurrency(accountsKpis.realBalance)}
                hint={`+${formatCurrency(accountsKpis.receivedIncome)} recebidas • -${formatCurrency(accountsKpis.paidExpenses)} despesas pagas`}
                iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
              />
              <WalletSummaryCard
                icon={DollarSign}
                label="Saldo Previsto"
                value={formatCurrency(accountsKpis.projectedBalance)}
                hint={`${formatCurrency(accountsKpis.expectedIncome)} em receitas previstas`}
                iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300"
              />
              <WalletSummaryCard icon={Wallet} label="Contas" value={String(accountsKpis.accountsCount)} hint="Ativas" iconClassName="bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300" />
              <WalletSummaryCard icon={Building2} label="Maior Saldo" value={accountsKpis.highest ? formatCurrency(Number(currentBalanceByAccount[accountsKpis.highest.id] || 0)) : "-"} hint={accountsKpis.highest.name || "Sem conta"} iconClassName="bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300" />
              <WalletSummaryCard icon={Building2} label="Menor Saldo" value={accountsKpis.lowest ? formatCurrency(Number(currentBalanceByAccount[accountsKpis.lowest.id] || 0)) : "-"} hint={accountsKpis.lowest.name || "Sem conta"} iconClassName="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300" />
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
                      <TableHeader>
                        <TableRow>
                          <TableHead>Conta</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                          <TableHead className="text-right">Saldo previsto</TableHead>
                          <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accounts.map((account) => (
                          <TableRow key={account.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900/40">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <BankLogoBadge
                                  bankName={account.bank_name}
                                  bankSlug={resolveBankSlug(account.bank_name)}
                                  size="lg"
                                />
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                                    {account.name}
                                  </p>
                                  <p className="truncate text-sm text-gray-500 dark:text-slate-400">
                                    {account.bank_name}
                                  </p>
                                  {account.account_holder_name ? (
                                    <p className="truncate text-xs text-gray-400 dark:text-slate-500">
                                      {account.account_holder_name}
                                    </p>
                                 ) : null}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{contaTipoLabel[account.account_type]}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(Number(currentBalanceByAccount[account.id] || 0))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-blue-600">
                              {formatCurrency(
                                Number(currentBalanceByAccount[account.id] || 0) +
                                  Number(expectedIncomeByAccount[account.id] || 0)
                              )}
                            </TableCell>
                            <TableCell className="text-right"><div className="flex items-center justify-end gap-2"><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => openEditAccount(account.id)}><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir conta</AlertDialogTitle><AlertDialogDescription>Essa acao nao podera ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteAccount(account.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-3 p-4 md:hidden">
                    {accounts.map((account) => (
                      <Card key={account.id} className="border border-slate-200 p-4 shadow-sm dark:border-slate-700">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <BankLogoBadge
                              bankName={account.bank_name}
                              bankSlug={resolveBankSlug(account.bank_name)}
                              size="lg"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                                {account.name}
                              </p>
                              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                                {account.bank_name}
                              </p>
                              {account.account_holder_name ? (
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {account.account_holder_name}
                                </p>
                             ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600" onClick={() => openEditAccount(account.id)}><Edit className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir conta</AlertDialogTitle><AlertDialogDescription>Essa acao nao podera ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteAccount(account.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm"><div className="flex items-center justify-between"><span className="text-slate-500 dark:text-slate-400">Tipo</span><span className="font-medium">{contaTipoLabel[account.account_type]}</span></div><div className="flex items-center justify-between"><span className="text-slate-500 dark:text-slate-400">Saldo</span><span className="font-semibold tabular-nums">{formatCurrency(Number(currentBalanceByAccount[account.id] || 0))}</span></div><div className="flex items-center justify-between"><span className="text-slate-500 dark:text-slate-400">Saldo previsto</span><span className="font-semibold tabular-nums text-blue-600">{formatCurrency(Number(currentBalanceByAccount[account.id] || 0) + Number(expectedIncomeByAccount[account.id] || 0))}</span></div></div>
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
          <DialogContent className="space-y-5 rounded-2xl p-6 sm:max-w-2xl">
            {isCardsTab ? (
              <>
                <DialogHeader>
                  <DialogTitle>{cardEditingId ? "Editar Cartao" : "Novo Cartao"}</DialogTitle>
                  <DialogDescription>Preencha os dados do cartao.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveCard} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="card-name">Nome do cartao *</Label>
                      <Input id="card-name" value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="card-holder-name">Nome no cartao / proprietario</Label>
                      <Input
                        id="card-holder-name"
                        value={cardForm.card_holder_name}
                        placeholder="Ex.: LUCAS S. SILVA"
                        onChange={(e) => setCardForm({ ...cardForm, card_holder_name: e.target.value })}
                      />
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
                        className="rounded-2xl border border-slate-200 p-6 text-white shadow-sm dark:border-slate-700"
                        style={{ background: `linear-gradient(135deg, ${bankBrandColor} 0%, #0f172a 100%)` }}
                      >
                        <p className="mb-3 text-xs uppercase tracking-wider text-white/60">Preview do cartao</p>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{cardForm.name.trim() || "Nome do cartao"}</p>
                            <p className="mt-1 text-sm text-white/80">{cardForm.bank_name.trim() || "Banco emissor"}</p>
                            {cardForm.card_holder_name.trim() ? (
                              <p className="mt-2 text-xs uppercase tracking-wide text-white/70">
                                {cardForm.card_holder_name}
                              </p>
                           ) : null}
                          </div>
                          {bankAsset?.logo ? (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-md">
                              <img
                                src={bankAsset.logo}
                                alt={`Logo ${cardForm.bank_name || "Banco"}`}
                                className="h-6 w-6 object-contain"
                              />
                            </div>
                         ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-md dark:text-slate-700">
                              <div className="flex flex-col items-center leading-none">
                                <Building2 className="h-4 w-4" />
                                <span className="mt-1 text-[10px] font-bold">{bankInitials}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-white/80">
                          <span>Fechamento: dia {cardForm.closing_day || "--"}</span>
                          <span>Vencimento: dia {cardForm.due_day || "--"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      className="bg-gray-100 text-slate-700 hover:bg-gray-200"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="bg-orange-500 shadow-md transition-all hover:bg-orange-600"
                    >
                      {cardEditingId ? "Salvar alteracoes" : "Salvar cartao"}
                    </Button>
                  </div>
                </form>
              </>
           ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{accountEditingId ? "Editar Conta" : "Nova Conta"}</DialogTitle>
                  <DialogDescription>Preencha os dados da conta.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveAccount} className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="account-name">Nome da conta *</Label>
                      <Input id="account-name" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account-holder-name">Proprietario</Label>
                      <Input
                        id="account-holder-name"
                        value={accountForm.account_holder_name}
                        placeholder="Ex.: Lucas Soares"
                        onChange={(e) =>
                          setAccountForm({
                            ...accountForm,
                            account_holder_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bank-name">Banco *</Label>
                      <div className="relative">
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                            {accountBankAsset?.logo ? (
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
                                <img
                                  src={accountBankAsset.logo}
                                  alt={`Logo ${accountForm.bank_name || "Banco"}`}
                                  className="h-4 w-4 object-contain"
                                />
                              </span>
                           ) : (
                              <span className="flex h-7 w-7 items-center justify-center gap-1 rounded-full bg-slate-200 px-1 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                <Building2 className="h-3 w-3" />
                                <span>{accountBankInitials}</span>
                              </span>
                            )}
                          </div>
                          <Input
                            id="bank-name"
                            value={accountForm.bank_name}
                            placeholder="Digite para buscar ou preencher manualmente"
                            onChange={(e) => {
                              setAccountForm({
                                ...accountForm,
                                bank_name: e.target.value,
                                bank_code: "",
                                bank_slug: resolveBankSlug(e.target.value) || "",
                                brand_color:
                                  getBankAssetBySlug(resolveBankSlug(e.target.value))?.color ||
                                  "",
                              });
                              setAccountBankQuery(e.target.value);
                              setAccountBankOptionsOpen(true);
                            }}
                            onFocus={() => {
                              setAccountBankQuery(accountForm.bank_name);
                              setAccountBankOptionsOpen(true);
                            }}
                            onBlur={() => {
                              window.setTimeout(() => setAccountBankOptionsOpen(false), 120);
                            }}
                            className="pr-10 pl-12"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                            {banksLoading || accountBankSearchLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                           ) : null}
                          </div>
                        </div>
                        {accountBankOptionsOpen ? (
                          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                            {banksLoading || accountBankSearchLoading ? (
                              <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Carregando bancos...
                              </div>
                           ) : null}
                            {!banksLoading && !accountBankSearchLoading && accountBankSuggestions.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                                Nenhum banco encontrado. Voce pode digitar manualmente.
                              </div>
                           ) : null}
                            {!banksLoading && !accountBankSearchLoading
                              ? accountBankSuggestions.map((bank) => {
                                  const bankSlug = resolveBankSlug(bank.fullName, bank.code || "") || "";
                                  const bankAsset = getBankAssetBySlug(bankSlug);
                                  const bankInitials = getBankInitials(bank.fullName);
                                  const isSelected =
                                    accountForm.bank_name === bank.fullName &&
                                    (accountForm.bank_code || "") === (bank.code || "");
                                  return (
                                    <button
                                      key={`${bank.ispb || bank.fullName}-${bank.code || "no-code"}`}
                                      type="button"
                                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => {
                                        setAccountForm({
                                          ...accountForm,
                                          bank_name: bank.fullName,
                                          bank_code: bank.code || "",
                                          bank_slug: bankSlug,
                                          brand_color: bankAsset?.color || "",
                                        });
                                        setAccountBankQuery(bank.fullName);
                                        setAccountBankOptionsOpen(false);
                                      }}
                                    >
                                      <span className="flex min-w-0 items-center gap-3">
                                        {bankAsset?.logo ? (
                                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                                            <img
                                              src={bankAsset.logo}
                                              alt={`Logo ${bank.fullName}`}
                                              className="h-4 w-4 object-contain"
                                            />
                                          </span>
                                       ) : (
                                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                            {bankInitials}
                                          </span>
                                        )}
                                        <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                          {bank.fullName}
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
                      <Label htmlFor="account-type">Tipo *</Label>
                      <Select
                        value={accountForm.account_type}
                        onValueChange={(value) =>
                          setAccountForm({
                            ...accountForm,
                            account_type: value as BankAccountType,
                          })
                        }
                      >
                        <SelectTrigger id="account-type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corrente">Corrente</SelectItem>
                          <SelectItem value="poupanca">Poupanca</SelectItem>
                          <SelectItem value="investimento">Investimento</SelectItem>
                          <SelectItem value="digital">Digital</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account-balance">Saldo *</Label>
                      <CurrencyInput
                        id="account-balance"
                        value={accountForm.balance}
                        placeholder="R$ 0,00"
                        className="text-right"
                        onValueChange={(value) => setAccountForm({ ...accountForm, balance: value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <p className="mb-3 text-xs uppercase tracking-wider text-white/60">
                        Preview da conta
                      </p>
                      <div
                        className="rounded-2xl border border-slate-200 p-6 text-white shadow-sm dark:border-slate-700"
                        style={{
                          background: `linear-gradient(135deg, ${accountBrandColor} 0%, #0f172a 100%)`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">
                              {accountForm.name.trim() || "Nome da conta"}
                            </p>
                            <p className="mt-1 text-sm text-white/80">
                              {accountForm.bank_name.trim() || "Banco"}
                            </p>
                            {accountForm.account_holder_name.trim() ? (
                              <p className="mt-2 text-xs uppercase tracking-wide text-white/70">
                                {accountForm.account_holder_name}
                              </p>
                           ) : null}
                            <span
                              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${contaTipoBadgeClass[accountForm.account_type]}`}
                            >
                              {contaTipoLabel[accountForm.account_type]}
                            </span>
                            <p className="mt-3 text-sm text-white/90">
                              Saldo atual: {formatCurrency(Number(accountForm.balance || 0))}
                            </p>
                          </div>
                          {accountBankAsset?.logo ? (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-md">
                              <img
                                src={accountBankAsset.logo}
                                alt={`Logo ${accountForm.bank_name || "Banco"}`}
                                className="h-6 w-6 object-contain"
                              />
                            </div>
                         ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-md dark:text-slate-700">
                              <div className="flex flex-col items-center leading-none">
                                <Building2 className="h-4 w-4" />
                                <span className="mt-1 text-[10px] font-bold">{accountBankInitials}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      className="bg-gray-100 text-slate-700 hover:bg-gray-200"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="bg-orange-500 shadow-md transition-all hover:bg-orange-600"
                    >
                      {accountEditingId ? "Salvar alteracoes" : "Salvar conta"}
                    </Button>
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

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Undo2,
  Edit,
  Trash2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useCategorias } from "@/hooks/useCategorias";
import { useReceitas } from "@/hooks/useReceitas";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { EditarReceitaModal } from "@/components/EditarReceitaModal";
import { KpiCard } from "@/components/KpiCard";
import { getComputedStatus } from "@/lib/receita-status";
import { computeReceitasKpis } from "@/lib/receitas-kpis";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Receita {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  bank_account_id?: string | null;
  bank_accounts?: {
    id: string;
    name: string;
    bank_name: string;
  } | null;
  data: string;
  tipo: "fixa" | "variavel";
  tipo_receita?: string;
  forma_pagamento?: string | null;
  status_recebimento?: "recebido" | "pendente";
  recorrente?: boolean;
  dia_recorrencia?: number | null;
  receita_pai_id?: string | null;
  frequencia_recorrencia?: "mensal" | "quinzenal" | "semanal";
  data_fim_recorrencia?: string | null;
}

const formatDateInputValue = (date: Date) => {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

const getMonthRange = (date: Date) => {
  const inicio = new Date(date.getFullYear(), date.getMonth(), 1);
  const fim = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    inicio: formatDateInputValue(inicio),
    fim: formatDateInputValue(fim),
  };
};

const Receitas = () => {
  const { toast } = useToast();
  const { categoriasReceita } = useCategorias();
  const { accounts } = useBankAccounts();
  const { receitas, createReceita, updateReceita, deleteReceita } =
    useReceitas();
  const [activeTab, setActiveTab] = useState("lista");

  const [novaReceita, setNovaReceita] = useState({
    descricao: "",
    valor: "",
    categoria: "",
    contaId: "",
    data: "",
    tipo: "variavel" as "fixa" | "variavel",
    formaPagamento: "",
    statusRecebimento: "recebido" as "recebido" | "pendente",
    recorrente: false,
    diaRecorrencia: "",
    frequenciaRecorrencia: "mensal" as "mensal" | "quinzenal" | "semanal",
    dataFimRecorrencia: "",
  });

  const [filtro, setFiltro] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [mesReferencia, setMesReferencia] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [dataInicioFiltro, setDataInicioFiltro] = useState(
    () => getMonthRange(new Date()).inicio
  );
  const [dataFimFiltro, setDataFimFiltro] = useState(
    () => getMonthRange(new Date()).fim
  );
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarModelosRecorrentes, setMostrarModelosRecorrentes] = useState(false);
  const [receitasSelecionadas, setReceitasSelecionadas] = useState<string[]>([]);
  const [modoGrafico, setModoGrafico] = useState<
    "realizada" | "prevista" | "ambas"
  >("realizada");

  // Estados para o modal de edição
  const [receitaEditando, setReceitaEditando] = useState<Receita | null>(null);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);

  const formInputClass =
    "bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border-gray-300 dark:border-slate-700 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-slate-500/30 focus-visible:border-slate-500 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-400";
  const formSelectTriggerClass =
    "bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700";
  const formSelectContentClass =
    "border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
  const formSelectItemClass =
    "text-slate-900 focus:bg-slate-100 dark:text-slate-100 dark:focus:bg-slate-800";

  const obterDiaDaData = (data: string) => {
    if (!data) return "";
    const partes = data.split("T")[0].split("-");
    if (partes.length !== 3) return "";
    return String(parseInt(partes[2], 10));
  };

  const adicionarReceita = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !novaReceita.descricao ||
      !novaReceita.valor ||
      !novaReceita.categoria ||
      !novaReceita.data ||
      !novaReceita.formaPagamento
    ) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (
      novaReceita.recorrente &&
      novaReceita.frequenciaRecorrencia === "mensal" &&
      !novaReceita.diaRecorrencia
    ) {
      toast({
        title: "Erro",
        description: "Preencha o dia da recorrencia",
        variant: "destructive",
      });
      return;
    }

    const categoria = categoriasReceita.find(
      (c) => c.nome === novaReceita.categoria
    );

    await createReceita({
      descricao: novaReceita.descricao,
      valor: parseFloat(novaReceita.valor),
      categoria_id: categoria?.id,
      bank_account_id: novaReceita.contaId || null,
      data: novaReceita.data,
      forma_pagamento: novaReceita.formaPagamento,
      status_recebimento: novaReceita.statusRecebimento,
      tipo_receita: novaReceita.tipo,
      recorrente: novaReceita.recorrente,
      dia_recorrencia: novaReceita.recorrente
        ? parseInt(novaReceita.diaRecorrencia, 10)
        : null,
      frequencia_recorrencia: novaReceita.recorrente
        ? novaReceita.frequenciaRecorrencia
        : "mensal",
      data_fim_recorrencia:
        novaReceita.recorrente && novaReceita.dataFimRecorrencia
          ? novaReceita.dataFimRecorrencia
          : null,
      receita_pai_id: null,
    });

    setNovaReceita({
      descricao: "",
      valor: "",
      categoria: "",
      contaId: "",
      data: "",
      tipo: "variavel",
      formaPagamento: "",
      statusRecebimento: "recebido",
      recorrente: false,
      diaRecorrencia: "",
      frequenciaRecorrencia: "mensal",
      dataFimRecorrencia: "",
    });

    setActiveTab("lista");
  };

  const handleEditarReceita = (receita: any) => {
    const receitaFormatada = {
      id: receita.id,
      descricao: receita.descricao,
      valor: receita.valor,
      categoria: receita.categorias?.nome || "",
      bank_account_id: receita.bank_account_id || null,
      bank_accounts: receita.bank_accounts || null,
      data: receita.data,
      tipo: receita.tipo_receita || "variavel",
      forma_pagamento: receita.forma_pagamento || "",
      status_recebimento: receita.status_recebimento || "recebido",
      recorrente: Boolean(receita.recorrente),
      dia_recorrencia: receita.dia_recorrencia || null,
      receita_pai_id: receita.receita_pai_id || null,
      frequencia_recorrencia: receita.frequencia_recorrencia || "mensal",
      data_fim_recorrencia: receita.data_fim_recorrencia || null,
    };
    setReceitaEditando(receitaFormatada);
    setModalEditarAberto(true);
  };

  const handleSalvarEdicao = async (receitaAtualizada: Receita) => {
    const categoria = categoriasReceita.find(
      (c) => c.nome === receitaAtualizada.categoria
    );

    await updateReceita(receitaAtualizada.id, {
      descricao: receitaAtualizada.descricao,
      valor: receitaAtualizada.valor,
      categoria_id: categoria?.id,
      bank_account_id: receitaAtualizada.bank_account_id || null,
      data: receitaAtualizada.data,
      forma_pagamento: receitaAtualizada.forma_pagamento || null,
      status_recebimento: receitaAtualizada.status_recebimento || "recebido",
      tipo_receita: receitaAtualizada.tipo || "variavel",
      recorrente: Boolean(receitaAtualizada.recorrente),
      dia_recorrencia: receitaAtualizada.recorrente
        ? receitaAtualizada.dia_recorrencia || 1
        : null,
      frequencia_recorrencia: receitaAtualizada.recorrente
        ? receitaAtualizada.frequencia_recorrencia || "mensal"
        : "mensal",
      data_fim_recorrencia:
        receitaAtualizada.recorrente && receitaAtualizada.data_fim_recorrencia
          ? receitaAtualizada.data_fim_recorrencia
          : null,
    });
  };

  const handleExcluirReceita = async (id: string) => {
    await deleteReceita(id);
  };

  const handleAtualizarStatusRapido = async (
    id: string,
    novoStatus: "recebido" | "pendente"
  ) => {
    await updateReceita(id, { status_recebimento: novoStatus });
  };

  const toggleSelecaoReceita = (id: string) => {
    setReceitasSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const limparSelecao = () => {
    setReceitasSelecionadas([]);
  };

  const modelosRecorrentes = receitas
    .filter((receita) => receita.recorrente && !receita.receita_pai_id)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const receitasLancadas = receitas.filter((receita) => !receita.recorrente);

  const receitasFiltradas = receitasLancadas
    .filter((receita) => {
      const matchDescricao = receita.descricao
        .toLowerCase()
        .includes(filtro.toLowerCase());
      const matchCategoria =
        categoriaFiltro === "" || receita.categorias?.nome === categoriaFiltro;
      const tipoReceita = receita.receita_pai_id
        ? "lancamento_recorrente"
        : "variavel";
      const matchTipo = tipoFiltro === "" || tipoReceita === tipoFiltro;
      const dataReceita = receita.data.split("T")[0];
      const matchDataInicio =
        dataInicioFiltro === "" || dataReceita >= dataInicioFiltro;
      const matchDataFim =
        dataFimFiltro === "" || dataReceita <= dataFimFiltro;

      return (
        matchDescricao &&
        matchCategoria &&
        matchTipo &&
        matchDataInicio &&
        matchDataFim
      );
    })
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  const todasFiltradasSelecionadas =
    receitasFiltradas.length > 0 &&
    receitasFiltradas.every((receita) => receitasSelecionadas.includes(receita.id));

  const toggleSelecionarTodasFiltradas = () => {
    if (todasFiltradasSelecionadas) {
      const idsFiltrados = new Set(receitasFiltradas.map((r) => r.id));
      setReceitasSelecionadas((prev) =>
        prev.filter((id) => !idsFiltrados.has(id))
      );
      return;
    }

    setReceitasSelecionadas((prev) => {
      const conjunto = new Set(prev);
      receitasFiltradas.forEach((receita) => conjunto.add(receita.id));
      return Array.from(conjunto);
    });
  };

  const receitasValidas = receitasLancadas;
  const agora = new Date();
  const hojeSemHora = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  );
  const modelosRecorrentesAtivos = modelosRecorrentes.filter((modelo) => {
    if (!modelo.data_fim_recorrencia) return true;
    const dataFim = new Date(`${modelo.data_fim_recorrencia}T00:00:00`);
    return dataFim >= hojeSemHora;
  });
  const modelosRecorrentesEncerrados = modelosRecorrentes.filter((modelo) => {
    if (!modelo.data_fim_recorrencia) return false;
    const dataFim = new Date(`${modelo.data_fim_recorrencia}T00:00:00`);
    return dataFim < hojeSemHora;
  });

  const kpis = useMemo(
    () =>
      computeReceitasKpis({
        receitasLancadas: receitasValidas,
        modelosRecorrentesAtivos,
        period: {
          dataInicio: dataInicioFiltro || undefined,
          dataFim: dataFimFiltro || undefined,
        },
      }),
    [receitasValidas, modelosRecorrentesAtivos, dataInicioFiltro, dataFimFiltro]
  );

  const variacaoPositiva = kpis.variacaoPercentual >= 0;
  const ReceitaDirectionIcon = variacaoPositiva ? ArrowUp : ArrowDown;
  const receitaDirectionColor = variacaoPositiva ? "text-green-600" : "text-red-600";
  const variacaoSubtitle =
    kpis.variacaoPercentual === 0
      ? `• 0% vs ${kpis.isFiltered ? "período anterior" : "mês passado"}`
      : (
          <span className="inline-flex items-center gap-1 align-middle">
            <ReceitaDirectionIcon
              className={`h-4 w-4 shrink-0 ${receitaDirectionColor}`}
            />
            <span className="truncate">{`${
              variacaoPositiva ? "+" : ""
            }${kpis.variacaoPercentual.toFixed(0)}% vs ${
              kpis.isFiltered ? "período anterior" : "mês passado"
            }`}</span>
          </span>
        );
  const variacaoVariant =
    kpis.variacaoPercentual === 0
      ? "warning"
      : variacaoPositiva
      ? "success"
      : "danger";
  const media6MesesTexto = `R$ ${kpis.mediaMensal.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  })}`;
  const melhorCategoriaValor = kpis.melhorCategoria
    ? `R$ ${kpis.melhorCategoria[1].toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`
    : `Sem receitas ${kpis.isFiltered ? "no período" : "no mês"}`;
  const receitaPrevistaTexto = `R$ ${kpis.receitaPrevistaRecorrente.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  })}`;
  const crescimentoAbsolutoTexto = `R$ ${kpis.crescimentoAbsoluto.toLocaleString(
    "pt-BR",
    { minimumFractionDigits: 2 }
  )}`;
  const GrowthDirectionIcon = kpis.crescimentoAbsoluto < 0 ? ArrowDown : ArrowUp;
  const growthDirectionColor =
    kpis.crescimentoAbsoluto < 0 ? "text-red-600" : "text-green-600";
  const crescimentoVariant = kpis.crescimentoAbsoluto >= 0 ? "success" : "danger";
  const crescimentoPercentualTexto = `${kpis.crescimentoPercentual >= 0 ? "+" : ""}${kpis.crescimentoPercentual.toLocaleString(
    "pt-BR",
    { minimumFractionDigits: 1, maximumFractionDigits: 1 }
  )}%`;
  const dadosReceitaPorMes = kpis.chartData;
  const categorias = categoriasReceita.map((c) => c.nome);

  const obterTipoReceita = (receita: any) => {
    if (receita.recorrente) {
      return {
        label: "Recorrente (modelo)",
        className: "bg-indigo-100 text-indigo-800",
      };
    }

    if (receita.receita_pai_id) {
      return {
        label: "Lançamento recorrente",
        className: "bg-blue-100 text-blue-800",
      };
    }

    return {
      label: "Avulsa",
      className: "bg-green-100 text-green-800",
    };
  };

  const obterBadgeCategoria = (receita: any) => {
    const cor = receita.categorias?.cor;
    if (cor) {
      return {
        style: {
          backgroundColor: `${cor}22`,
          color: cor,
          borderColor: `${cor}55`,
        },
      };
    }

    return {
      style: {
        backgroundColor: "#f3f4f6",
        color: "#374151",
        borderColor: "#d1d5db",
      },
    };
  };

  const obterTagTipo = (receita: any) => {
    const tipoBase = String(receita.tipo_receita || receita.tipo || "variavel")
      .toLowerCase()
      .trim();

    const config: Record<string, { label: string; className: string }> = {
      fixa: { label: "Fixa", className: "bg-blue-100 text-blue-800" },
      variavel: { label: "Variável", className: "bg-gray-100 text-gray-800 dark:text-slate-100" },
      venda: { label: "Venda", className: "bg-emerald-100 text-emerald-800" },
      serviço: { label: "Serviço", className: "bg-cyan-100 text-cyan-800" },
      servico: { label: "Serviço", className: "bg-cyan-100 text-cyan-800" },
      comissão: { label: "Comissão", className: "bg-violet-100 text-violet-800" },
      comissao: { label: "Comissão", className: "bg-violet-100 text-violet-800" },
    };

    if (config[tipoBase]) return config[tipoBase];

    return {
      label: tipoBase.charAt(0).toUpperCase() + tipoBase.slice(1),
      className: "bg-slate-100 text-slate-800",
    };
  };

  const obterRecorrencia = (receita: any) => {
    return receita.recorrente || receita.receita_pai_id ? "Sim" : "Não";
  };

  const obterStatus = (receita: any) => {
    const status = getComputedStatus(receita);
    return {
      label:
        status === "atrasado"
          ? "Atrasado"
          : status === "pendente"
          ? "Pendente"
          : "Recebido",
      className:
        status === "atrasado"
          ? "bg-red-100 text-red-800"
          : status === "pendente"
          ? "bg-amber-100 text-amber-800"
          : "bg-emerald-100 text-emerald-800",
    };
  };

  const limparFiltros = () => {
    const mesAtual = new Date();
    const rangeMesAtual = getMonthRange(mesAtual);
    setFiltro("");
    setCategoriaFiltro("");
    setTipoFiltro("");
    setMesReferencia(new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1));
    setDataInicioFiltro(rangeMesAtual.inicio);
    setDataFimFiltro(rangeMesAtual.fim);
    setReceitasSelecionadas([]);
  };

  const aplicarMesReferencia = (date: Date) => {
    const range = getMonthRange(date);
    setMesReferencia(new Date(date.getFullYear(), date.getMonth(), 1));
    setDataInicioFiltro(range.inicio);
    setDataFimFiltro(range.fim);
  };

  const navegarMes = (direcao: number) => {
    const proximoMes = new Date(
      mesReferencia.getFullYear(),
      mesReferencia.getMonth() + direcao,
      1
    );
    aplicarMesReferencia(proximoMes);
  };

  const handleDataInicioFiltroChange = (value: string) => {
    setDataInicioFiltro(value);
    if (!value) return;
    const [ano, mes] = value.split("-").map(Number);
    if (!ano || !mes) return;
    setMesReferencia(new Date(ano, mes - 1, 1));
  };

  const mesReferenciaLabel = useMemo(() => {
    const label = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(mesReferencia);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [mesReferencia]);

  const executarAcaoEmLote = async (
    acao: "recebido" | "pendente" | "excluir"
  ) => {
    if (!receitasSelecionadas.length) return;

    if (acao === "excluir") {
      const confirmou = window.confirm(
        `Deseja excluir ${receitasSelecionadas.length} receita(s) selecionada(s)?`
      );
      if (!confirmou) return;
    }

    if (acao === "excluir") {
      await Promise.all(
        receitasSelecionadas.map((id) => deleteReceita(id))
      );
    } else {
      await Promise.all(
        receitasSelecionadas.map((id) =>
          updateReceita(id, { status_recebimento: acao })
        )
      );
    }

    limparSelecao();
  };

  const nomeArquivoBase = `receitas-${new Date().toISOString().split("T")[0]}`;

  const montarLinhasExportacao = () => {
    return receitasFiltradas.map((receita) => ({
      Descricao: receita.descricao,
      Categoria: receita.categorias?.nome || "Sem categoria",
      Conta: receita.bank_accounts?.name
        ? `${receita.bank_accounts.name} (${receita.bank_accounts.bank_name})`
        : "-",
      "Forma de pagamento": receita.forma_pagamento || "-",
      Status: obterStatus(receita).label,
      Recorrente: obterRecorrencia(receita),
      Tipo: obterTagTipo(receita).label,
      Data: new Date(`${receita.data.split("T")[0]}T00:00:00`).toLocaleDateString(
        "pt-BR"
      ),
      Valor: Number(receita.valor || 0),
    }));
  };

  const exportarReceitasXlsx = () => {
    const linhas = montarLinhasExportacao();
    const worksheet = XLSX.utils.json_to_sheet(linhas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Receitas");
    XLSX.writeFile(workbook, `${nomeArquivoBase}.xlsx`);
  };

  const exportarReceitasPdf = () => {
    const linhas = montarLinhasExportacao();
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    doc.setFontSize(12);
    doc.text("Relatorio de Receitas", 40, 32);

    autoTable(doc, {
      startY: 44,
      head: [
        [
          "Descricao",
          "Categoria",
          "Conta",
          "Forma de pagamento",
          "Status",
          "Recorrente",
          "Tipo",
          "Data",
          "Valor",
        ],
      ],
      body: linhas.map((item) => [
        item.Descricao,
        item.Categoria,
        item.Conta,
        item["Forma de pagamento"],
        item.Status,
        item.Recorrente,
        item.Tipo,
        item.Data,
        item.Valor.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [249, 115, 22] },
    });

    doc.save(`${nomeArquivoBase}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100">
              Receitas
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-slate-300">
              Gerencie suas fontes de renda
            </p>
          </div>
          <div className="flex w-full flex-row items-center justify-end gap-2 sm:w-auto">
            <div className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navegarMes(-1)}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                {mesReferenciaLabel}
              </span>
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
              onClick={() => setActiveTab("adicionar")}
              className="bg-orange-500 hover:bg-orange-600 w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Registrar Receita
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
          <KpiCard
            title={kpis.isFiltered ? "Receita do período" : "Receita do mês atual"}
            value={`R$ ${kpis.receitaPrincipal.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}`}
            subtitle={variacaoSubtitle}
            icon={DollarSign}
            variant={variacaoVariant}
            iconVariant="success"
          />
          <KpiCard
            title={
              kpis.isFiltered
                ? "Média mensal do período"
                : "Média mensal dos últimos 6 meses"
            }
            value={media6MesesTexto}
            subtitle={
              kpis.isFiltered ? `• Base: ${kpis.periodLabel}` : "• Base dos últimos 6 meses"
            }
            icon={TrendingUp}
            variant="neutral"
          />
          <KpiCard
            title={kpis.isFiltered ? "Melhor categoria do período" : "Melhor categoria do mês"}
            value={kpis.melhorCategoria ? kpis.melhorCategoria[0] : "-"}
            subtitle={melhorCategoriaValor}
            icon={Calendar}
            variant="neutral"
          />
          <KpiCard
            title="Receita prevista"
            value={receitaPrevistaTexto}
            subtitle={`${kpis.recorrenciasAtivasNoPeriodo} recorrência(s) ativa(s)`}
            icon={AlertTriangle}
            variant="warning"
          />
          <KpiCard
            title="Crescimento no ano"
            value={crescimentoAbsolutoTexto}
            subtitle={
              <span className="inline-flex items-center gap-1 align-middle">
                <GrowthDirectionIcon
                  className={`h-4 w-4 shrink-0 ${growthDirectionColor}`}
                />
                <span className="truncate">{`${crescimentoPercentualTexto} • Jan → mês atual`}</span>
              </span>
            }
            icon={GrowthDirectionIcon}
            variant={crescimentoVariant}
          />

        </div>

        <Card className="p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-slate-100">
              Gráfico de Receita por Mês (recebimentos)
            </h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={modoGrafico === "realizada" ? "default" : "outline"}
                onClick={() => setModoGrafico("realizada")}
              >
                Receita Realizada
              </Button>
              <Button
                size="sm"
                variant={modoGrafico === "prevista" ? "default" : "outline"}
                onClick={() => setModoGrafico("prevista")}
              >
                Receita Prevista
              </Button>
              <Button
                size="sm"
                variant={modoGrafico === "ambas" ? "default" : "outline"}
                onClick={() => setModoGrafico("ambas")}
              >
                Ambas
              </Button>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosReceitaPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" />
                <YAxis
                  tickFormatter={(value) =>
                    `R$ ${Number(value).toLocaleString("pt-BR")}`
                  }
                />
                <Tooltip
                  labelFormatter={(label) => `Mês: ${label}`}
                  formatter={(value: number, name: string) => {
                    const label =
                      name === "valorRealizada"
                        ? "Receita realizada"
                        : "Receita prevista";
                    return [
                      `R$ ${Number(value).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`,
                      label,
                    ];
                  }}
                />
                {(modoGrafico === "realizada" || modoGrafico === "ambas") && (
                  <Line
                    type="monotone"
                    dataKey="valorRealizada"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                )}
                {(modoGrafico === "prevista" || modoGrafico === "ambas") && (
                  <Line
                    type="monotone"
                    dataKey="valorPrevista"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 md:space-y-6"
        >
          <TabsList className="w-full grid grid-cols-2 sm:w-auto sm:inline-flex">
            <TabsTrigger value="lista" className="text-sm">
              Lista de Receitas
            </TabsTrigger>
            <TabsTrigger value="adicionar" className="text-sm">
              Adicionar Receita
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="space-y-4 md:space-y-6">
            <Card className="p-3 md:p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {receitasSelecionadas.length > 0 && (
                    <>
                      <span className="mr-1 text-sm font-medium text-gray-900 dark:text-slate-100">
                        {receitasSelecionadas.length} selecionada(s)
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executarAcaoEmLote("recebido")}
                      >
                        Marcar recebidas
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executarAcaoEmLote("pendente")}
                      >
                        Marcar pendentes
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => executarAcaoEmLote("excluir")}
                      >
                        Excluir selecionadas
                      </Button>
                      <Button size="sm" variant="ghost" onClick={limparSelecao}>
                        Limpar seleção
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportarReceitasPdf}
                    disabled={receitasFiltradas.length === 0}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportarReceitasXlsx}
                    disabled={receitasFiltradas.length === 0}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Baixar XLSX
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mostrarFiltros ? "default" : "outline"}
                    onClick={() => setMostrarFiltros((prev) => !prev)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {mostrarFiltros ? "Ocultar filtros" : "Filtros"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mostrarModelosRecorrentes ? "default" : "outline"}
                    onClick={() => setMostrarModelosRecorrentes((prev) => !prev)}
                  >
                    {mostrarModelosRecorrentes
                      ? "Ocultar modelos recorrentes"
                      : "Modelos recorrentes"}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Filtros */}
            {mostrarFiltros && (
            <Card className="p-4 md:p-6">
              <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-slate-100 mb-4">
                Filtros
              </h2>
              <div className="flex flex-col space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar receitas..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="categoria-filtro">Categoria</Label>
                    <select
                      id="categoria-filtro"
                      title="Filtrar por categoria"
                      value={categoriaFiltro}
                      onChange={(e) => setCategoriaFiltro(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Todas as categorias</option>
                      {categorias.map((categoria) => (
                        <option key={categoria} value={categoria}>
                          {categoria}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tipo-filtro">Tipo</Label>
                    <select
                      id="tipo-filtro"
                      title="Filtrar por tipo de receita"
                      value={tipoFiltro}
                      onChange={(e) => setTipoFiltro(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Todos os tipos</option>
                      
                      <option value="lancamento_recorrente">
                        Lançamento recorrente
                      </option>
                      <option value="variavel">Variável/Avulsa</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="data-inicio-filtro">Data inicial</Label>
                    <Input
                      id="data-inicio-filtro"
                      type="date"
                      value={dataInicioFiltro}
                      onChange={(e) => handleDataInicioFiltroChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="data-fim-filtro">Data final</Label>
                    <Input
                      id="data-fim-filtro"
                      type="date"
                      value={dataFimFiltro}
                      onChange={(e) => setDataFimFiltro(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={limparFiltros}
                    className="w-full"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </Card>
            )}

            {mostrarModelosRecorrentes && (
            <Card className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-slate-100">
                  Modelos recorrentes (não entram como receita realizada)
                </h2>
              </div>
              {modelosRecorrentes.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Nenhum modelo recorrente cadastrado.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-emerald-700">
                      Ativos ({modelosRecorrentesAtivos.length})
                    </p>
                    {modelosRecorrentesAtivos.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Nenhum modelo ativo.
                      </p>
                    ) : (
                      modelosRecorrentesAtivos.map((modelo) => (
                        <div
                          key={modelo.id}
                          className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50/40"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-slate-100">
                                {modelo.descricao}
                              </p>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                Ativo
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-slate-300">
                              {modelo.categorias?.nome || "Sem categoria"} |{" "}
                              {modelo.frequencia_recorrencia || "mensal"}{" "}
                              {(modelo.frequencia_recorrencia || "mensal") ===
                              "mensal"
                                ? `| Dia ${modelo.dia_recorrencia || "-"}`
                                : ""}{" "}
                              | Início{" "}
                              {new Date(
                                modelo.data + "T00:00:00"
                              ).toLocaleDateString("pt-BR")}{" "}
                              | Término{" "}
                              {modelo.data_fim_recorrencia
                                ? new Date(
                                    modelo.data_fim_recorrencia + "T00:00:00"
                                  ).toLocaleDateString("pt-BR")
                                : "sem data"}
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                              R${" "}
                              {modelo.valor.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditarReceita(modelo)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="sm:max-w-[425px]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirmar exclusão
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o modelo "
                                    {modelo.descricao}"? Esta ação não pode ser
                                    desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleExcluirReceita(modelo.id)
                                    }
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">
                      Encerrados ({modelosRecorrentesEncerrados.length})
                    </p>
                    {modelosRecorrentesEncerrados.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Nenhum modelo encerrado.
                      </p>
                    ) : (
                      modelosRecorrentesEncerrados.map((modelo) => (
                        <div
                          key={modelo.id}
                          className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-slate-100">
                                {modelo.descricao}
                              </p>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700 dark:text-slate-300">
                                Encerrado
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-slate-300">
                              {modelo.categorias?.nome || "Sem categoria"} |{" "}
                              {modelo.frequencia_recorrencia || "mensal"}{" "}
                              {(modelo.frequencia_recorrencia || "mensal") ===
                              "mensal"
                                ? `| Dia ${modelo.dia_recorrencia || "-"}`
                                : ""}{" "}
                              | Início{" "}
                              {new Date(
                                modelo.data + "T00:00:00"
                              ).toLocaleDateString("pt-BR")}{" "}
                              | Término{" "}
                              {modelo.data_fim_recorrencia
                                ? new Date(
                                    modelo.data_fim_recorrencia + "T00:00:00"
                                  ).toLocaleDateString("pt-BR")
                                : "sem data"}
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                              R${" "}
                              {modelo.valor.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditarReceita(modelo)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="sm:max-w-[425px]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirmar exclusão
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o modelo "
                                    {modelo.descricao}"? Esta ação não pode ser
                                    desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleExcluirReceita(modelo.id)
                                    }
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </Card>
            )}

            {/* Tabela de Receitas - Visível apenas em desktop */}
            <div className="hidden md:block">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={todasFiltradasSelecionadas}
                          onChange={toggleSelecionarTodasFiltradas}
                          title="Selecionar todas"
                        />
                      </TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Forma de pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recorrente?</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receitasFiltradas.map((receita) => (
                      <TableRow key={receita.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={receitasSelecionadas.includes(receita.id)}
                            onChange={() => toggleSelecaoReceita(receita.id)}
                            title={`Selecionar ${receita.descricao}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {receita.descricao}
                        </TableCell>
                        <TableCell>
                          <span
                            className="inline-flex px-2 py-1 rounded-full text-xs font-medium border"
                            style={obterBadgeCategoria(receita).style}
                          >
                            {receita.categorias?.nome || "Sem categoria"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {receita.bank_accounts?.name ? (
                            <div className="leading-tight">
                              <p className="font-medium text-gray-900 dark:text-slate-100">
                                {receita.bank_accounts.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">
                                {receita.bank_accounts.bank_name}
                              </p>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{receita.forma_pagamento || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${obterStatus(receita).className}`}
                          >
                            {obterStatus(receita).label}
                          </span>
                          <div className="mt-2">
                            {getComputedStatus(receita) !== "recebido" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleAtualizarStatusRapido(
                                    receita.id,
                                    "recebido"
                                  )
                                }
                                className="h-7 text-xs"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Marcar recebido
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleAtualizarStatusRapido(
                                    receita.id,
                                    "pendente"
                                  )
                                }
                                className="h-7 text-xs text-gray-600 dark:text-slate-300"
                              >
                                <Undo2 className="w-3 h-3 mr-1" />
                                Marcar pendente
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{obterRecorrencia(receita)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${obterTagTipo(receita).className}`}
                          >
                            {obterTagTipo(receita).label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(
                            receita.data + "T00:00:00"
                          ).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600 tabular-nums">
                          R${" "}
                          {receita.valor.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditarReceita(receita)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="sm:max-w-[425px]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirmar exclusão
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir a receita "
                                    {receita.descricao}"? Esta ação não pode ser
                                    desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleExcluirReceita(receita.id)
                                    }
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Visualização Mobile - Cards */}
            <div className="md:hidden space-y-4">
              {receitasFiltradas.length === 0 ? (
                <Card className="p-4">
                  <p className="text-center text-gray-500 dark:text-slate-400">
                    Nenhuma receita encontrada.
                  </p>
                </Card>
              ) : (
                receitasFiltradas.map((receita) => (
                  <Card key={receita.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-slate-100">
                          {receita.descricao}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${obterTipoReceita(receita).className}`}
                        >
                          {obterTipoReceita(receita).label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Categoria</p>
                          <span
                            className="inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium border"
                            style={obterBadgeCategoria(receita).style}
                          >
                            {receita.categorias?.nome || "Sem categoria"}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Forma de pagamento</p>
                          <p className="font-medium">
                            {receita.forma_pagamento || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Conta</p>
                          <p className="font-medium">
                            {receita.bank_accounts?.name
                              ? `${receita.bank_accounts.name} (${receita.bank_accounts.bank_name})`
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Tipo</p>
                          <span
                            className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium ${obterTagTipo(receita).className}`}
                          >
                            {obterTagTipo(receita).label}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Data</p>
                          <p className="font-medium">
                            {new Date(
                              receita.data + "T00:00:00"
                            ).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Status</p>
                          <div className="space-y-1">
                            <p className="font-medium">{obterStatus(receita).label}</p>
                            {getComputedStatus(receita) !== "recebido" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleAtualizarStatusRapido(
                                    receita.id,
                                    "recebido"
                                  )
                                }
                                className="h-7 text-xs"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Receber
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleAtualizarStatusRapido(
                                    receita.id,
                                    "pendente"
                                  )
                                }
                                className="h-7 text-xs text-gray-600 dark:text-slate-300"
                              >
                                <Undo2 className="w-3 h-3 mr-1" />
                                Reabrir
                              </Button>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Recorrente?</p>
                          <p className="font-medium">{obterRecorrencia(receita)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="font-bold text-green-600 tabular-nums">
                          R${" "}
                          {receita.valor.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditarReceita(receita)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="sm:max-w-[425px]">
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Confirmar exclusão
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a receita "
                                  {receita.descricao}"? Esta ação não pode ser
                                  desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleExcluirReceita(receita.id)
                                  }
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="adicionar">
            <Card className="p-4 md:p-6">
              <form onSubmit={adicionarReceita} className="space-y-6">
                <div className="space-y-5">
                  <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 md:p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Dados da receita
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label
                          htmlFor="descricao"
                          className="text-gray-700 dark:text-slate-300"
                        >
                          Descrição *
                        </Label>
                        <Input
                          id="descricao"
                          placeholder="Ex: Salário, Freelance, Aluguel..."
                          className={formInputClass}
                          value={novaReceita.descricao}
                          onChange={(e) =>
                            setNovaReceita({
                              ...novaReceita,
                              descricao: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="valor"
                          className="text-gray-700 dark:text-slate-300"
                        >
                          Valor *
                        </Label>
                        <CurrencyInput
                          id="valor"
                          placeholder="0,00"
                          className={formInputClass}
                          value={novaReceita.valor}
                          onValueChange={(value) =>
                            setNovaReceita({
                              ...novaReceita,
                              valor: value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="categoria"
                          className="text-gray-700 dark:text-slate-300"
                        >
                          Categoria *
                        </Label>
                        <Select
                          value={novaReceita.categoria || undefined}
                          onValueChange={(value) =>
                            setNovaReceita({
                              ...novaReceita,
                              categoria: value,
                            })
                          }
                        >
                          <SelectTrigger id="categoria" className={formSelectTriggerClass}>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent className={formSelectContentClass}>
                            {categoriasReceita.map((categoria) => (
                              <SelectItem
                                key={categoria.id}
                                value={categoria.nome}
                                className={formSelectItemClass}
                              >
                                {categoria.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-gray-700 dark:text-slate-300">
                          Tipo da receita *
                        </Label>
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="tipo-receita"
                              value="fixa"
                              checked={novaReceita.tipo === "fixa"}
                              onChange={(e) =>
                                setNovaReceita({
                                  ...novaReceita,
                                  tipo: e.target.value as "fixa" | "variavel",
                                })
                              }
                              className="text-orange-600"
                            />
                            <span className="text-gray-700 dark:text-slate-300">
                              Fixa
                            </span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="tipo-receita"
                              value="variavel"
                              checked={novaReceita.tipo === "variavel"}
                              onChange={(e) =>
                                setNovaReceita({
                                  ...novaReceita,
                                  tipo: e.target.value as "fixa" | "variavel",
                                })
                              }
                              className="text-orange-600"
                            />
                            <span className="text-gray-700 dark:text-slate-300">
                              Variável
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 md:p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Recebimento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="forma-pagamento"
                          className="text-gray-700 dark:text-slate-300"
                        >
                          Forma de pagamento *
                        </Label>
                        <Select
                          value={novaReceita.formaPagamento || undefined}
                          onValueChange={(value) =>
                            setNovaReceita({
                              ...novaReceita,
                              formaPagamento: value,
                            })
                          }
                        >
                          <SelectTrigger
                            id="forma-pagamento"
                            className={formSelectTriggerClass}
                          >
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className={formSelectContentClass}>
                            <SelectItem value="Pix" className={formSelectItemClass}>
                              Pix
                            </SelectItem>
                            <SelectItem
                              value="Transferência"
                              className={formSelectItemClass}
                            >
                              Transferência
                            </SelectItem>
                            <SelectItem
                              value="Dinheiro"
                              className={formSelectItemClass}
                            >
                              Dinheiro
                            </SelectItem>
                            <SelectItem value="Cartão" className={formSelectItemClass}>
                              Cartão
                            </SelectItem>
                            <SelectItem value="Boleto" className={formSelectItemClass}>
                              Boleto
                            </SelectItem>
                            <SelectItem value="Outro" className={formSelectItemClass}>
                              Outro
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="status-recebimento"
                          className="text-gray-700 dark:text-slate-300"
                        >
                          Status *
                        </Label>
                        <Select
                          value={novaReceita.statusRecebimento}
                          onValueChange={(value: "recebido" | "pendente") =>
                            setNovaReceita({
                              ...novaReceita,
                              statusRecebimento: value,
                            })
                          }
                        >
                          <SelectTrigger
                            id="status-recebimento"
                            className={formSelectTriggerClass}
                          >
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className={formSelectContentClass}>
                            <SelectItem
                              value="recebido"
                              className={formSelectItemClass}
                            >
                              Recebido
                            </SelectItem>
                            <SelectItem
                              value="pendente"
                              className={formSelectItemClass}
                            >
                              Pendente
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="conta-recebimento"
                          className="text-gray-700 dark:text-slate-300"
                        >
                          Conta da carteira
                        </Label>
                        <Select
                          value={novaReceita.contaId || "none"}
                          onValueChange={(value) =>
                            setNovaReceita({
                              ...novaReceita,
                              contaId: value === "none" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger
                            id="conta-recebimento"
                            className={formSelectTriggerClass}
                          >
                            <SelectValue placeholder="Sem conta vinculada" />
                          </SelectTrigger>
                          <SelectContent className={formSelectContentClass}>
                            <SelectItem value="none" className={formSelectItemClass}>
                              Sem conta vinculada
                            </SelectItem>
                            {accounts.map((account) => (
                              <SelectItem
                                key={account.id}
                                value={account.id}
                                className={formSelectItemClass}
                              >
                                {account.name} ({account.bank_name})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="data"
                          className="text-gray-700 dark:text-slate-300"
                        >
                          {novaReceita.recorrente ? "Data de início *" : "Data *"}
                        </Label>
                        <Input
                          id="data"
                          type="date"
                          className={formInputClass}
                          value={novaReceita.data}
                          onChange={(e) =>
                            setNovaReceita({
                              ...novaReceita,
                              data: e.target.value,
                              diaRecorrencia: novaReceita.recorrente
                                ? obterDiaDaData(e.target.value)
                                : novaReceita.diaRecorrencia,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 md:p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Recorrência
                    </h3>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={novaReceita.recorrente}
                        onChange={(e) =>
                          setNovaReceita({
                            ...novaReceita,
                            recorrente: e.target.checked,
                            diaRecorrencia: e.target.checked
                              ? novaReceita.diaRecorrencia ||
                                obterDiaDaData(novaReceita.data) ||
                                String(new Date().getDate())
                              : "",
                            frequenciaRecorrencia: e.target.checked
                              ? novaReceita.frequenciaRecorrencia
                              : "mensal",
                            dataFimRecorrencia: e.target.checked
                              ? novaReceita.dataFimRecorrencia
                              : "",
                          })
                        }
                        className="text-orange-600"
                      />
                      <span className="text-gray-700 dark:text-slate-300">
                        Receita recorrente
                      </span>
                    </label>

                    {novaReceita.recorrente ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="frequencia-recorrencia"
                            className="text-gray-700 dark:text-slate-300"
                          >
                            Frequência *
                          </Label>
                          <Select
                            value={novaReceita.frequenciaRecorrencia}
                            onValueChange={(
                              value: "mensal" | "quinzenal" | "semanal"
                            ) =>
                              setNovaReceita({
                                ...novaReceita,
                                frequenciaRecorrencia: value,
                              })
                            }
                          >
                            <SelectTrigger
                              id="frequencia-recorrencia"
                              className={formSelectTriggerClass}
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className={formSelectContentClass}>
                              <SelectItem
                                value="mensal"
                                className={formSelectItemClass}
                              >
                                Mensal
                              </SelectItem>
                              <SelectItem
                                value="quinzenal"
                                className={formSelectItemClass}
                              >
                                Quinzenal
                              </SelectItem>
                              <SelectItem
                                value="semanal"
                                className={formSelectItemClass}
                              >
                                Semanal
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {novaReceita.frequenciaRecorrencia === "mensal" && (
                          <div className="space-y-2">
                            <Label
                              htmlFor="dia-recorrencia"
                              className="text-gray-700 dark:text-slate-300"
                            >
                              Dia do mês *
                            </Label>
                            <Input
                              id="dia-recorrencia"
                              type="number"
                              min={1}
                              max={31}
                              className={formInputClass}
                              value={novaReceita.diaRecorrencia}
                              onChange={(e) =>
                                setNovaReceita({
                                  ...novaReceita,
                                  diaRecorrencia: e.target.value,
                                })
                              }
                              placeholder="Ex: 5"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label
                            htmlFor="data-fim-recorrencia"
                            className="text-gray-700 dark:text-slate-300"
                          >
                            Data de término
                          </Label>
                          <Input
                            id="data-fim-recorrencia"
                            type="date"
                            className={formInputClass}
                            value={novaReceita.dataFimRecorrencia}
                            onChange={(e) =>
                              setNovaReceita({
                                ...novaReceita,
                                dataFimRecorrencia: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-slate-300">
                        Ative para gerar lançamentos automaticamente.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-4 sm:space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("lista")}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Receita
                  </Button>
                </div>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Edição */}
        <EditarReceitaModal
          receita={receitaEditando}
          isOpen={modalEditarAberto}
          onClose={() => {
            setModalEditarAberto(false);
            setReceitaEditando(null);
          }}
          onSave={handleSalvarEdicao}
        />
      </div>
    </DashboardLayout>
  );
};

export default Receitas;









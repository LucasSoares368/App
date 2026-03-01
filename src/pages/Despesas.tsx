import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { MonthYearCalendarPicker } from "@/components/MonthYearCalendarPicker";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  DollarSign,
  Edit,
  FileSpreadsheet,
  FileText,
  Filter,
  Undo2,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
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
import { useCards } from "@/hooks/useCards";
import { useDespesas } from "@/hooks/useDespesas";
import { useReceitas } from "@/hooks/useReceitas";
import { EditarDespesaModal } from "@/components/EditarDespesaModal";
import { KpiCard } from "@/components/KpiCard";
import { computeDespesasKpis, resolveDespesasPeriod } from "@/lib/despesas-kpis";
import { buildInstallments } from "@/lib/despesas-installments";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getComputedExpenseStatus,
  getExpenseBaseStatus,
} from "@/lib/expense-status";
import { getComputedStatus } from "@/lib/receita-status";

interface DespesaEdicao {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  tipo: "fixa" | "variavel";
  status: "pago" | "pendente";
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

const Despesas = () => {
  const { toast } = useToast();
  const { categoriasDespesa } = useCategorias();
  const {
    despesas,
    loading,
    createDespesa,
    createDespesasLote,
    updateDespesa,
    deleteDespesa,
  } = useDespesas();
  const { receitas } = useReceitas();
  const { cards } = useCards();

  const [activeTab, setActiveTab] = useState("lista");
  const [modoGrafico, setModoGrafico] = useState<"status" | "tipo">("status");
  const [novaDespesa, setNovaDespesa] = useState({
    descricao: "",
    valor: "",
    categoria: "",
    tipo: "variavel" as "fixa" | "variavel",
    modeloLancamento: "avulsa" as "avulsa" | "recorrente" | "parcelada",
    status: "pendente" as "pago" | "pendente",
    formaPagamento: "",
    cartaoId: "",
    dataVencimento: "",
    dataPagamento: "",
    recorrente: false,
    frequenciaRecorrencia: "mensal" as "mensal" | "quinzenal" | "semanal",
    diaRecorrencia: "",
    dataFimRecorrencia: "",
    totalAmount: "",
    installmentsCount: "",
    firstDueDate: "",
    autoGenerateInstallments: true,
  });

  const [filtro, setFiltro] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [modeloFiltroRapido, setModeloFiltroRapido] = useState<
    "todas" | "parcelada" | "recorrente" | "avulsa"
  >("todas");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarModelosRecorrentes, setMostrarModelosRecorrentes] = useState(false);
  const [mesReferencia, setMesReferencia] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [dataInicioFiltro, setDataInicioFiltro] = useState(
    () => getMonthRange(new Date()).inicio
  );
  const [dataFimFiltro, setDataFimFiltro] = useState(
    () => getMonthRange(new Date()).fim
  );

  const [despesaEditando, setDespesaEditando] = useState<DespesaEdicao | null>(
    null
  );
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [despesasSelecionadas, setDespesasSelecionadas] = useState<string[]>([]);

  const obterTipoDespesa = (despesa: any): "fixa" | "variavel" => {
    const tipoBase = String(despesa?.tipo_despesa || despesa?.tipo || "variavel")
      .toLowerCase()
      .trim();

    return tipoBase === "fixa" ? "fixa" : "variavel";
  };

  const obterTagTipo = (despesa: any) => {
    const tipo = obterTipoDespesa(despesa);

    if (tipo === "fixa") {
      return { label: "Fixa", className: "bg-blue-100 text-blue-800" };
    }

    return { label: "Variável", className: "bg-slate-100 text-slate-800" };
  };

  const obterBadgeStatus = (despesa: any) => {
    const status = getComputedExpenseStatus(despesa);

    if (status === "Pago") {
      return { label: "Pago", className: "bg-emerald-100 text-emerald-800" };
    }

    if (status === "Atrasado") {
      return { label: "Atrasado", className: "bg-red-100 text-red-800" };
    }

    return { label: "Pendente", className: "bg-amber-100 text-amber-800" };
  };

  const obterBadgeCategoria = (despesa: any) => {
    const cor = despesa.categorias?.cor;
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

  const obterRecorrencia = (despesa: any) => {
    return despesa.recorrente || despesa.despesa_pai_id ? "Sim" : "Não";
  };

  const obterModeloLancamento = (despesa: any) => {
    if (despesa.installment_group_id || Number(despesa.installments_total || 0) > 1) {
      return { label: "Parcelada", className: "bg-indigo-100 text-indigo-800" };
    }

    if (despesa.recorrente || despesa.despesa_pai_id) {
      return { label: "Recorrente", className: "bg-emerald-100 text-emerald-800" };
    }

    return { label: "Avulsa", className: "bg-slate-100 text-slate-700" };
  };
  const obterModeloLancamentoKey = (despesa: any): "parcelada" | "recorrente" | "avulsa" => {
    if (despesa.installment_group_id || Number(despesa.installments_total || 0) > 1) {
      return "parcelada";
    }

    if (despesa.recorrente || despesa.despesa_pai_id) {
      return "recorrente";
    }

    return "avulsa";
  };

  const despesasLancadas = useMemo(
    () => despesas.filter((despesa) => !despesa.recorrente),
    [despesas]
  );
  const modelosRecorrentes = useMemo(
    () =>
      despesas
        .filter((despesa) => despesa.recorrente && !despesa.despesa_pai_id)
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [despesas]
  );
  const hojeSemHora = useMemo(() => {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  }, []);
  const modelosRecorrentesAtivos = useMemo(
    () =>
      modelosRecorrentes.filter((modelo) => {
        if (!modelo.data_fim_recorrencia) return true;
        const dataFim = new Date(`${modelo.data_fim_recorrencia}T00:00:00`);
        return dataFim >= hojeSemHora;
      }),
    [modelosRecorrentes, hojeSemHora]
  );
  const modelosRecorrentesPausados = useMemo(
    () =>
      modelosRecorrentes.filter((modelo) => {
        if (!modelo.data_fim_recorrencia) return false;
        const dataFim = new Date(`${modelo.data_fim_recorrencia}T00:00:00`);
        return dataFim < hojeSemHora;
      }),
    [modelosRecorrentes, hojeSemHora]
  );

  const despesasSemPeriodo = useMemo(
    () =>
      despesasLancadas.filter((despesa) => {
        const matchDescricao = despesa.descricao
          .toLowerCase()
          .includes(filtro.toLowerCase());
        const matchCategoria =
          categoriaFiltro === "" || despesa.categorias?.nome === categoriaFiltro;
        const isRecorrente = Boolean(despesa.recorrente || despesa.despesa_pai_id);
        const matchTipo =
          tipoFiltro === ""
            ? true
            : tipoFiltro === "recorrente"
            ? isRecorrente
            : obterTipoDespesa(despesa) === tipoFiltro;
        const matchModeloRapido =
          modeloFiltroRapido === "todas" ||
          obterModeloLancamentoKey(despesa) === modeloFiltroRapido;
        const matchStatus =
          statusFiltro === "" || getComputedExpenseStatus(despesa) === statusFiltro;

        return (
          matchDescricao &&
          matchCategoria &&
          matchTipo &&
          matchModeloRapido &&
          matchStatus
        );
      }),
    [
      despesasLancadas,
      filtro,
      categoriaFiltro,
      tipoFiltro,
      modeloFiltroRapido,
      statusFiltro,
    ]
  );

  const despesasFiltradas = useMemo(
    () =>
      despesasSemPeriodo
        .filter((despesa) => {
          const dataDespesa = despesa.data.split("T")[0];
          const matchDataInicio =
            dataInicioFiltro === "" || dataDespesa >= dataInicioFiltro;
          const matchDataFim = dataFimFiltro === "" || dataDespesa <= dataFimFiltro;

          return matchDataInicio && matchDataFim;
        })
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [despesasSemPeriodo, dataInicioFiltro, dataFimFiltro]
  );

  const periodoAtual = useMemo(
    () =>
      resolveDespesasPeriod({
        dataInicio: dataInicioFiltro || undefined,
        dataFim: dataFimFiltro || undefined,
      }),
    [dataInicioFiltro, dataFimFiltro]
  );

  const receitasRecebidasPeriodo = useMemo(() => {
    return receitas
      .filter((receita) => getComputedStatus(receita) === "recebido")
      .filter((receita) => {
        const dataReceita = new Date(`${receita.data.split("T")[0]}T00:00:00`);
        return (
          dataReceita >= periodoAtual.inicioAtual && dataReceita <= periodoAtual.fimAtual
        );
      })
      .reduce((total, receita) => total + receita.valor, 0);
  }, [receitas, periodoAtual.inicioAtual, periodoAtual.fimAtual]);

  const kpis = useMemo(
    () =>
      computeDespesasKpis(despesasSemPeriodo, {
        dataInicio: dataInicioFiltro || undefined,
        dataFim: dataFimFiltro || undefined,
      }, receitasRecebidasPeriodo, modelosRecorrentesAtivos),
    [
      despesasSemPeriodo,
      dataInicioFiltro,
      dataFimFiltro,
      receitasRecebidasPeriodo,
      modelosRecorrentesAtivos,
    ]
  );

  const variacaoPositiva = kpis.variacaoPercentual >= 0;
  const variacaoVariant =
    kpis.variacaoPercentual === 0
      ? "warning"
      : variacaoPositiva
      ? "danger"
      : "success";

  const variacaoSubtitle =
    kpis.variacaoPercentual === 0
      ? `0% vs ${kpis.isFiltered ? "período anterior" : "mês anterior"}`
      : `${variacaoPositiva ? "+" : ""}${kpis.variacaoPercentual.toFixed(0)}% vs ${
          kpis.isFiltered ? "período anterior" : "mês anterior"
        }`;

  const crescimentoPositivo = kpis.crescimentoPercentual >= 0;
  const GrowthIcon = crescimentoPositivo ? ArrowUp : ArrowDown;
  const crescimentoIconVariant = crescimentoPositivo ? "success" : "danger";
  const crescimentoPercentualTexto = `${crescimentoPositivo ? "+" : ""}${kpis.crescimentoPercentual.toLocaleString(
    "pt-BR",
    { minimumFractionDigits: 1, maximumFractionDigits: 1 }
  )}%`;

  const categorias = categoriasDespesa.map((c) => c.nome);
  const parcelasPreview = useMemo(() => {
    if (novaDespesa.modeloLancamento !== "parcelada") {
      return [];
    }

    if (!novaDespesa.autoGenerateInstallments) {
      return [];
    }

    const totalAmount = Number(novaDespesa.totalAmount);
    const installmentsCount = Number.parseInt(novaDespesa.installmentsCount, 10);

    return buildInstallments({
      totalAmount,
      installmentsCount,
      firstDueDate: novaDespesa.firstDueDate,
    });
  }, [
    novaDespesa.modeloLancamento,
    novaDespesa.autoGenerateInstallments,
    novaDespesa.totalAmount,
    novaDespesa.installmentsCount,
    novaDespesa.firstDueDate,
  ]);

  const adicionarDespesa = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !novaDespesa.descricao ||
      !novaDespesa.categoria ||
      !novaDespesa.formaPagamento
    ) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (novaDespesa.formaPagamento === "Credito" && !novaDespesa.cartaoId) {
      toast({
        title: "Erro",
        description: "Selecione o cartão para pagamento no crédito.",
        variant: "destructive",
      });
      return;
    }

    if (
      novaDespesa.modeloLancamento !== "parcelada" &&
      !novaDespesa.valor
    ) {
      toast({
        title: "Erro",
        description: "Informe o valor da despesa",
        variant: "destructive",
      });
      return;
    }

    if (
      novaDespesa.modeloLancamento !== "parcelada" &&
      !novaDespesa.dataVencimento
    ) {
      toast({
        title: "Erro",
        description: "Informe a data de vencimento",
        variant: "destructive",
      });
      return;
    }

    if (
      novaDespesa.modeloLancamento !== "parcelada" &&
      novaDespesa.status === "pago" &&
      !novaDespesa.dataPagamento
    ) {
      toast({
        title: "Erro",
        description: "Informe a data de pagamento para despesas pagas",
        variant: "destructive",
      });
      return;
    }

    if (
      novaDespesa.modeloLancamento === "recorrente" &&
      !novaDespesa.diaRecorrencia
    ) {
      toast({
        title: "Erro",
        description: "Informe o dia do mês da recorrência",
        variant: "destructive",
      });
      return;
    }

    if (novaDespesa.modeloLancamento === "parcelada") {
      if (!novaDespesa.autoGenerateInstallments) {
        toast({
          title: "Erro",
          description: "Ative a geração automática de parcelas para salvar.",
          variant: "destructive",
        });
        return;
      }

      if (
        !novaDespesa.totalAmount ||
        !novaDespesa.installmentsCount ||
        !novaDespesa.firstDueDate
      ) {
        toast({
          title: "Erro",
          description: "Preencha valor total, quantidade de parcelas e primeiro vencimento.",
          variant: "destructive",
        });
        return;
      }
    }

    const categoria = categoriasDespesa.find(
      (c) => c.nome === novaDespesa.categoria
    );

    if (novaDespesa.modeloLancamento === "parcelada") {
      const totalAmount = Number(novaDespesa.totalAmount);
      const installmentsCount = Number.parseInt(novaDespesa.installmentsCount, 10);
      const parcelas = buildInstallments({
        totalAmount,
        installmentsCount,
        firstDueDate: novaDespesa.firstDueDate,
      });

      if (!parcelas.length) {
        toast({
          title: "Erro",
          description: "Não foi possível gerar as parcelas. Revise os dados.",
          variant: "destructive",
        });
        return;
      }

      const installmentGroupId = crypto.randomUUID();
      await createDespesasLote(
        parcelas.map((parcela) => ({
          descricao: novaDespesa.descricao,
          valor: parcela.value,
          categoria_id: categoria?.id,
          data: parcela.dueDate,
          status_pagamento: "pendente",
          tipo_despesa: novaDespesa.tipo,
          forma_pagamento: novaDespesa.formaPagamento || null,
          cartao_id:
            novaDespesa.formaPagamento === "Credito" ? novaDespesa.cartaoId : null,
          numero_parcelas: null,
          data_primeira_parcela: null,
          data_vencimento: parcela.dueDate,
          data_pagamento: null,
          recorrente: false,
          dia_recorrencia: null,
          frequencia_recorrencia: "mensal",
          data_fim_recorrencia: null,
          despesa_pai_id: null,
          installment_group_id: installmentGroupId,
          installment_index: parcela.installmentIndex,
          installments_total: parcela.installmentsTotal,
        })) as any
      );
    } else {
      const isRecorrente = novaDespesa.modeloLancamento === "recorrente";
      await createDespesa({
        descricao: novaDespesa.descricao,
        valor: parseFloat(novaDespesa.valor),
        categoria_id: categoria?.id,
        data: novaDespesa.dataVencimento,
        status_pagamento: novaDespesa.status,
        tipo_despesa: novaDespesa.tipo,
        forma_pagamento: novaDespesa.formaPagamento || null,
        cartao_id:
          novaDespesa.formaPagamento === "Credito" ? novaDespesa.cartaoId : null,
        numero_parcelas: null,
        data_primeira_parcela: null,
        data_vencimento: novaDespesa.dataVencimento,
        data_pagamento:
          novaDespesa.status === "pago" ? novaDespesa.dataPagamento || null : null,
        recorrente: isRecorrente,
        dia_recorrencia: isRecorrente
          ? parseInt(novaDespesa.diaRecorrencia, 10)
          : null,
        frequencia_recorrencia: isRecorrente
          ? novaDespesa.frequenciaRecorrencia
          : "mensal",
        data_fim_recorrencia:
          isRecorrente && novaDespesa.dataFimRecorrencia
            ? novaDespesa.dataFimRecorrencia
            : null,
        despesa_pai_id: null,
        installment_group_id: null,
        installment_index: null,
        installments_total: null,
      } as any);
    }

    setNovaDespesa({
      descricao: "",
      valor: "",
      categoria: "",
      tipo: "variavel",
      modeloLancamento: "avulsa",
      status: "pendente",
      formaPagamento: "",
      cartaoId: "",
      dataVencimento: "",
      dataPagamento: "",
      recorrente: false,
      frequenciaRecorrencia: "mensal",
      diaRecorrencia: "",
      dataFimRecorrencia: "",
      totalAmount: "",
      installmentsCount: "",
      firstDueDate: "",
      autoGenerateInstallments: true,
    });

    setActiveTab("lista");
  };

  const handleEditarDespesa = (despesa: any) => {
    setDespesaEditando({
      id: despesa.id,
      descricao: despesa.descricao,
      valor: despesa.valor,
      categoria: despesa.categorias?.nome || "",
      data: despesa.data,
      tipo: obterTipoDespesa(despesa),
      status: getExpenseBaseStatus(despesa),
    });
    setModalEditarAberto(true);
  };

  const handleSalvarEdicao = async (despesaAtualizada: DespesaEdicao) => {
    const categoria = categoriasDespesa.find(
      (c) => c.nome === despesaAtualizada.categoria
    );

    await updateDespesa(despesaAtualizada.id, {
      descricao: despesaAtualizada.descricao,
      valor: despesaAtualizada.valor,
      categoria_id: categoria?.id,
      data: despesaAtualizada.data,
      status_pagamento: despesaAtualizada.status,
      tipo_despesa: despesaAtualizada.tipo,
    } as any);
  };

  const handleExcluirDespesa = async (id: string) => {
    await deleteDespesa(id);
  };

  const handleAtualizarStatusRapido = async (
    id: string,
    novoStatus: "pago" | "pendente"
  ) => {
    await updateDespesa(id, {
      status_pagamento: novoStatus,
      data_pagamento: novoStatus === "pago" ? new Date().toISOString().split("T")[0] : null,
    } as any);
  };

  const toggleSelecaoDespesa = (id: string) => {
    setDespesasSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const limparSelecao = () => {
    setDespesasSelecionadas([]);
  };

  const todasFiltradasSelecionadas =
    despesasFiltradas.length > 0 &&
    despesasFiltradas.every((despesa) => despesasSelecionadas.includes(despesa.id));

  const toggleSelecionarTodasFiltradas = () => {
    if (todasFiltradasSelecionadas) {
      const idsFiltrados = new Set(despesasFiltradas.map((d) => d.id));
      setDespesasSelecionadas((prev) => prev.filter((id) => !idsFiltrados.has(id)));
      return;
    }

    setDespesasSelecionadas((prev) => {
      const conjunto = new Set(prev);
      despesasFiltradas.forEach((despesa) => conjunto.add(despesa.id));
      return Array.from(conjunto);
    });
  };

  const executarAcaoEmLote = async (
    acao: "pago" | "pendente" | "excluir"
  ) => {
    if (!despesasSelecionadas.length) return;

    if (acao === "excluir") {
      const confirmou = window.confirm(
        `Deseja excluir ${despesasSelecionadas.length} despesa(s) selecionada(s)?`
      );
      if (!confirmou) return;
    }

    if (acao === "excluir") {
      await Promise.all(despesasSelecionadas.map((id) => deleteDespesa(id)));
    } else {
      await Promise.all(
        despesasSelecionadas.map((id) =>
          updateDespesa(id, {
            status_pagamento: acao,
            data_pagamento:
              acao === "pago" ? new Date().toISOString().split("T")[0] : null,
          } as any)
        )
      );
    }

    limparSelecao();
  };

  const limparFiltros = () => {
    const mesAtual = new Date();
    const rangeMesAtual = getMonthRange(mesAtual);
    setFiltro("");
    setCategoriaFiltro("");
    setTipoFiltro("");
    setStatusFiltro("");
    setModeloFiltroRapido("todas");
    setMesReferencia(new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1));
    setDataInicioFiltro(rangeMesAtual.inicio);
    setDataFimFiltro(rangeMesAtual.fim);
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

  const nomeArquivoBase = `despesas-${new Date().toISOString().split("T")[0]}`;

  const montarLinhasExportacao = () => {
    return despesasFiltradas.map((despesa) => ({
      Descricao: despesa.descricao,
      Categoria: despesa.categorias?.nome || "Sem categoria",
      Tipo: obterTagTipo(despesa).label,
      Modelo: obterModeloLancamento(despesa).label,
      Status: obterBadgeStatus(despesa).label,
      Recorrente: obterRecorrencia(despesa),
      Data: new Date(`${despesa.data.split("T")[0]}T00:00:00`).toLocaleDateString(
        "pt-BR"
      ),
      Valor: Number(despesa.valor || 0),
    }));
  };

  const exportarDespesasXlsx = () => {
    const linhas = montarLinhasExportacao();
    const worksheet = XLSX.utils.json_to_sheet(linhas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Despesas");
    XLSX.writeFile(workbook, `${nomeArquivoBase}.xlsx`);
  };

  const exportarDespesasPdf = () => {
    const linhas = montarLinhasExportacao();
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    doc.setFontSize(12);
    doc.text("Relatorio de Despesas", 40, 32);

    autoTable(doc, {
      startY: 44,
      head: [[
        "Descricao",
        "Categoria",
        "Tipo",
        "Modelo",
        "Status",
        "Recorrente",
        "Data",
        "Valor",
      ]],
      body: linhas.map((item) => [
        item.Descricao,
        item.Categoria,
        item.Tipo,
        item.Modelo,
        item.Status,
        item.Recorrente,
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
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center md:mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 md:text-3xl">Despesas</h1>
            <p className="text-sm text-gray-600 dark:text-slate-300 md:text-base">
              Gerencie seus gastos e despesas
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
                  <MonthYearCalendarPicker
                    value={mesReferencia}
                    onSelect={aplicarMesReferencia}
                  />
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
              onClick={() => setActiveTab("adicionar")}
              className="h-14 w-auto bg-orange-500 px-5 text-sm font-semibold hover:bg-orange-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Registrar Despesa
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:mb-8 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            title={kpis.isFiltered ? "Despesa do período" : "Despesa do mês"}
            value={`R$ ${kpis.despesaPrincipal.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}`}
            subtitle={variacaoSubtitle}
            icon={DollarSign}
            variant={variacaoVariant}
            iconVariant="danger"
          />

          <KpiCard
            title="Média 6 meses"
            value={`R$ ${kpis.mediaMensalUltimos6Meses.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            subtitle="Base: últimos 6 meses"
            icon={TrendingDown}
            variant="neutral"
          />

          <KpiCard
            title="Top categoria"
            value={kpis.maiorCategoria ? kpis.maiorCategoria[0] : "-"}
            subtitle={
              kpis.maiorCategoria
                ? `R$ ${kpis.maiorCategoria[1].toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })} no período`
                : "Sem categoria no período"
            }
            icon={Calendar}
            variant="neutral"
          />

          <KpiCard
            title="Prevista"
            value={`R$ ${kpis.despesaPrevistaRecorrencia.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}`}
            subtitle={`${kpis.previstasRecorrentesNoPeriodo} recorrentes • ${kpis.previstasParceladasNoPeriodo} parceladas • ${kpis.previstasAvulsasNoPeriodo} avulsas`}
            icon={AlertTriangle}
            variant="warning"
          />

          <KpiCard
            title="Crescimento YTD"
            value={crescimentoPercentualTexto}
            subtitle={`${kpis.crescimentoAbsoluto >= 0 ? "+" : ""}R$ ${Math.abs(
              kpis.crescimentoAbsoluto
            ).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })} • Jan → mês atual`}
            icon={GrowthIcon}
            variant="neutral"
            iconVariant={crescimentoIconVariant}
          />

          <KpiCard
            title="Pago"
            value={`R$ ${kpis.totalPagoPeriodo.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}`}
            subtitle="Contas pagas"
            icon={DollarSign}
            variant="success"
          />

          <KpiCard
            title="Pendente"
            value={`R$ ${kpis.totalPendentePeriodo.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}`}
            subtitle="A vencer"
            icon={DollarSign}
            variant="warning"
          />

          <KpiCard
            title="Atrasado"
            value={`R$ ${kpis.totalAtrasadoPeriodo.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}`}
            subtitle="Vencidas"
            icon={AlertTriangle}
            variant="danger"
          />

          <KpiCard
            title="Fixas"
            value={`R$ ${kpis.despesasFixasPeriodo.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}`}
            subtitle={
              kpis.comprometimentoFixasPercentual === null
                ? "—% (sem receitas no período)"
                : `${kpis.comprometimentoFixasPercentual.toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}% da renda (recebida)`
            }
            icon={TrendingUp}
            variant="neutral"
          />

          <KpiCard
            title="Variáveis"
            value={`R$ ${kpis.despesasVariaveisPeriodo.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}`}
            subtitle={
              kpis.comprometimentoVariaveisPercentual === null
                ? "—% (sem receitas no período)"
                : `${kpis.comprometimentoVariaveisPercentual.toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}% da renda (recebida)`
            }
            icon={TrendingDown}
            variant="neutral"
          />
        </div>

        <Card className="mb-6 p-4 md:mb-8 md:p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 md:text-lg">
              Gráfico de despesas por mês
            </h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={modoGrafico === "status" ? "default" : "outline"}
                onClick={() => setModoGrafico("status")}
              >
                Comparar status
              </Button>
              <Button
                size="sm"
                variant={modoGrafico === "tipo" ? "default" : "outline"}
                onClick={() => setModoGrafico("tipo")}
              >
                Comparar tipo
              </Button>
            </div>
          </div>

          <div className="h-72 md:h-80">
            {Array.isArray(kpis.chartData) && kpis.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpis.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" stroke="#6b7280" fontSize={12} />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) =>
                      `R$ ${Number(value || 0).toLocaleString("pt-BR", {
                        maximumFractionDigits: 0,
                      })}`
                    }
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `R$ ${Number(value || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`,
                      String(name || ""),
                    ]}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />

                  {modoGrafico === "status" ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke="#1f2937"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="pago"
                        name="Pago"
                        stroke="#16a34a"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="pendente"
                        name="Pendente"
                        stroke="#d97706"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="atrasado"
                        name="Atrasado"
                        stroke="#dc2626"
                        strokeWidth={2}
                        dot={false}
                      />
                    </>
                  ) : (
                    <>
                      <Line
                        type="monotone"
                        dataKey="fixas"
                        name="Fixas"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="variaveis"
                        name="Variáveis"
                        stroke="#6b7280"
                        strokeWidth={2}
                        dot={false}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-slate-400">
                Sem dados suficientes para exibir o gráfico.
              </div>
            )}
          </div>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 md:space-y-6"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
              <TabsTrigger value="lista" className="text-sm">
                Lista de Despesas
              </TabsTrigger>
              <TabsTrigger value="adicionar" className="text-sm">
                Adicionar Despesa
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="lista" className="space-y-4 md:space-y-6">
            <Card className="p-3 md:p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="mr-1 text-sm font-medium text-gray-600 dark:text-slate-300">Modelo:</p>
                  <Button
                    type="button"
                    size="sm"
                    variant={modeloFiltroRapido === "todas" ? "default" : "outline"}
                    onClick={() => setModeloFiltroRapido("todas")}
                  >
                    Todas
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={modeloFiltroRapido === "parcelada" ? "default" : "outline"}
                    onClick={() => setModeloFiltroRapido("parcelada")}
                  >
                    Parceladas
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={modeloFiltroRapido === "recorrente" ? "default" : "outline"}
                    onClick={() => setModeloFiltroRapido("recorrente")}
                  >
                    Recorrentes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={modeloFiltroRapido === "avulsa" ? "default" : "outline"}
                    onClick={() => setModeloFiltroRapido("avulsa")}
                  >
                    Avulsa
                  </Button>
                  {despesasSelecionadas.length > 0 && (
                    <>
                      <span className="ml-2 mr-1 text-sm font-medium text-gray-900 dark:text-slate-100">
                        {despesasSelecionadas.length} selecionada(s)
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executarAcaoEmLote("pago")}
                      >
                        Marcar pagas
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
                  <Button type="button" size="sm" variant="outline" onClick={exportarDespesasPdf}>
                    <FileText className="mr-2 h-4 w-4" />
                    Baixar PDF
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={exportarDespesasXlsx}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Baixar XLSX
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mostrarFiltros ? "default" : "outline"}
                    onClick={() => setMostrarFiltros((prev) => !prev)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
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

            {mostrarFiltros && (
              <Card className="p-4 md:p-6">
                <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-slate-100 md:text-lg">Filtros</h2>
                <div className="flex flex-col space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar despesas..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="space-y-1">
                      <Label htmlFor="categoria-filtro">Categoria</Label>
                      <select
                        id="categoria-filtro"
                        title="Filtrar por categoria"
                        value={categoriaFiltro}
                        onChange={(e) => setCategoriaFiltro(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                        title="Filtrar por tipo de despesa"
                        value={tipoFiltro}
                        onChange={(e) => setTipoFiltro(e.target.value)}
                        className="w-full rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Todos os tipos</option>
                        <option value="fixa">Fixa</option>
                        <option value="variavel">Variável</option>
                        <option value="recorrente">Recorrente</option>
                      </select>
                    </div>

                  <div className="space-y-1">
                    <Label htmlFor="status-filtro">Status</Label>
                    <select
                      id="status-filtro"
                      title="Filtrar por status da despesa"
                      value={statusFiltro}
                      onChange={(e) => setStatusFiltro(e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Todos os status</option>
                      <option value="Pago">Pago</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Atrasado">Atrasado</option>
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

                  <Button variant="outline" onClick={limparFiltros} className="w-full">
                    <Filter className="mr-2 h-4 w-4" />
                    Limpar Filtros
                  </Button>
                </div>

                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {loading
                      ? "Carregando despesas..."
                      : `${despesasFiltradas.length} despesa(s) encontrada(s)`}
                  </p>
                </div>
              </Card>
            )}
            {mostrarModelosRecorrentes && modelosRecorrentes.length > 0 && (
              <Card className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-slate-100">
                    Modelos recorrentes (não entram como despesa realizada)
                  </h2>
                  <span className="text-xs md:text-sm text-gray-500 dark:text-slate-400">
                    {modelosRecorrentes.length} modelo(s)
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">
                      Ativas ({modelosRecorrentesAtivos.length})
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
                                Ativa
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
                              onClick={() => handleEditarDespesa(modelo)}
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
                                      handleExcluirDespesa(modelo.id)
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
                      Pausadas ({modelosRecorrentesPausados.length})
                    </p>
                    {modelosRecorrentesPausados.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Nenhum modelo pausado.
                      </p>
                    ) : (
                      modelosRecorrentesPausados.map((modelo) => (
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
                                Pausada
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
                              onClick={() => handleEditarDespesa(modelo)}
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
                                      handleExcluirDespesa(modelo.id)
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
              </Card>
            )}

            {mostrarModelosRecorrentes && modelosRecorrentes.length === 0 && (
              <Card className="p-4 md:p-6">
                <h2 className="mb-2 text-base font-bold text-gray-900 dark:text-slate-100 md:text-lg">
                  Modelos recorrentes (não entram como despesa realizada)
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Nenhum modelo recorrente cadastrado.
                </p>
              </Card>
            )}

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
                      <TableHead>Tipo</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recorrente?</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-gray-500 dark:text-slate-400">
                          Carregando despesas...
                        </TableCell>
                      </TableRow>
                    ) : despesasFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-gray-500 dark:text-slate-400">
                          Nenhuma despesa encontrada com os filtros atuais.
                        </TableCell>
                      </TableRow>
                    ) : (
                      despesasFiltradas.map((despesa) => (
                        <TableRow key={despesa.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={despesasSelecionadas.includes(despesa.id)}
                              onChange={() => toggleSelecaoDespesa(despesa.id)}
                              title={`Selecionar ${despesa.descricao}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{despesa.descricao}</TableCell>
                          <TableCell>
                            <span
                              className="inline-flex rounded-full border px-2 py-1 text-xs font-medium"
                              style={obterBadgeCategoria(despesa).style}
                            >
                              {despesa.categorias?.nome || "Sem categoria"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                obterTagTipo(despesa).className
                              }`}
                            >
                              {obterTagTipo(despesa).label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                obterModeloLancamento(despesa).className
                              }`}
                            >
                              {obterModeloLancamento(despesa).label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                obterBadgeStatus(despesa).className
                              }`}
                            >
                              {obterBadgeStatus(despesa).label}
                            </span>
                            <div className="mt-2">
                              {getComputedExpenseStatus(despesa) !== "Pago" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleAtualizarStatusRapido(despesa.id, "pago")
                                  }
                                  className="h-7 text-xs"
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Marcar pago
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleAtualizarStatusRapido(despesa.id, "pendente")
                                  }
                                  className="h-7 text-xs text-gray-600 dark:text-slate-300"
                                >
                                  <Undo2 className="mr-1 h-3 w-3" />
                                  Reabrir
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{obterRecorrencia(despesa)}</TableCell>
                          <TableCell>
                            {new Date(`${despesa.data.split("T")[0]}T00:00:00`).toLocaleDateString(
                              "pt-BR"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-red-600 tabular-nums">
                            R${" "}
                            {despesa.valor.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditarDespesa(despesa)}
                                className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="sm:max-w-[425px]">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir a despesa "
                                      {despesa.descricao}"? Esta ação não pode ser
                                      desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleExcluirDespesa(despesa.id)}
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="space-y-4 md:hidden">
              {loading ? (
                <Card className="p-4">
                  <p className="text-center text-gray-500 dark:text-slate-400">Carregando despesas...</p>
                </Card>
              ) : despesasFiltradas.length === 0 ? (
                <Card className="p-4">
                  <p className="text-center text-gray-500 dark:text-slate-400">Nenhuma despesa encontrada.</p>
                </Card>
              ) : (
                despesasFiltradas.map((despesa) => (
                  <Card key={despesa.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-slate-100">{despesa.descricao}</h3>
                          <span
                            className="mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-medium"
                            style={obterBadgeCategoria(despesa).style}
                          >
                            {despesa.categorias?.nome || "Sem categoria"}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            obterTagTipo(despesa).className
                          }`}
                        >
                          {obterTagTipo(despesa).label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Modelo</p>
                          <span
                            className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                              obterModeloLancamento(despesa).className
                            }`}
                          >
                            {obterModeloLancamento(despesa).label}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Status</p>
                          <div className="space-y-1">
                            <span
                              className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                                obterBadgeStatus(despesa).className
                              }`}
                            >
                              {obterBadgeStatus(despesa).label}
                            </span>
                            {getComputedExpenseStatus(despesa) !== "Pago" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleAtualizarStatusRapido(despesa.id, "pago")
                                }
                                className="h-7 text-xs"
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Pagar
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleAtualizarStatusRapido(despesa.id, "pendente")
                                }
                                className="h-7 text-xs text-gray-600 dark:text-slate-300"
                              >
                                <Undo2 className="mr-1 h-3 w-3" />
                                Reabrir
                              </Button>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Recorrente?</p>
                          <p className="font-medium">{obterRecorrencia(despesa)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Data</p>
                          <p className="font-medium">
                            {new Date(`${despesa.data.split("T")[0]}T00:00:00`).toLocaleDateString(
                              "pt-BR"
                            )}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500 dark:text-slate-400">Valor</p>
                          <p className="font-medium text-red-600 tabular-nums">
                            R${" "}
                            {despesa.valor.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 border-t border-gray-100 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditarDespesa(despesa)}
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="sm:max-w-[425px]">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a despesa "{despesa.descricao}"?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleExcluirDespesa(despesa.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="adicionar">
            <Card className="p-4 md:p-6">
              <form onSubmit={adicionarDespesa} className="space-y-6">
                <div className="space-y-5">
                  <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 md:p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Dados da despesa
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="descricao">Descrição *</Label>
                        <Input
                          id="descricao"
                          placeholder="Ex: Aluguel, Supermercado, Conta de Luz..."
                          value={novaDespesa.descricao}
                          onChange={(e) =>
                            setNovaDespesa({ ...novaDespesa, descricao: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="valor">
                          {novaDespesa.modeloLancamento === "parcelada"
                            ? "Valor da parcela (auto)"
                            : "Valor *"}
                        </Label>
                        <CurrencyInput
                          id="valor"
                          placeholder="0,00"
                          value={novaDespesa.valor}
                          disabled={novaDespesa.modeloLancamento === "parcelada"}
                          onValueChange={(value) =>
                            setNovaDespesa({ ...novaDespesa, valor: value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="categoria">Categoria *</Label>
                        <select
                          id="categoria"
                          title="Selecionar categoria"
                          value={novaDespesa.categoria}
                          onChange={(e) =>
                            setNovaDespesa({ ...novaDespesa, categoria: e.target.value })
                          }
                          className="w-full rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Selecione uma categoria</option>
                          {categoriasDespesa.map((categoria) => (
                            <option key={categoria.id} value={categoria.nome}>
                              {categoria.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Tipo</Label>
                        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="tipo"
                              value="fixa"
                              checked={novaDespesa.tipo === "fixa"}
                              onChange={(e) =>
                                setNovaDespesa({
                                  ...novaDespesa,
                                  tipo: e.target.value as "fixa" | "variavel",
                                })
                              }
                              className="text-orange-600"
                            />
                            <span>Fixa</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="tipo"
                              value="variavel"
                              checked={novaDespesa.tipo === "variavel"}
                              onChange={(e) =>
                                setNovaDespesa({
                                  ...novaDespesa,
                                  tipo: e.target.value as "fixa" | "variavel",
                                })
                              }
                              className="text-orange-600"
                            />
                            <span>Variável</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 md:p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Pagamento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-3">
                        <Label htmlFor="forma-pagamento">Forma de pagamento *</Label>
                        <select
                          id="forma-pagamento"
                          title="Selecionar forma de pagamento"
                          value={novaDespesa.formaPagamento}
                          onChange={(e) =>
                            setNovaDespesa({
                              ...novaDespesa,
                              formaPagamento: e.target.value,
                              cartaoId: e.target.value === "Credito" ? novaDespesa.cartaoId : "",
                            })
                          }
                          className="w-full rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Selecione</option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Pix">PIX</option>
                          <option value="Debito">Débito</option>
                          <option value="Credito">Crédito</option>
                          <option value="Transferencia">Transferência</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>

                      {novaDespesa.formaPagamento === "Credito" && (
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                          <div className="space-y-2">
                            <Label htmlFor="cartao">Selecionar Cartão *</Label>
                            <select
                              id="cartao"
                              title="Selecionar cartão"
                              value={novaDespesa.cartaoId}
                              onChange={(e) =>
                                setNovaDespesa({ ...novaDespesa, cartaoId: e.target.value })
                              }
                              className="w-full rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="">
                                {cards.length === 0
                                  ? "Nenhum cartão cadastrado"
                                  : "Selecione um cartão"}
                              </option>
                              {cards.map((card) => (
                                <option key={card.id} value={card.id}>
                                  {card.name}
                                  {card.issuer_bank ? ` - ${card.issuer_bank}` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 md:p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Modelo de lançamento
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="modelo-lancamento">Modelo *</Label>
                      <select
                        id="modelo-lancamento"
                        title="Selecionar modelo de lançamento"
                        value={novaDespesa.modeloLancamento}
                        onChange={(e) =>
                          setNovaDespesa({
                            ...novaDespesa,
                            modeloLancamento: e.target.value as
                              | "avulsa"
                              | "recorrente"
                              | "parcelada",
                          })
                        }
                        className="w-full rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="avulsa">Avulsa</option>
                        <option value="recorrente">Recorrente</option>
                        <option value="parcelada">Parcelada</option>
                      </select>
                    </div>

                    {novaDespesa.modeloLancamento === "recorrente" && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                        <div className="space-y-2">
                          <Label htmlFor="frequencia-recorrencia">Frequência *</Label>
                          <select
                            id="frequencia-recorrencia"
                            title="Selecionar frequência da recorrência"
                            value={novaDespesa.frequenciaRecorrencia}
                            onChange={(e) =>
                              setNovaDespesa({
                                ...novaDespesa,
                                frequenciaRecorrencia: e.target.value as
                                  | "mensal"
                                  | "quinzenal"
                                  | "semanal",
                              })
                            }
                            className="w-full rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="mensal">Mensal</option>
                            <option value="quinzenal">Quinzenal</option>
                            <option value="semanal">Semanal</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dia-recorrencia">Dia do mês *</Label>
                          <Input
                            id="dia-recorrencia"
                            type="number"
                            min={1}
                            max={31}
                            value={novaDespesa.diaRecorrencia}
                            onChange={(e) =>
                              setNovaDespesa({
                                ...novaDespesa,
                                diaRecorrencia: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="data-fim-recorrencia">Data de término</Label>
                          <Input
                            id="data-fim-recorrencia"
                            type="date"
                            value={novaDespesa.dataFimRecorrencia}
                            onChange={(e) =>
                              setNovaDespesa({
                                ...novaDespesa,
                                dataFimRecorrencia: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}

                    {novaDespesa.modeloLancamento === "parcelada" && (
                      <div className="space-y-4 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="total-amount">Valor total da compra *</Label>
                            <CurrencyInput
                              id="total-amount"
                              value={novaDespesa.totalAmount}
                              onValueChange={(value) =>
                                setNovaDespesa({
                                  ...novaDespesa,
                                  totalAmount: value,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="installments-count">
                              Número de parcelas *
                            </Label>
                            <Input
                              id="installments-count"
                              type="number"
                              min={2}
                              value={novaDespesa.installmentsCount}
                              onChange={(e) =>
                                setNovaDespesa({
                                  ...novaDespesa,
                                  installmentsCount: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="first-due-date">
                              Data do primeiro vencimento *
                            </Label>
                            <Input
                              id="first-due-date"
                              type="date"
                              value={novaDespesa.firstDueDate}
                              onChange={(e) =>
                                setNovaDespesa({
                                  ...novaDespesa,
                                  firstDueDate: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Gerar parcelas automaticamente</Label>
                            <label className="flex items-center space-x-2 rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2">
                              <input
                                type="checkbox"
                                checked={novaDespesa.autoGenerateInstallments}
                                onChange={(e) =>
                                  setNovaDespesa({
                                    ...novaDespesa,
                                    autoGenerateInstallments: e.target.checked,
                                  })
                                }
                                className="text-orange-600"
                              />
                              <span className="text-sm text-gray-700 dark:text-slate-300">
                                Ativado (recomendado)
                              </span>
                            </label>
                          </div>
                        </div>

                        <div className="space-y-2 rounded-md border border-gray-200 dark:border-slate-700 p-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            Preview das parcelas
                          </p>
                          {!novaDespesa.autoGenerateInstallments ? (
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                              Ative a geração automática para visualizar as parcelas.
                            </p>
                          ) : parcelasPreview.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                              Preencha os dados para gerar o preview.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {parcelasPreview.map((parcela) => (
                                <div
                                  key={`${parcela.installmentIndex}-${parcela.dueDate}`}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-700 dark:text-slate-300">
                                    {parcela.installmentIndex}/{parcela.installmentsTotal} -{" "}
                                    {new Date(`${parcela.dueDate}T00:00:00`).toLocaleDateString(
                                      "pt-BR"
                                    )}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-slate-100 tabular-nums">
                                    R${" "}
                                    {parcela.value.toLocaleString("pt-BR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {novaDespesa.modeloLancamento === "avulsa" && (
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Lançamento único para uma despesa sem repetição.
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 md:p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Status e vencimento
                    </h3>
                    {novaDespesa.modeloLancamento === "parcelada" ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        Parceladas são criadas como pendentes automaticamente. O
                        vencimento de cada parcela será mensal a partir da data do
                        primeiro vencimento.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="status">Status *</Label>
                          <select
                            id="status"
                            title="Selecionar status da despesa"
                            value={novaDespesa.status}
                            onChange={(e) =>
                              setNovaDespesa({
                                ...novaDespesa,
                                status: e.target.value as "pago" | "pendente",
                              })
                            }
                            className="w-full rounded-md border border-gray-300 dark:border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="pago">Pago</option>
                            <option value="pendente">Pendente</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="data-vencimento">
                            {novaDespesa.modeloLancamento === "recorrente"
                              ? "Data de início *"
                              : "Data de vencimento *"}
                          </Label>
                          <Input
                            id="data-vencimento"
                            type="date"
                            value={novaDespesa.dataVencimento}
                            onChange={(e) =>
                              setNovaDespesa({
                                ...novaDespesa,
                                dataVencimento: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div
                          className={`space-y-2 ${
                            novaDespesa.status === "pago"
                              ? "animate-in fade-in-50 slide-in-from-top-1 duration-200"
                              : "opacity-60"
                          }`}
                        >
                          <Label htmlFor="data-pagamento">
                            Data de pagamento
                            {novaDespesa.status === "pago" ? " *" : ""}
                          </Label>
                          <Input
                            id="data-pagamento"
                            type="date"
                            value={novaDespesa.dataPagamento}
                            disabled={novaDespesa.status !== "pago"}
                            onChange={(e) =>
                              setNovaDespesa({
                                ...novaDespesa,
                                dataPagamento: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:space-x-4">
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
                    className="w-full bg-orange-500 hover:bg-orange-600 sm:w-auto"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Despesa
                  </Button>
                </div>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        <EditarDespesaModal
          despesa={despesaEditando}
          isOpen={modalEditarAberto}
          onClose={() => {
            setModalEditarAberto(false);
            setDespesaEditando(null);
          }}
          onSave={handleSalvarEdicao}
        />
      </div>
    </DashboardLayout>
  );
};

export default Despesas;

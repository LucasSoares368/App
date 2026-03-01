import { getComputedStatus } from "@/lib/receita-status";

type ReceitaKpiItem = {
  valor: number;
  data: string;
  status_recebimento?: string | null;
  receita_pai_id?: string | null;
  categorias?: { nome?: string | null } | null;
};

type PeriodoFiltro = {
  dataInicio?: string;
  dataFim?: string;
};

type SerieMensalItem = {
  mes: string;
  valorRealizada: number;
  valorPrevista: number;
};

type ComputeReceitasKpisParams = {
  receitasLancadas: ReceitaKpiItem[];
  modelosRecorrentesAtivos: ReceitaKpiItem[];
  period?: PeriodoFiltro;
  referenceDate?: Date;
};

export type ReceitasKpisResult = {
  isFiltered: boolean;
  periodLabel: string;
  receitaPrincipal: number;
  comparativoAnterior: number;
  variacaoPercentual: number;
  mediaMensal: number;
  mediaMensalUltimos6Meses: number;
  melhorCategoria: [string, number] | null;
  receitaPrevistaRecorrente: number;
  recorrenciasAtivasNoPeriodo: number;
  crescimentoPercentual: number;
  crescimentoAbsoluto: number;
  chartData: SerieMensalItem[];
};

const parseDate = (data: string) => new Date(`${data.split("T")[0]}T00:00:00`);

const startOfDay = (data: Date) =>
  new Date(data.getFullYear(), data.getMonth(), data.getDate());

const startOfMonth = (data: Date) => new Date(data.getFullYear(), data.getMonth(), 1);

const addMonths = (data: Date, quantidade: number) =>
  new Date(data.getFullYear(), data.getMonth() + quantidade, 1);

const endOfMonth = (data: Date) => new Date(data.getFullYear(), data.getMonth() + 1, 0);

const monthLabel = (data: Date) =>
  data.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

const formatDateLabel = (data: Date) => data.toLocaleDateString("pt-BR");

const sumValores = (itens: ReceitaKpiItem[]) =>
  itens.reduce((total, item) => total + item.valor, 0);

const calcularVariacaoPercentual = (atual: number, anterior: number) => {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
};

const filtrarPorPeriodo = (
  receitas: ReceitaKpiItem[],
  inicio: Date | null,
  fim: Date | null
) => {
  return receitas.filter((receita) => {
    const data = parseDate(receita.data);
    if (inicio && data < inicio) return false;
    if (fim && data > fim) return false;
    return true;
  });
};

const montarSerieMensal = (
  receitasBase: ReceitaKpiItem[],
  inicioMes: Date,
  fimMes: Date
): SerieMensalItem[] => {
  const serie: SerieMensalItem[] = [];
  let cursor = new Date(inicioMes);

  while (cursor <= fimMes) {
    const inicio = startOfMonth(cursor);
    const fim = endOfMonth(cursor);
    const doMes = receitasBase.filter((receita) => {
      const data = parseDate(receita.data);
      return data >= inicio && data <= fim;
    });

    const valorRealizada = doMes
      .filter((receita) => getComputedStatus(receita) === "recebido")
      .reduce((total, receita) => total + receita.valor, 0);

    const valorPrevista = doMes
      .filter((receita) => getComputedStatus(receita) === "pendente")
      .reduce((total, receita) => total + receita.valor, 0);

    serie.push({
      mes: monthLabel(cursor),
      valorRealizada,
      valorPrevista,
    });

    cursor = addMonths(cursor, 1);
  }

  return serie;
};

export const computeReceitasKpis = ({
  receitasLancadas,
  modelosRecorrentesAtivos,
  period,
  referenceDate = new Date(),
}: ComputeReceitasKpisParams): ReceitasKpisResult => {
  const hoje = startOfDay(referenceDate);
  const mesAtual = referenceDate.getMonth();
  const anoAtual = referenceDate.getFullYear();
  const isFiltered = Boolean(period?.dataInicio || period?.dataFim);

  const inicioFiltro = period?.dataInicio ? parseDate(period.dataInicio) : null;
  const fimFiltro = period?.dataFim ? parseDate(period.dataFim) : null;

  const receitasNoPeriodo = filtrarPorPeriodo(receitasLancadas, inicioFiltro, fimFiltro);
  const totalPeriodo = sumValores(receitasNoPeriodo);

  const inicioComparacao = inicioFiltro ?? parseDate(`${anoAtual}-01-01`);
  const fimComparacao = fimFiltro ?? hoje;

  const inicioAnoAnterior = new Date(
    inicioComparacao.getFullYear() - 1,
    inicioComparacao.getMonth(),
    inicioComparacao.getDate()
  );
  const fimAnoAnterior = new Date(
    fimComparacao.getFullYear() - 1,
    fimComparacao.getMonth(),
    fimComparacao.getDate()
  );
  const receitasMesmoPeriodoAnoAnterior = filtrarPorPeriodo(
    receitasLancadas,
    inicioAnoAnterior,
    fimAnoAnterior
  );
  const totalMesmoPeriodoAnoAnterior = sumValores(receitasMesmoPeriodoAnoAnterior);

  let receitaPrincipal = 0;
  let comparativoAnterior = 0;
  let mediaMensal = 0;
  let mediaMensalUltimos6Meses = 0;
  let melhorCategoria: [string, number] | null = null;
  let receitaPrevistaRecorrente = 0;
  let recorrenciasAtivasNoPeriodo = 0;
  let crescimentoBaseAtual = 0;
  let crescimentoBaseAnterior = 0;
  let periodLabel = "Janeiro até o mês atual";
  let chartData: SerieMensalItem[] = [];
  const receitasRecebidas = receitasLancadas.filter(
    (receita) => getComputedStatus(receita) === "recebido"
  );
  const inicioJanela6Meses = new Date(anoAtual, mesAtual - 5, 1);
  const somaUltimos6Meses = receitasRecebidas
    .filter((receita) => {
      const data = parseDate(receita.data);
      return data >= inicioJanela6Meses && data <= hoje;
    })
    .reduce((total, receita) => total + receita.valor, 0);
  mediaMensalUltimos6Meses = somaUltimos6Meses / 6;

  if (isFiltered) {
    receitaPrincipal = totalPeriodo;
    comparativoAnterior = totalMesmoPeriodoAnoAnterior;

    const inicioMes = startOfMonth(inicioComparacao);
    const fimMes = startOfMonth(fimComparacao);
    const mesesNoIntervalo =
      (fimMes.getFullYear() - inicioMes.getFullYear()) * 12 +
      (fimMes.getMonth() - inicioMes.getMonth()) +
      1;
    mediaMensal = mesesNoIntervalo > 0 ? totalPeriodo / mesesNoIntervalo : 0;

    const totaisCategoria = receitasNoPeriodo.reduce((acc, receita) => {
      const categoria = receita.categorias?.nome || "Sem categoria";
      acc[categoria] = (acc[categoria] || 0) + receita.valor;
      return acc;
    }, {} as Record<string, number>);
    melhorCategoria =
      Object.entries(totaisCategoria).sort((a, b) => b[1] - a[1])[0] || null;

    const previstasRecorrentesNoPeriodo = receitasNoPeriodo.filter(
      (receita) =>
        Boolean(receita.receita_pai_id) && getComputedStatus(receita) === "pendente"
    );
    receitaPrevistaRecorrente = sumValores(previstasRecorrentesNoPeriodo);
    recorrenciasAtivasNoPeriodo = new Set(
      previstasRecorrentesNoPeriodo
        .map((receita) => receita.receita_pai_id)
        .filter(Boolean)
    ).size;

    crescimentoBaseAtual = totalPeriodo;
    crescimentoBaseAnterior = totalMesmoPeriodoAnoAnterior;
    periodLabel = `${formatDateLabel(inicioComparacao)} a ${formatDateLabel(
      fimComparacao
    )}`;

    chartData = montarSerieMensal(receitasNoPeriodo, inicioMes, fimMes);
  } else {
    const chaveMesAtual = `${anoAtual}-${String(mesAtual + 1).padStart(2, "0")}`;
    const dataMesAnterior = new Date(anoAtual, mesAtual - 1, 1);
    const chaveMesAnterior = `${dataMesAnterior.getFullYear()}-${String(
      dataMesAnterior.getMonth() + 1
    ).padStart(2, "0")}`;
    const chaveMesReceita = (data: string) => data.split("T")[0].slice(0, 7);

    const receitaMesAtual = receitasRecebidas
      .filter((receita) => chaveMesReceita(receita.data) === chaveMesAtual)
      .reduce((total, receita) => total + receita.valor, 0);
    const receitaMesAnterior = receitasRecebidas
      .filter((receita) => chaveMesReceita(receita.data) === chaveMesAnterior)
      .reduce((total, receita) => total + receita.valor, 0);

    receitaPrincipal = receitaMesAtual;
    comparativoAnterior = receitaMesAnterior;

    mediaMensal = mediaMensalUltimos6Meses;

    const receitasDoMesAtual = receitasRecebidas.filter((receita) => {
      const data = parseDate(receita.data);
      return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    });
    const totaisCategoria = receitasDoMesAtual.reduce((acc, receita) => {
      const categoria = receita.categorias?.nome || "Sem categoria";
      acc[categoria] = (acc[categoria] || 0) + receita.valor;
      return acc;
    }, {} as Record<string, number>);
    melhorCategoria =
      Object.entries(totaisCategoria).sort((a, b) => b[1] - a[1])[0] || null;

    receitaPrevistaRecorrente = modelosRecorrentesAtivos.reduce(
      (total, modelo) => total + modelo.valor,
      0
    );
    recorrenciasAtivasNoPeriodo = modelosRecorrentesAtivos.length;

    const inicioAnoAtual = new Date(anoAtual, 0, 1);
    const inicioAnoAnteriorBase = new Date(anoAtual - 1, 0, 1);
    const fimMesmoPeriodoAnoAnteriorBase = new Date(
      anoAtual - 1,
      referenceDate.getMonth(),
      referenceDate.getDate()
    );

    const receitaAcumuladaAnoAtual = filtrarPorPeriodo(
      receitasRecebidas,
      inicioAnoAtual,
      hoje
    );
    const receitaAcumuladaAnoAnterior = filtrarPorPeriodo(
      receitasRecebidas,
      inicioAnoAnteriorBase,
      fimMesmoPeriodoAnoAnteriorBase
    );

    crescimentoBaseAtual = sumValores(receitaAcumuladaAnoAtual);
    crescimentoBaseAnterior = sumValores(receitaAcumuladaAnoAnterior);

    const inicioSerie = startOfMonth(new Date(anoAtual, mesAtual - 11, 1));
    const fimSerie = startOfMonth(new Date(anoAtual, mesAtual, 1));
    chartData = montarSerieMensal(receitasLancadas, inicioSerie, fimSerie);
  }

  const variacaoPercentual = calcularVariacaoPercentual(
    receitaPrincipal,
    comparativoAnterior
  );
  const crescimentoPercentual = calcularVariacaoPercentual(
    crescimentoBaseAtual,
    crescimentoBaseAnterior
  );
  const crescimentoAbsoluto = crescimentoBaseAtual - crescimentoBaseAnterior;

  return {
    isFiltered,
    periodLabel,
    receitaPrincipal,
    comparativoAnterior,
    variacaoPercentual,
    mediaMensal,
    mediaMensalUltimos6Meses,
    melhorCategoria,
    receitaPrevistaRecorrente,
    recorrenciasAtivasNoPeriodo,
    crescimentoPercentual,
    crescimentoAbsoluto,
    chartData,
  };
};

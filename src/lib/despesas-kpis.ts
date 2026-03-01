import { getComputedExpenseStatus } from "@/lib/expense-status";

export type DespesaKpiItem = {
  id?: string;
  valor: number;
  data: string;
  status?: string | null;
  status_pagamento?: string | null;
  categorias?: { nome?: string | null } | null;
  tipo?: string | null;
  tipo_despesa?: string | null;
  recorrente?: boolean | null;
  despesa_pai_id?: string | null;
  data_fim_recorrencia?: string | null;
  installment_group_id?: string | null;
  installments_total?: number | null;
};

export type PeriodoFiltro = {
  dataInicio?: string;
  dataFim?: string;
};

export type DespesasKpisResult = {
  isFiltered: boolean;
  periodLabel: string;
  despesaPrincipal: number;
  comparativoAnterior: number;
  variacaoPercentual: number;
  mediaMensalUltimos6Meses: number;
  maiorCategoria: [string, number] | null;
  despesaPrevistaRecorrencia: number;
  recorrenciasAtivasNoPeriodo: number;
  previstasRecorrentesNoPeriodo: number;
  previstasParceladasNoPeriodo: number;
  previstasAvulsasNoPeriodo: number;
  crescimentoPercentual: number;
  crescimentoAbsoluto: number;
  totalPagoPeriodo: number;
  totalPendentePeriodo: number;
  totalAtrasadoPeriodo: number;
  despesasFixasPeriodo: number;
  despesasVariaveisPeriodo: number;
  comprometimentoFixasPercentual: number | null;
  comprometimentoVariaveisPercentual: number | null;
  chartData: Array<{
    mes: string;
    total: number;
    pago: number;
    pendente: number;
    atrasado: number;
    fixas: number;
    variaveis: number;
  }>;
};

const parseDate = (data: string) => new Date(`${data.split("T")[0]}T00:00:00`);

const startOfDay = (data: Date) =>
  new Date(data.getFullYear(), data.getMonth(), data.getDate());

const endOfDay = (data: Date) =>
  new Date(data.getFullYear(), data.getMonth(), data.getDate(), 23, 59, 59, 999);

const startOfMonth = (data: Date) => new Date(data.getFullYear(), data.getMonth(), 1);

const addDays = (data: Date, dias: number) => {
  const result = new Date(data);
  result.setDate(result.getDate() + dias);
  return result;
};

const addMonths = (data: Date, quantidade: number) =>
  new Date(data.getFullYear(), data.getMonth() + quantidade, 1);

const endOfMonth = (data: Date) =>
  new Date(data.getFullYear(), data.getMonth() + 1, 0);

const monthLabel = (data: Date) =>
  data.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

const formatDateLabel = (data: Date) => data.toLocaleDateString("pt-BR");

const sumValores = (itens: DespesaKpiItem[]) =>
  itens.reduce((total, item) => total + item.valor, 0);

const calcularVariacaoPercentual = (atual: number, anterior: number) => {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
};

const filtrarPorPeriodo = (
  despesas: DespesaKpiItem[],
  inicio: Date,
  fim: Date
): DespesaKpiItem[] => {
  return despesas.filter((despesa) => {
    const data = parseDate(despesa.data);
    return data >= inicio && data <= fim;
  });
};

const diferencaDiasInclusiva = (inicio: Date, fim: Date) => {
  const msPorDia = 24 * 60 * 60 * 1000;
  return (
    Math.floor((endOfDay(fim).getTime() - startOfDay(inicio).getTime()) / msPorDia) +
    1
  );
};

const normalizarTipo = (despesa: DespesaKpiItem) => {
  const tipo = String(despesa.tipo_despesa || despesa.tipo || "variavel")
    .toLowerCase()
    .trim();
  return tipo === "fixa" ? "fixa" : "variavel";
};

const obterModeloLancamento = (despesa: DespesaKpiItem) => {
  if (despesa.installment_group_id || Number(despesa.installments_total || 0) > 1) {
    return "parcelada" as const;
  }

  if (despesa.recorrente || despesa.despesa_pai_id) {
    return "recorrente" as const;
  }

  return "avulsa" as const;
};

const montarSerieMensal = (
  despesasBase: DespesaKpiItem[],
  inicioMes: Date,
  fimMes: Date,
  referenceDate: Date
) => {
  const serie: Array<{
    mes: string;
    total: number;
    pago: number;
    pendente: number;
    atrasado: number;
    fixas: number;
    variaveis: number;
  }> = [];

  let cursor = new Date(inicioMes);
  while (cursor <= fimMes) {
    const inicio = startOfMonth(cursor);
    const fim = endOfMonth(cursor);
    const despesasDoMes = filtrarPorPeriodo(despesasBase, inicio, fim);

    const total = sumValores(despesasDoMes);
    const pago = despesasDoMes
      .filter((despesa) => getComputedExpenseStatus(despesa, referenceDate) === "Pago")
      .reduce((acc, item) => acc + item.valor, 0);
    const pendente = despesasDoMes
      .filter((despesa) => getComputedExpenseStatus(despesa, referenceDate) === "Pendente")
      .reduce((acc, item) => acc + item.valor, 0);
    const atrasado = despesasDoMes
      .filter((despesa) => getComputedExpenseStatus(despesa, referenceDate) === "Atrasado")
      .reduce((acc, item) => acc + item.valor, 0);
    const fixas = despesasDoMes
      .filter((despesa) => normalizarTipo(despesa) === "fixa")
      .reduce((acc, item) => acc + item.valor, 0);
    const variaveis = despesasDoMes
      .filter((despesa) => normalizarTipo(despesa) === "variavel")
      .reduce((acc, item) => acc + item.valor, 0);

    serie.push({
      mes: monthLabel(cursor),
      total,
      pago,
      pendente,
      atrasado,
      fixas,
      variaveis,
    });

    cursor = addMonths(cursor, 1);
  }

  return serie;
};

export const resolveDespesasPeriod = (
  period?: PeriodoFiltro,
  referenceDate = new Date()
) => {
  const hoje = startOfDay(referenceDate);
  const isFiltered = Boolean(period?.dataInicio || period?.dataFim);

  const fimEscolhido = period?.dataFim ? parseDate(period.dataFim) : hoje;
  const inicioEscolhido = period?.dataInicio
    ? parseDate(period.dataInicio)
    : isFiltered
    ? startOfMonth(fimEscolhido)
    : startOfMonth(referenceDate);

  const inicioAtual =
    startOfDay(inicioEscolhido) <= startOfDay(fimEscolhido)
      ? startOfDay(inicioEscolhido)
      : startOfDay(fimEscolhido);
  const fimAtual =
    startOfDay(inicioEscolhido) <= startOfDay(fimEscolhido)
      ? startOfDay(fimEscolhido)
      : startOfDay(inicioEscolhido);

  return { isFiltered, inicioAtual, fimAtual };
};

export const computeDespesasKpis = (
  despesasFiltradas: DespesaKpiItem[],
  period?: PeriodoFiltro,
  receitasRecebidasPeriodo = 0,
  modelosRecorrentesAtivos: DespesaKpiItem[] = [],
  referenceDate = new Date()
): DespesasKpisResult => {
  const { isFiltered, inicioAtual, fimAtual } = resolveDespesasPeriod(
    period,
    referenceDate
  );

  const despesasPeriodo = filtrarPorPeriodo(despesasFiltradas, inicioAtual, fimAtual);
  const despesaPrincipal = sumValores(despesasPeriodo);

  const diasIntervalo = diferencaDiasInclusiva(inicioAtual, fimAtual);
  const fimPeriodoAnterior = addDays(inicioAtual, -1);
  const inicioPeriodoAnterior = addDays(fimPeriodoAnterior, -(diasIntervalo - 1));

  const despesasPeriodoAnterior = filtrarPorPeriodo(
    despesasFiltradas,
    inicioPeriodoAnterior,
    fimPeriodoAnterior
  );
  const comparativoAnterior = sumValores(despesasPeriodoAnterior);
  const variacaoPercentual = calcularVariacaoPercentual(
    despesaPrincipal,
    comparativoAnterior
  );

  const inicioJanela6Meses = startOfMonth(addMonths(fimAtual, -5));
  const despesasUltimos6Meses = filtrarPorPeriodo(
    despesasFiltradas,
    inicioJanela6Meses,
    fimAtual
  );
  const mediaMensalUltimos6Meses = sumValores(despesasUltimos6Meses) / 6;

  const totaisCategoria = despesasPeriodo.reduce((acc, despesa) => {
    const categoria = despesa.categorias?.nome || "Sem categoria";
    acc[categoria] = (acc[categoria] || 0) + despesa.valor;
    return acc;
  }, {} as Record<string, number>);

  const maiorCategoria =
    Object.entries(totaisCategoria).sort((a, b) => b[1] - a[1])[0] || null;

  const despesasFixas = despesasPeriodo.filter(
    (despesa) => normalizarTipo(despesa) === "fixa"
  );
  const despesasVariaveis = despesasPeriodo.filter(
    (despesa) => normalizarTipo(despesa) === "variavel"
  );

  const hoje = startOfDay(referenceDate);
  const inicioPrevisao = addDays(hoje, 1);
  const fimPrevisao = isFiltered ? fimAtual : endOfMonth(fimAtual);

  const despesasPrevistasNoPeriodo =
    fimPrevisao < inicioPrevisao
      ? []
      : despesasFiltradas.filter((despesa) => {
          const dataDespesa = parseDate(despesa.data);
          return dataDespesa >= inicioPrevisao && dataDespesa <= fimPrevisao;
        });

  const modelosRecorrentesNoPeriodo =
    fimPrevisao < inicioPrevisao
      ? []
      : modelosRecorrentesAtivos.filter((modelo) => {
          const inicioModelo = parseDate(modelo.data);
          const fimModelo = modelo.data_fim_recorrencia
            ? parseDate(modelo.data_fim_recorrencia)
            : null;
          if (inicioModelo > fimPrevisao) return false;
          if (fimModelo && fimModelo < inicioPrevisao) return false;
          return true;
        });

  const despesasPrevistasNaoRecorrentes = despesasPrevistasNoPeriodo.filter(
    (despesa) => obterModeloLancamento(despesa) !== "recorrente"
  );

  const previstasParceladasNoPeriodo = despesasPrevistasNaoRecorrentes.filter(
    (despesa) => obterModeloLancamento(despesa) === "parcelada"
  ).length;
  const previstasAvulsasNoPeriodo = despesasPrevistasNaoRecorrentes.filter(
    (despesa) => obterModeloLancamento(despesa) === "avulsa"
  ).length;

  const previstasRecorrentesNoPeriodo = modelosRecorrentesNoPeriodo.length;
  const despesaPrevistaRecorrencia =
    sumValores(despesasPrevistasNaoRecorrentes) + sumValores(modelosRecorrentesNoPeriodo);
  const recorrenciasAtivasNoPeriodo = modelosRecorrentesNoPeriodo.length;

  const referenciaYtd = endOfDay(fimAtual);
  const inicioAnoAtual = new Date(referenciaYtd.getFullYear(), 0, 1);
  const fimAnoAtual = startOfDay(referenciaYtd);
  const inicioAnoAnterior = new Date(referenciaYtd.getFullYear() - 1, 0, 1);
  const fimAnoAnterior = new Date(
    referenciaYtd.getFullYear() - 1,
    referenciaYtd.getMonth(),
    referenciaYtd.getDate()
  );

  const despesasAnoAtual = filtrarPorPeriodo(
    despesasFiltradas,
    inicioAnoAtual,
    fimAnoAtual
  );
  const despesasAnoAnterior = filtrarPorPeriodo(
    despesasFiltradas,
    inicioAnoAnterior,
    fimAnoAnterior
  );

  const totalAnoAtual = sumValores(despesasAnoAtual);
  const totalAnoAnterior = sumValores(despesasAnoAnterior);
  const crescimentoPercentual = calcularVariacaoPercentual(
    totalAnoAtual,
    totalAnoAnterior
  );
  const crescimentoAbsoluto = totalAnoAtual - totalAnoAnterior;

  const totalPagoPeriodo = despesasPeriodo
    .filter((despesa) => getComputedExpenseStatus(despesa, referenceDate) === "Pago")
    .reduce((total, despesa) => total + despesa.valor, 0);

  const totalPendentePeriodo = despesasPeriodo
    .filter((despesa) => getComputedExpenseStatus(despesa, referenceDate) === "Pendente")
    .reduce((total, despesa) => total + despesa.valor, 0);

  const totalAtrasadoPeriodo = despesasPeriodo
    .filter((despesa) => getComputedExpenseStatus(despesa, referenceDate) === "Atrasado")
    .reduce((total, despesa) => total + despesa.valor, 0);

  const despesasFixasPeriodo = sumValores(despesasFixas);
  const despesasVariaveisPeriodo = sumValores(despesasVariaveis);

  const comprometimentoFixasPercentual =
    receitasRecebidasPeriodo > 0
      ? (despesasFixasPeriodo / receitasRecebidasPeriodo) * 100
      : null;
  const comprometimentoVariaveisPercentual =
    receitasRecebidasPeriodo > 0
      ? (despesasVariaveisPeriodo / receitasRecebidasPeriodo) * 100
      : null;

  const inicioSerie = isFiltered
    ? startOfMonth(inicioAtual)
    : startOfMonth(addMonths(fimAtual, -5));
  const fimSerie = startOfMonth(fimAtual);
  const chartData = montarSerieMensal(
    despesasFiltradas,
    inicioSerie,
    fimSerie,
    referenceDate
  );

  return {
    isFiltered,
    periodLabel: `${formatDateLabel(inicioAtual)} a ${formatDateLabel(fimAtual)}`,
    despesaPrincipal,
    comparativoAnterior,
    variacaoPercentual,
    mediaMensalUltimos6Meses,
    maiorCategoria,
    despesaPrevistaRecorrencia,
    recorrenciasAtivasNoPeriodo,
    previstasRecorrentesNoPeriodo,
    previstasParceladasNoPeriodo,
    previstasAvulsasNoPeriodo,
    crescimentoPercentual,
    crescimentoAbsoluto,
    totalPagoPeriodo,
    totalPendentePeriodo,
    totalAtrasadoPeriodo,
    despesasFixasPeriodo,
    despesasVariaveisPeriodo,
    comprometimentoFixasPercentual,
    comprometimentoVariaveisPercentual,
    chartData,
  };
};

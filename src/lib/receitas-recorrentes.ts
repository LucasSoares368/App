import { supabase } from "@/integrations/supabase/client";

type ReceitaModelo = {
  id: string;
  descricao: string;
  valor: number;
  categoria_id: string | null;
  bank_account_id: string | null;
  forma_pagamento: string | null;
  data: string;
  dia_recorrencia: number | null;
  tipo_receita?: "fixa" | "variavel";
  frequencia_recorrencia?: "mensal" | "quinzenal" | "semanal";
  data_fim_recorrencia?: string | null;
};

const formatarDataISO = (data: Date) => {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(data.getDate()).padStart(2, "0")}`;
};

const criarDataMensal = (ano: number, mes: number, dia: number) => {
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const diaAjustado = Math.min(Math.max(dia, 1), ultimoDia);
  return new Date(ano, mes, diaAjustado);
};

const obterDiaDaData = (dataISO: string) => {
  const partes = dataISO.split("T")[0].split("-");
  if (partes.length !== 3) return 1;
  return Math.min(Math.max(parseInt(partes[2], 10) || 1, 1), 31);
};

const normalizarDataSemHora = (dataISO: string) => {
  return new Date(`${dataISO.split("T")[0]}T00:00:00`);
};

export const gerarReceitasRecorrentesPendentes = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return;
  }

  const { data: modelosComTipo, error: modelosComTipoError } = await supabase
    .from("receitas")
    .select(
      "id, descricao, valor, categoria_id, bank_account_id, forma_pagamento, data, dia_recorrencia, tipo_receita, frequencia_recorrencia, data_fim_recorrencia"
    )
    .eq("recorrente", true)
    .is("receita_pai_id", null);

  let modelos: ReceitaModelo[] | null = null;

  if (!modelosComTipoError) {
    modelos = (modelosComTipo || []) as ReceitaModelo[];
  } else {
    // Fallback para bases sem a coluna tipo_receita.
    const { data: modelosSemTipo, error: modelosSemTipoError } = await supabase
      .from("receitas")
      .select(
        "id, descricao, valor, categoria_id, bank_account_id, forma_pagamento, data, dia_recorrencia, frequencia_recorrencia, data_fim_recorrencia"
      )
      .eq("recorrente", true)
      .is("receita_pai_id", null);

    if (modelosSemTipoError) {
      return;
    }

    modelos = (modelosSemTipo || []) as ReceitaModelo[];
  }

  if (!modelos?.length) {
    return;
  }

  const modelosValidos = modelos.filter((modelo) => {
    const frequencia = modelo.frequencia_recorrencia || "mensal";
    if (frequencia === "mensal") {
      return modelo.dia_recorrencia !== null || Boolean(modelo.data);
    }
    return Boolean(modelo.data);
  });

  if (!modelosValidos.length) {
    return;
  }

  const modelosIds = modelosValidos.map((modelo) => modelo.id);

  const { data: lancamentosExistentes, error: lancamentosError } = await supabase
    .from("receitas")
    .select("receita_pai_id, data")
    .in("receita_pai_id", modelosIds);

  if (lancamentosError) {
    return;
  }

  const jaLancados = new Set(
    (lancamentosExistentes || []).map(
      (item) => `${item.receita_pai_id}|${item.data.split("T")[0]}`
    )
  );

  const hoje = new Date();
  const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const insercoes: Array<{
    user_id: string;
    categoria_id: string | null;
    bank_account_id: string | null;
    forma_pagamento: string | null;
    descricao: string;
    valor: number;
    data: string;
    recorrente: boolean;
    dia_recorrencia: null;
    receita_pai_id: string;
    status_recebimento: "recebido" | "pendente";
    tipo_receita: "fixa" | "variavel";
  }> = [];

  for (const modelo of modelosValidos) {
    const dia = (modelo.dia_recorrencia as number) || obterDiaDaData(modelo.data);
    const inicio = normalizarDataSemHora(modelo.data);
    const frequencia = modelo.frequencia_recorrencia || "mensal";
    const dataFim = modelo.data_fim_recorrencia
      ? normalizarDataSemHora(modelo.data_fim_recorrencia)
      : null;
    const limiteGeracao = dataFim && dataFim < fimMesAtual ? dataFim : fimMesAtual;
    const dataInicioISO = formatarDataISO(inicio);
    const chaveInicio = `${modelo.id}|${dataInicioISO}`;

    // Garante o lançamento da data de início do modelo (backfill inicial).
    if (!jaLancados.has(chaveInicio)) {
      insercoes.push({
        user_id: user.id,
        categoria_id: modelo.categoria_id,
        bank_account_id: modelo.bank_account_id,
        forma_pagamento: modelo.forma_pagamento || null,
        descricao: modelo.descricao,
        valor: modelo.valor,
        data: dataInicioISO,
        recorrente: false,
        dia_recorrencia: null,
        receita_pai_id: modelo.id,
        status_recebimento: "pendente",
        tipo_receita: modelo.tipo_receita || "variavel",
      });
      jaLancados.add(chaveInicio);
    }

    let cursor = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);

    if (frequencia === "mensal") {
      while (cursor <= limiteGeracao) {
        const dataLancamento = criarDataMensal(
          cursor.getFullYear(),
          cursor.getMonth(),
          dia
        );

        if (dataLancamento < inicio) {
          cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
          continue;
        }

        if (dataFim && dataLancamento > dataFim) {
          break;
        }

        const dataISO = formatarDataISO(dataLancamento);
        const chave = `${modelo.id}|${dataISO}`;

        if (!jaLancados.has(chave)) {
          insercoes.push({
            user_id: user.id,
            categoria_id: modelo.categoria_id,
            bank_account_id: modelo.bank_account_id,
            forma_pagamento: modelo.forma_pagamento || null,
            descricao: modelo.descricao,
            valor: modelo.valor,
            data: dataISO,
            recorrente: false,
            dia_recorrencia: null,
            receita_pai_id: modelo.id,
            status_recebimento: "pendente",
            tipo_receita: modelo.tipo_receita || "variavel",
          });
          jaLancados.add(chave);
        }

        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    } else {
      const intervaloDias = frequencia === "quinzenal" ? 15 : 7;
      let dataCursor = new Date(inicio);

      while (dataCursor <= limiteGeracao) {
        if (dataFim && dataCursor > dataFim) break;

        const dataISO = formatarDataISO(dataCursor);
        const chave = `${modelo.id}|${dataISO}`;

        if (!jaLancados.has(chave)) {
          insercoes.push({
            user_id: user.id,
            categoria_id: modelo.categoria_id,
            bank_account_id: modelo.bank_account_id,
            forma_pagamento: modelo.forma_pagamento || null,
            descricao: modelo.descricao,
            valor: modelo.valor,
            data: dataISO,
            recorrente: false,
            dia_recorrencia: null,
            receita_pai_id: modelo.id,
            status_recebimento: "pendente",
            tipo_receita: modelo.tipo_receita || "variavel",
          });
          jaLancados.add(chave);
        }

        dataCursor = new Date(
          dataCursor.getFullYear(),
          dataCursor.getMonth(),
          dataCursor.getDate() + intervaloDias
        );
      }
    }
  }

  if (!insercoes.length) {
    return;
  }

  const { error: upsertError } = await supabase
    .from("receitas")
    .upsert(insercoes, { onConflict: "receita_pai_id,data", ignoreDuplicates: true });

  // Fallback para bancos sem índice único aplicado e/ou sem coluna tipo_receita.
  if (upsertError) {
    const insercoesSemTipo = insercoes.map(({ tipo_receita, ...rest }) => rest);
    await supabase.from("receitas").insert(insercoesSemTipo);
  }
};

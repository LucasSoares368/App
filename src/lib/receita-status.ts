export type ReceitaStatusPersistido = "recebido" | "pendente";
export type ReceitaStatusComputado = ReceitaStatusPersistido | "atrasado";

type ReceitaComStatus = {
  data: string;
  status_recebimento?: string | null;
};

const normalizarDataSemHora = (data: string) => {
  return new Date(`${data.split("T")[0]}T00:00:00`);
};

const obterHojeSemHora = (referencia = new Date()) => {
  return new Date(
    referencia.getFullYear(),
    referencia.getMonth(),
    referencia.getDate()
  );
};

export const getComputedStatus = (
  receita: ReceitaComStatus,
  referencia = new Date()
): ReceitaStatusComputado => {
  const statusBase: ReceitaStatusPersistido =
    receita.status_recebimento === "pendente" ? "pendente" : "recebido";

  if (statusBase === "recebido") return "recebido";

  const dataReceita = normalizarDataSemHora(receita.data);
  const hojeSemHora = obterHojeSemHora(referencia);

  if (dataReceita < hojeSemHora) return "atrasado";

  return "pendente";
};

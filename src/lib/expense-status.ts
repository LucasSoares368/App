export type ExpenseBaseStatus = "pago" | "pendente";
export type ExpenseComputedStatus = "Pago" | "Pendente" | "Atrasado";

type ExpenseLike = {
  data?: string | null;
  vencimento?: string | null;
  status?: string | null;
  status_pagamento?: string | null;
};

const toLocalStartOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const parseLocalDate = (raw?: string | null) => {
  if (!raw) return null;
  const dateOnly = raw.split("T")[0];
  const [year, month, day] = dateOnly.split("-").map((item) => Number(item));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export const getExpenseBaseStatus = (expense: ExpenseLike): ExpenseBaseStatus => {
  const raw = String(expense.status_pagamento || expense.status || "pendente")
    .toLowerCase()
    .trim();

  if (["pago", "paid", "recebido", "quitado"].includes(raw)) return "pago";
  return "pendente";
};

export const getComputedExpenseStatus = (
  expense: ExpenseLike,
  referenceDate = new Date()
): ExpenseComputedStatus => {
  const baseStatus = getExpenseBaseStatus(expense);
  if (baseStatus === "pago") return "Pago";

  const hoje = toLocalStartOfDay(referenceDate);
  const vencimento = parseLocalDate(expense.vencimento || expense.data);

  if (vencimento && vencimento < hoje) return "Atrasado";
  return "Pendente";
};


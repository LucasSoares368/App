export interface InstallmentItem {
  installmentIndex: number;
  installmentsTotal: number;
  dueDate: string;
  value: number;
}

interface BuildInstallmentsParams {
  totalAmount: number;
  installmentsCount: number;
  firstDueDate: string;
}

const parseDateOnly = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const formatDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addMonthsKeepingDay = (date: Date, monthsToAdd: number) => {
  const targetYear = date.getFullYear();
  const targetMonth = date.getMonth() + monthsToAdd;
  const originalDay = date.getDate();
  const endOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(originalDay, endOfMonth);
  return new Date(targetYear, targetMonth, targetDay);
};

export const buildInstallments = ({
  totalAmount,
  installmentsCount,
  firstDueDate,
}: BuildInstallmentsParams): InstallmentItem[] => {
  if (!totalAmount || totalAmount <= 0 || !installmentsCount || installmentsCount <= 0) {
    return [];
  }

  if (!firstDueDate) {
    return [];
  }

  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / installmentsCount);
  const lastCents = totalCents - baseCents * (installmentsCount - 1);
  const firstDate = parseDateOnly(firstDueDate);

  return Array.from({ length: installmentsCount }, (_, index) => {
    const dueDate = addMonthsKeepingDay(firstDate, index);
    const cents = index === installmentsCount - 1 ? lastCents : baseCents;

    return {
      installmentIndex: index + 1,
      installmentsTotal: installmentsCount,
      dueDate: formatDateOnly(dueDate),
      value: cents / 100,
    };
  });
};

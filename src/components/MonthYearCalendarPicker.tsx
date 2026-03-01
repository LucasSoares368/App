import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type MonthYearCalendarPickerProps = {
  value: Date;
  onSelect: (date: Date) => void;
  minYear?: number;
  maxYear?: number;
};

const monthLabels = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

const YEARS_PER_PAGE = 12;

export function MonthYearCalendarPicker({
  value,
  onSelect,
  minYear = 2000,
  maxYear = Math.max(2030, new Date().getFullYear() + 10),
}: MonthYearCalendarPickerProps) {
  const [viewMode, setViewMode] = useState<"months" | "years">("months");
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [yearsPageStart, setYearsPageStart] = useState(() => {
    const offset = Math.floor((value.getFullYear() - minYear) / YEARS_PER_PAGE);
    return minYear + Math.max(offset, 0) * YEARS_PER_PAGE;
  });

  useEffect(() => {
    setViewYear(value.getFullYear());
    const offset = Math.floor((value.getFullYear() - minYear) / YEARS_PER_PAGE);
    setYearsPageStart(minYear + Math.max(offset, 0) * YEARS_PER_PAGE);
  }, [value, minYear]);

  useEffect(() => {
    setViewMode("months");
  }, [value]);

  const canPrevYear = viewYear > minYear;
  const canNextYear = viewYear < maxYear;
  const canPrevYearPage = yearsPageStart > minYear;
  const canNextYearPage = yearsPageStart + YEARS_PER_PAGE <= maxYear;

  const selectedMonth = useMemo(() => {
    return value.getFullYear() === viewYear ? value.getMonth() : -1;
  }, [value, viewYear]);

  const yearsInPage = useMemo(() => {
    const items: number[] = [];
    for (
      let year = yearsPageStart;
      year < yearsPageStart + YEARS_PER_PAGE && year <= maxYear;
      year += 1
    ) {
      items.push(year);
    }
    return items;
  }, [yearsPageStart, maxYear]);

  const yearsPageLabel = useMemo(() => {
    const firstYear = yearsPageStart;
    const lastYear = Math.min(yearsPageStart + YEARS_PER_PAGE - 1, maxYear);
    return `${firstYear}-${lastYear}`;
  }, [yearsPageStart, maxYear]);

  const changeYear = (direction: -1 | 1) => {
    const nextYear = viewYear + direction;
    if (nextYear < minYear || nextYear > maxYear) return;
    setViewYear(nextYear);
  };

  const changeYearsPage = (direction: -1 | 1) => {
    const nextStart = yearsPageStart + direction * YEARS_PER_PAGE;
    if (nextStart < minYear || nextStart > maxYear) return;
    setYearsPageStart(nextStart);
  };

  const handleMonthClick = (monthIndex: number) => {
    const selectedDate = new Date(viewYear, monthIndex, 1);
    onSelect(selectedDate);
  };

  const handleYearClick = (year: number) => {
    setViewYear(year);
    setViewMode("months");
  };

  return (
    <div className="w-[320px] overflow-hidden rounded-md border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="bg-orange-500 px-4 py-4 text-white">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <button
            type="button"
            onClick={() =>
              viewMode === "years" ? changeYearsPage(-1) : changeYear(-1)
            }
            disabled={viewMode === "years" ? !canPrevYearPage : !canPrevYear}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={viewMode === "years" ? "Anos anteriores" : "Ano anterior"}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setViewMode((prev) => (prev === "months" ? "years" : "months"))
            }
            className="mx-auto rounded-md px-2 py-1 text-center text-3xl font-extrabold leading-none transition hover:bg-white/15"
            aria-label="Selecionar ano"
          >
            {viewMode === "years" ? yearsPageLabel : viewYear}
          </button>
          <button
            type="button"
            onClick={() =>
              viewMode === "years" ? changeYearsPage(1) : changeYear(1)
            }
            disabled={viewMode === "years" ? !canNextYearPage : !canNextYear}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={viewMode === "years" ? "Próximos anos" : "Próximo ano"}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {viewMode === "months" ? (
        <div className="grid grid-cols-3 gap-2 p-3">
          {monthLabels.map((label, monthIndex) => {
            const isSelected = selectedMonth === monthIndex;
            return (
              <button
                key={label}
                type="button"
                onClick={() => handleMonthClick(monthIndex)}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-orange-400/60 dark:hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 p-3">
          {yearsInPage.map((year) => {
            const isSelected = year === viewYear;
            return (
              <button
                key={year}
                type="button"
                onClick={() => handleYearClick(year)}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-orange-400/60 dark:hover:bg-slate-800"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

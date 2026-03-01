import * as React from "react";
import { cn } from "@/lib/utils";

const formatBrl = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const normalizeToNumber = (value: string | number | undefined) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const asNumber = Number(String(value).replace(",", "."));
  return Number.isFinite(asNumber) ? asNumber : null;
};

interface CurrencyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type"
  > {
  value: string | number;
  onValueChange: (value: string) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, ...props }, ref) => {
    const numericValue = normalizeToNumber(value);
    const displayValue = numericValue === null ? "" : formatBrl(numericValue);

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/30 focus-visible:border-slate-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 md:text-sm",
          className
        )}
        value={displayValue}
        onChange={(event) => {
          const onlyDigits = event.target.value.replace(/\D/g, "");
          if (!onlyDigits) {
            onValueChange("");
            return;
          }

          const cents = parseInt(onlyDigits, 10);
          onValueChange((cents / 100).toFixed(2));
        }}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };


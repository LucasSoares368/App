import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";

interface CrescimentoAcumuladoCardProps {
  growthPercentage: number;
  growthAbsoluteValue: number;
  periodLabel: string;
}

export const CrescimentoAcumuladoCard = ({
  growthPercentage,
  growthAbsoluteValue,
  periodLabel,
}: CrescimentoAcumuladoCardProps) => {
  const positivo = growthPercentage >= 0;
  const Icone = positivo ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center space-x-4">
        <div
          className={`rounded-full p-2 md:p-3 ${
            positivo ? "bg-green-100" : "bg-red-100"
          }`}
        >
          <Icone
            className={`w-5 h-5 md:w-6 md:h-6 ${
              positivo ? "text-green-600" : "text-red-600"
            }`}
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs md:text-sm text-gray-600 dark:text-slate-300">
              Crescimento acumulado no ano
            </p>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Como calculamos este indicador"
                    className="text-gray-400 hover:text-gray-600 dark:text-slate-300 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  ComparaÃ§Ã£o entre o acumulado do ano atual vs mesmo perÃ­odo do
                  ano passado
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p
            className={`text-xl md:text-3xl font-bold leading-tight ${
              positivo ? "text-green-600" : "text-red-600"
            }`}
          >
            {`${positivo ? "+" : ""}${growthPercentage.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}%`}
          </p>
          <p
            className={`text-sm md:text-base font-medium ${
              growthAbsoluteValue >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {`R$ ${growthAbsoluteValue.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
          </p>
          <p className="text-xs md:text-sm text-gray-600 dark:text-slate-300">{periodLabel}</p>
        </div>
      </div>
    </Card>
  );
};


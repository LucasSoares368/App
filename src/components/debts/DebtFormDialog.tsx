import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FinancialProfile } from "@/components/dashboard/ProfileSwitcher";

interface Debt {
  id: string;
  name: string;
  creditor: string | null;
  total_amount: number;
  current_balance: number;
  interest_rate: number | null;
  minimum_payment: number | null;
  due_day: number | null;
  start_date: string | null;
  status: string;
  notes: string | null;
}

interface DebtFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
  profileType: FinancialProfile;
  onSuccess: () => void;
}

const emptyForm = () => ({
  name: "",
  creditor: "",
  total_amount: 0,
  current_balance: 0,
  interest_rate: "",
  minimum_payment: 0,
  due_day: "",
  start_date: new Date().toISOString().split("T")[0],
  notes: "",
});

export function DebtFormDialog({ open, onOpenChange, debt, profileType, onSuccess }: DebtFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;

    if (debt) {
      setFormData({
        name: debt.name,
        creditor: debt.creditor || "",
        total_amount: Number(debt.total_amount || 0),
        current_balance: Number(debt.current_balance || 0),
        interest_rate: debt.interest_rate?.toString() || "",
        minimum_payment: Number(debt.minimum_payment || 0),
        due_day: debt.due_day?.toString() || "",
        start_date: debt.start_date || "",
        notes: debt.notes || "",
      });
      return;
    }

    setFormData(emptyForm());
  }, [debt, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Informe o nome da dívida");
      return;
    }

    if (formData.total_amount <= 0) {
      toast.error("Informe um valor total maior que zero");
      return;
    }

    const currentBalance = formData.current_balance > 0 ? formData.current_balance : formData.total_amount;

    if (currentBalance > formData.total_amount) {
      toast.error("Saldo devedor não pode ser maior que o valor total");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const debtData = {
        name: formData.name.trim(),
        creditor: formData.creditor.trim() || null,
        total_amount: formData.total_amount,
        current_balance: currentBalance,
        interest_rate: formData.interest_rate ? Number(formData.interest_rate) : null,
        minimum_payment: Math.max(0, Number(formData.minimum_payment || 0)),
        due_day: formData.due_day ? Number(formData.due_day) : null,
        start_date: formData.start_date || null,
        notes: formData.notes.trim() || null,
        status: currentBalance <= 0 ? "paid" : "active",
        profile_type: profileType,
        user_id: user.id,
      };

      if (debt) {
        const { error } = await supabase.from("debts").update(debtData).eq("id", debt.id);
        if (error) throw error;
        toast.success("Dívida atualizada!");
      } else {
        const { error } = await supabase.from("debts").insert(debtData);
        if (error) throw error;
        toast.success("Dívida cadastrada!");
      }

      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{debt ? "Editar Dívida" : "Nova Dívida"}</DialogTitle>
          <DialogDescription>
            {debt ? "Atualize os dados da dívida." : "Cadastre uma dívida para acompanhar saldo, vencimento e pagamentos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Dívida *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="Ex: Empréstimo, cartão, financiamento..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditor">Credor</Label>
              <Input
                id="creditor"
                value={formData.creditor}
                onChange={(event) => setFormData({ ...formData, creditor: event.target.value })}
                placeholder="Ex: Banco, financeira, pessoa..."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="total_amount">Valor Total *</Label>
              <CurrencyInput
                id="total_amount"
                value={formData.total_amount}
                onChange={(value) => setFormData({ ...formData, total_amount: value })}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_balance">Saldo Devedor</Label>
              <CurrencyInput
                id="current_balance"
                value={formData.current_balance}
                onChange={(value) => setFormData({ ...formData, current_balance: value })}
                placeholder="Igual ao total"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="interest_rate">Juros (% a.m.)</Label>
              <Input
                id="interest_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.interest_rate}
                onChange={(event) => setFormData({ ...formData, interest_rate: event.target.value })}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_payment">Pagamento Mínimo</Label>
              <CurrencyInput
                id="minimum_payment"
                value={formData.minimum_payment}
                onChange={(value) => setFormData({ ...formData, minimum_payment: value })}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_day">Dia do Vencimento</Label>
              <Input
                id="due_day"
                type="number"
                min="1"
                max="31"
                value={formData.due_day}
                onChange={(event) => setFormData({ ...formData, due_day: event.target.value })}
                placeholder="1-31"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">Data de Início</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(event) => setFormData({ ...formData, start_date: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              placeholder="Anotações sobre esta dívida..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 flex-1 rounded-2xl" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="h-11 flex-1 rounded-2xl font-semibold" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : debt ? (
                "Atualizar"
              ) : (
                "Cadastrar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

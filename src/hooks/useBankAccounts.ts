import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type BankAccountType = "corrente" | "poupanca" | "investimento";

export interface BankAccount {
  id: string;
  user_id: string;
  name: string;
  bank_name: string;
  account_type: BankAccountType;
  balance: number;
  balance_reference_date: string | null;
  provider: string | null;
  external_id: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

type AccountCreateInput = Omit<
  BankAccount,
  "id" | "user_id" | "created_at" | "updated_at"
>;

type AccountUpdateInput = Partial<AccountCreateInput>;

export const useBankAccounts = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts((data || []) as BankAccount[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar contas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (account: AccountCreateInput) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from("bank_accounts")
        .insert([{ ...account, user_id: userId }])
        .select("*")
        .single();

      if (error) throw error;

      setAccounts((prev) => [data as BankAccount, ...prev]);
      toast({ title: "Conta criada", description: "Conta criada com sucesso!" });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const updateAccount = async (id: string, updates: AccountUpdateInput) => {
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      setAccounts((prev) =>
        prev.map((item) => (item.id === id ? (data as BankAccount) : item))
      );

      toast({
        title: "Conta atualizada",
        description: "Conta atualizada com sucesso!",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar conta",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAccounts((prev) => prev.filter((item) => item.id !== id));
      toast({ title: "Conta removida", description: "Conta removida com sucesso!" });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao remover conta",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return {
    accounts,
    loading,
    createAccount,
    updateAccount,
    deleteAccount,
    refetch: fetchAccounts,
  };
};


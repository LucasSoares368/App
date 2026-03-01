import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  issuer_bank: string | null;
  bank_name: string | null;
  bank_code: string | null;
  bank_slug: string | null;
  brand_color: string | null;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  provider: string | null;
  external_id: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

type CardCreateInput = Omit<
  CreditCard,
  "id" | "user_id" | "created_at" | "updated_at"
>;

type CardUpdateInput = Partial<CardCreateInput>;

export const useCards = () => {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCards((data || []) as CreditCard[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar cartões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCard = async (card: CardCreateInput) => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from("cards")
        .insert([{ ...card, user_id: userId }])
        .select("*")
        .single();

      if (error) throw error;

      setCards((prev) => [data as CreditCard, ...prev]);
      toast({ title: "Cartão criado", description: "Cartão criado com sucesso!" });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao criar cartão",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const updateCard = async (id: string, updates: CardUpdateInput) => {
    try {
      const { data, error } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      setCards((prev) =>
        prev.map((item) => (item.id === id ? (data as CreditCard) : item))
      );

      toast({
        title: "Cartão atualizado",
        description: "Cartão atualizado com sucesso!",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar cartão",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const deleteCard = async (id: string) => {
    try {
      const { error } = await supabase.from("cards").delete().eq("id", id);

      if (error) throw error;

      setCards((prev) => prev.filter((item) => item.id !== id));
      toast({ title: "Cartão removido", description: "Cartão removido com sucesso!" });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao remover cartão",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  return {
    cards,
    loading,
    createCard,
    updateCard,
    deleteCard,
    refetch: fetchCards,
  };
};


import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { gerarReceitasRecorrentesPendentes } from "@/lib/receitas-recorrentes";

export interface Receita {
  id: string;
  user_id: string;
  bank_account_id?: string | null;
  categoria_id?: string;
  descricao: string;
  valor: number;
  data: string;
  recorrente: boolean;
  dia_recorrencia?: number | null;
  receita_pai_id?: string | null;
  frequencia_recorrencia?: "mensal" | "quinzenal" | "semanal";
  data_fim_recorrencia?: string | null;
  forma_pagamento?: string | null;
  status_recebimento?: "recebido" | "pendente";
  tipo_receita?: "fixa" | "variavel";
  created_at: string;
  updated_at: string;
  categorias?: {
    nome: string;
    cor: string;
    icone: string;
  };
  bank_accounts?: {
    id: string;
    name: string;
    bank_name: string;
  } | null;
}

export const useReceitas = () => {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReceitas = async () => {
    try {
      await gerarReceitasRecorrentesPendentes();

      // Buscar dados da tabela receitas
      const { data: receitasData, error: receitasError } = await supabase
        .from('receitas')
        .select(`
          *,
          categorias (nome, cor, icone),
          bank_accounts (id, name, bank_name)
        `);

      if (receitasError) throw receitasError;

      // Buscar dados da tabela transacoes com tipo receita
      const { data: transacoesData, error: transacoesError } = await supabase
        .from('transacoes')
        .select(`
          *,
          categorias (nome, cor, icone)
        `)
        .eq('tipo', 'receita');

      if (transacoesError) throw transacoesError;

      // Combinar os dados
      const allReceitas = [
        ...(receitasData || []),
        ...(transacoesData || []).map((transacao: any) => ({
          ...transacao,
          recorrente: false,
          receita_pai_id: null,
          dia_recorrencia: null,
          frequencia_recorrencia: "mensal" as const,
          data_fim_recorrencia: null,
          forma_pagamento: null,
          status_recebimento: "recebido" as const,
          tipo_receita: "variavel" as const,
          bank_account_id: null,
          bank_accounts: null,
        })),
      ];

      // Ordenar por data
      const sortedReceitas = allReceitas.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );

      setReceitas(sortedReceitas);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar receitas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createReceita = async (receita: Omit<Receita, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'categorias' | 'bank_accounts'>) => {
    try {
      const { data, error } = await supabase
        .from('receitas')
        .insert([{
          ...receita,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select(`
          *,
          categorias (nome, cor, icone),
          bank_accounts (id, name, bank_name)
        `)
        .single();

      if (error) throw error;
      if (data.recorrente) {
        await fetchReceitas();
      } else {
        setReceitas(prev => [data, ...prev]);
      }
      
      toast({
        title: "Receita criada",
        description: "Receita criada com sucesso!",
      });
      
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao criar receita",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const updateReceita = async (id: string, updates: Partial<Receita>) => {
    try {
      const { data, error } = await supabase
        .from('receitas')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          categorias (nome, cor, icone),
          bank_accounts (id, name, bank_name)
        `)
        .single();

      if (error) throw error;
      setReceitas(prev => prev.map(receita => receita.id === id ? data : receita));
      
      toast({
        title: "Receita atualizada",
        description: "Receita atualizada com sucesso!",
      });
      
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar receita",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const deleteReceita = async (id: string) => {
    try {
      const { data: receitaAtual } = await supabase
        .from("receitas")
        .select("recorrente")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from('receitas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (receitaAtual?.recorrente) {
        const { error: filhosError } = await supabase
          .from("receitas")
          .delete()
          .eq("receita_pai_id", id);

        if (filhosError) throw filhosError;
      }

      setReceitas(prev => prev.filter(receita => receita.id !== id));
      
      toast({
        title: "Receita removida",
        description: "Receita removida com sucesso!",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao remover receita",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  useEffect(() => {
    fetchReceitas();
  }, []);

  return {
    receitas,
    loading,
    createReceita,
    updateReceita,
    deleteReceita,
    refetch: fetchReceitas
  };
};

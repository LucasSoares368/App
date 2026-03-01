import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { gerarDespesasRecorrentesPendentes } from "@/lib/despesas-recorrentes";

export interface Despesa {
  id: string;
  user_id: string;
  categoria_id?: string;
  descricao: string;
  valor: number;
  data: string;
  status?: string;
  status_pagamento?: string;
  tipo_despesa?: string;
  recorrente?: boolean;
  despesa_pai_id?: string | null;
  dia_recorrencia?: number | null;
  frequencia_recorrencia?: "mensal" | "quinzenal" | "semanal";
  data_fim_recorrencia?: string | null;
  forma_pagamento?: string | null;
  cartao_id?: string | null;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
  numero_parcelas?: number | null;
  data_primeira_parcela?: string | null;
  installment_group_id?: string | null;
  installment_index?: number | null;
  installments_total?: number | null;
  created_at: string;
  updated_at: string;
  categorias?: {
    nome: string;
    cor: string;
    icone: string;
  };
}

export const useDespesas = () => {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDespesas = async () => {
    try {
      await gerarDespesasRecorrentesPendentes();

      // Buscar dados da tabela despesas
      const { data: despesasData, error: despesasError } = await supabase
        .from('despesas')
        .select(`
          *,
          categorias (nome, cor, icone)
        `);

      if (despesasError) throw despesasError;

      // Buscar dados da tabela transacoes com tipo despesa
      const { data: transacoesData, error: transacoesError } = await supabase
        .from('transacoes')
        .select(`
          *,
          categorias (nome, cor, icone)
        `)
        .eq('tipo', 'despesa');

      if (transacoesError) throw transacoesError;

      // Combinar os dados
      const allDespesas = [
        ...(despesasData || []),
        ...(transacoesData || []).map((transacao: any) => ({
          ...transacao,
          recorrente: false,
          despesa_pai_id: null,
          dia_recorrencia: null,
          frequencia_recorrencia: "mensal" as const,
          data_fim_recorrencia: null,
          forma_pagamento: null,
          cartao_id: null,
          data_vencimento: transacao.data,
          data_pagamento: null,
          numero_parcelas: null,
          data_primeira_parcela: null,
          installment_group_id: null,
          installment_index: null,
          installments_total: null,
          status_pagamento: transacao.status_pagamento || "pendente",
          tipo_despesa: transacao.tipo_despesa || "variavel",
        }))
      ];

      // Ordenar por data
      const sortedDespesas = allDespesas.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );

      setDespesas(sortedDespesas);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar despesas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hasMissingExpenseColumnError = (error: any) => {
    const message = String(error?.message || "").toLowerCase();
    return (
      message.includes("could not find") &&
      message.includes("despesas") &&
      (
        message.includes("status_pagamento") ||
        message.includes("tipo_despesa") ||
        message.includes("forma_pagamento") ||
        message.includes("cartao_id") ||
        message.includes("recorrente") ||
        message.includes("despesa_pai_id") ||
        message.includes("data_vencimento") ||
        message.includes("installment_group_id") ||
        message.includes("installment_index") ||
        message.includes("installments_total")
      )
    );
  };

  const createDespesa = async (despesa: Omit<Despesa, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'categorias'>) => {
    try {
      const basePayload = {
        ...despesa,
        user_id: (await supabase.auth.getUser()).data.user?.id
      } as any;

      let { data, error } = await supabase
        .from('despesas')
        .insert([basePayload])
        .select(`
          *,
          categorias (nome, cor, icone)
        `)
        .single();

      if (error && hasMissingExpenseColumnError(error)) {
        const legacyPayload = { ...basePayload };
        delete legacyPayload.status_pagamento;
        delete legacyPayload.tipo_despesa;
        delete legacyPayload.cartao_id;
        delete legacyPayload.installment_group_id;
        delete legacyPayload.installment_index;
        delete legacyPayload.installments_total;

        const retry = await supabase
          .from('despesas')
          .insert([legacyPayload])
          .select(`
            *,
            categorias (nome, cor, icone)
          `)
          .single();

        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      setDespesas(prev => [data, ...prev]);
      
      toast({
        title: "Despesa criada",
        description: "Despesa criada com sucesso!",
      });
      
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao criar despesa",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const createDespesasLote = async (
    despesasPayload: Array<
      Omit<Despesa, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'categorias'>
    >
  ) => {
    try {
      if (!despesasPayload.length) {
        return { data: [], error: null };
      }

      const userId = (await supabase.auth.getUser()).data.user?.id;
      const payloadComUsuario = despesasPayload.map((despesa) => ({
        ...despesa,
        user_id: userId,
      })) as any[];

      let { data, error } = await supabase
        .from("despesas")
        .insert(payloadComUsuario)
        .select(
          `
          *,
          categorias (nome, cor, icone)
        `
        );

      if (error && hasMissingExpenseColumnError(error)) {
        const legacyPayload = payloadComUsuario.map((despesa) => {
          const payload = { ...despesa };
          delete payload.status_pagamento;
          delete payload.tipo_despesa;
          delete payload.cartao_id;
          delete payload.installment_group_id;
          delete payload.installment_index;
          delete payload.installments_total;
          return payload;
        });

        const retry = await supabase
          .from("despesas")
          .insert(legacyPayload)
          .select(
            `
            *,
            categorias (nome, cor, icone)
          `
          );

        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      const despesasCriadas = data || [];
      setDespesas((prev) =>
        [...despesasCriadas, ...prev].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        )
      );

      toast({
        title: "Despesas criadas",
        description: `${despesasCriadas.length} lançamento(s) criado(s) com sucesso!`,
      });

      return { data: despesasCriadas, error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao criar despesas",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const updateDespesa = async (id: string, updates: Partial<Despesa>) => {
    try {
      let { data, error } = await supabase
        .from('despesas')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          categorias (nome, cor, icone)
        `)
        .single();

      if (error && hasMissingExpenseColumnError(error)) {
        const legacyUpdates = { ...updates } as any;
        delete legacyUpdates.status_pagamento;
        delete legacyUpdates.tipo_despesa;
        delete legacyUpdates.cartao_id;

        const retry = await supabase
          .from('despesas')
          .update(legacyUpdates)
          .eq('id', id)
          .select(`
            *,
            categorias (nome, cor, icone)
          `)
          .single();

        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      setDespesas(prev => prev.map(despesa => despesa.id === id ? data : despesa));
      
      toast({
        title: "Despesa atualizada",
        description: "Despesa atualizada com sucesso!",
      });
      
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar despesa",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const deleteDespesa = async (id: string) => {
    try {
      const { data: despesaAtual } = await supabase
        .from("despesas")
        .select("recorrente")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from('despesas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (despesaAtual?.recorrente) {
        const { error: filhosError } = await supabase
          .from("despesas")
          .delete()
          .eq("despesa_pai_id", id);

        if (filhosError) throw filhosError;
      }
      setDespesas(prev => prev.filter(despesa => despesa.id !== id));
      
      toast({
        title: "Despesa removida",
        description: "Despesa removida com sucesso!",
      });
      
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao remover despesa",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  useEffect(() => {
    fetchDespesas();
  }, []);

  return {
    despesas,
    loading,
    createDespesa,
    createDespesasLote,
    updateDespesa,
    deleteDespesa,
    refetch: fetchDespesas
  };
};

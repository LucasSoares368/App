
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCategorias } from "@/hooks/useCategorias";
import { useBankAccounts } from "@/hooks/useBankAccounts";

interface Receita {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  bank_account_id?: string | null;
  data: string;
  tipo: 'fixa' | 'variavel';
  forma_pagamento?: string | null;
  status_recebimento?: 'recebido' | 'pendente';
  recorrente?: boolean;
  dia_recorrencia?: number | null;
  receita_pai_id?: string | null;
  frequencia_recorrencia?: 'mensal' | 'quinzenal' | 'semanal';
  data_fim_recorrencia?: string | null;
}

interface EditarReceitaModalProps {
  receita: Receita | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (receita: Receita) => void;
}

export const EditarReceitaModal = ({ receita, isOpen, onClose, onSave }: EditarReceitaModalProps) => {
  const { toast } = useToast();
  const { categoriasReceita } = useCategorias();
  const { accounts } = useBankAccounts();
  
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    categoria: '',
    contaId: '',
    data: '',
    tipo: 'variavel' as 'fixa' | 'variavel',
    forma_pagamento: '',
    status_recebimento: 'recebido' as 'recebido' | 'pendente',
    recorrente: false,
    dia_recorrencia: '',
    frequencia_recorrencia: 'mensal' as 'mensal' | 'quinzenal' | 'semanal',
    data_fim_recorrencia: '',
  });
  const obterDiaDaData = (data: string) => {
    if (!data) return "";
    const partes = data.split("T")[0].split("-");
    if (partes.length !== 3) return "";
    return String(parseInt(partes[2], 10));
  };

  useEffect(() => {
    if (receita) {
      setFormData({
        descricao: receita.descricao,
        valor: receita.valor.toString(),
        categoria: receita.categoria,
        contaId: receita.bank_account_id || '',
        data: receita.data,
        tipo: receita.tipo,
        forma_pagamento: receita.forma_pagamento || '',
        status_recebimento: receita.status_recebimento || 'recebido',
        recorrente: Boolean(receita.recorrente),
        dia_recorrencia: receita.dia_recorrencia ? String(receita.dia_recorrencia) : '',
        frequencia_recorrencia: receita.frequencia_recorrencia || 'mensal',
        data_fim_recorrencia: receita.data_fim_recorrencia || '',
      });
    }
  }, [receita]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.descricao || !formData.valor || !formData.categoria || !formData.data || !formData.forma_pagamento) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (
      formData.recorrente &&
      formData.frequencia_recorrencia === 'mensal' &&
      !formData.dia_recorrencia
    ) {
      toast({
        title: "Erro",
        description: "Preencha o dia da recorrência",
        variant: "destructive"
      });
      return;
    }

    if (!receita) return;

    const receitaAtualizada: Receita = {
      ...receita,
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      categoria: formData.categoria,
      bank_account_id: formData.contaId || null,
      data: formData.data,
      tipo: formData.tipo,
      forma_pagamento: formData.forma_pagamento,
      status_recebimento: formData.status_recebimento,
      recorrente: formData.recorrente,
      dia_recorrencia: formData.recorrente ? parseInt(formData.dia_recorrencia, 10) : null,
      frequencia_recorrencia: formData.recorrente ? formData.frequencia_recorrencia : 'mensal',
      data_fim_recorrencia:
        formData.recorrente && formData.data_fim_recorrencia
          ? formData.data_fim_recorrencia
          : null,
    };

    onSave(receitaAtualizada);
    onClose();
    
    toast({
      title: "Sucesso!",
      description: "Receita atualizada com sucesso",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Receita</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              placeholder="Ex: Salário, Freelance, Aluguel..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor *</Label>
            <CurrencyInput
              id="valor"
              value={formData.valor}
              onValueChange={(value) => setFormData({ ...formData, valor: value })}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria *</Label>
            <select
              id="categoria"
              value={formData.categoria}
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Selecione uma categoria</option>
              {categoriasReceita.map(categoria => (
                <option key={categoria.id} value={categoria.nome}>
                  {categoria.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data">Data *</Label>
            <Input
              id="data"
              type="date"
              value={formData.data}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  data: e.target.value,
                  dia_recorrencia: formData.recorrente
                    ? obterDiaDaData(e.target.value)
                    : formData.dia_recorrencia,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="forma_pagamento">Forma de pagamento *</Label>
            <select
              id="forma_pagamento"
              value={formData.forma_pagamento}
              onChange={(e) => setFormData({...formData, forma_pagamento: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Selecione</option>
              <option value="Pix">Pix</option>
              <option value="Transferência">Transferência</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão">Cartão</option>
              <option value="Boleto">Boleto</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conta_id">Conta da carteira</Label>
            <select
              id="conta_id"
              value={formData.contaId}
              onChange={(e) => setFormData({ ...formData, contaId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Sem conta vinculada</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.bank_name})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status_recebimento">Status *</Label>
            <select
              id="status_recebimento"
              value={formData.status_recebimento}
              onChange={(e) => setFormData({...formData, status_recebimento: e.target.value as 'recebido' | 'pendente'})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="recebido">Recebido</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>

          {!receita?.receita_pai_id && (
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.recorrente}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recorrente: e.target.checked,
                      dia_recorrencia: e.target.checked
                        ? formData.dia_recorrencia || obterDiaDaData(formData.data) || String(new Date().getDate())
                        : "",
                      frequencia_recorrencia: e.target.checked
                        ? formData.frequencia_recorrencia
                        : "mensal",
                      data_fim_recorrencia: e.target.checked
                        ? formData.data_fim_recorrencia
                        : "",
                    })
                  }
                  className="text-orange-600"
                />
                <span>Receita recorrente</span>
              </label>

              {formData.recorrente && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequencia_recorrencia">Frequência *</Label>
                    <select
                      id="frequencia_recorrencia"
                      value={formData.frequencia_recorrencia}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          frequencia_recorrencia: e.target.value as
                            | "mensal"
                            | "quinzenal"
                            | "semanal",
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="mensal">Mensal</option>
                      <option value="quinzenal">Quinzenal</option>
                      <option value="semanal">Semanal</option>
                    </select>
                  </div>

                  {formData.frequencia_recorrencia === "mensal" && (
                    <div className="space-y-2">
                      <Label htmlFor="dia_recorrencia">Dia do mês *</Label>
                      <Input
                        id="dia_recorrencia"
                        type="number"
                        min={1}
                        max={31}
                        value={formData.dia_recorrencia}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dia_recorrencia: e.target.value,
                          })
                        }
                        placeholder="Ex: 5"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="data_fim_recorrencia">Data de término</Label>
                    <Input
                      id="data_fim_recorrencia"
                      type="date"
                      value={formData.data_fim_recorrencia}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          data_fim_recorrencia: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo de Receita</Label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="tipo"
                  value="fixa"
                  checked={formData.tipo === 'fixa'}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value as 'fixa' | 'variavel'})}
                  className="text-orange-600"
                />
                <span>Receita Fixa</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="tipo"
                  value="variavel"
                  checked={formData.tipo === 'variavel'}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value as 'fixa' | 'variavel'})}
                  className="text-orange-600"
                />
                <span>Receita Variável</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};





import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCategorias } from "@/hooks/useCategorias";

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  tipo: 'receita' | 'despesa';
}

interface EditarTransacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  transacao: Transacao | null;
  onSave: (transacaoEditada: Transacao) => void;
}

export const EditarTransacaoModal = ({ isOpen, onClose, transacao, onSave }: EditarTransacaoModalProps) => {
  const { toast } = useToast();
  const { categoriasReceita, categoriasDespesa } = useCategorias();
  
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [data, setData] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita');

  useEffect(() => {
    if (transacao) {
      setDescricao(transacao.descricao);
      setValor(transacao.valor.toString());
      setCategoria(transacao.categoria);
      setData(transacao.data);
      setTipo(transacao.tipo);
    }
  }, [transacao]);

  const handleSave = () => {
    if (!descricao || !valor || !categoria || !data) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatÃ³rios.",
        variant: "destructive",
      });
      return;
    }

    if (!transacao) return;

    const transacaoEditada: Transacao = {
      ...transacao,
      descricao,
      valor: parseFloat(valor),
      categoria,
      data,
      tipo
    };

    onSave(transacaoEditada);
    onClose();

    toast({
      title: "Sucesso",
      description: "TransaÃ§Ã£o editada com sucesso!",
    });
  };

  const handleCancel = () => {
    onClose();
  };

  const categoriasPorTipo = tipo === 'receita' ? categoriasReceita : categoriasDespesa;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar TransaÃ§Ã£o</DialogTitle>
          <DialogDescription>
            Edite as informaÃ§Ãµes da transaÃ§Ã£o abaixo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">DescriÃ§Ã£o *</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: SalÃ¡rio, Supermercado..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="valor">Valor *</Label>
            <CurrencyInput
              id="valor"
              value={valor}
              onValueChange={setValor}
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'receita' | 'despesa')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria *</Label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Selecione uma categoria</option>
              {categoriasPorTipo.map(cat => (
                <option key={cat.id} value={cat.nome}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="data">Data *</Label>
            <Input
              id="data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
            Salvar AlteraÃ§Ãµes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


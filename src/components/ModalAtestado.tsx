import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { FileBadge, Loader2, Printer } from 'lucide-react';

// API Helper
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const apiFetch = async (endpoint: string, method: string, body: any = null) => {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('Usuário não autenticado');
  const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };
  const options: RequestInit = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Falha na requisição');
  }
  return data;
};

// Interface da Evolução (para receber os dados)
interface Evolucao {
  id_evolucao: number;
  id_paciente: number;
  id_profissional: number;
  id_atendimento: number | null;
  nome_paciente?: string;
  nome_profissional?: string;
}

interface ModalAtestadoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evolucao: Evolucao;
}

export default function ModalAtestado({ open, onOpenChange, evolucao }: ModalAtestadoProps) {
  const navigate = useNavigate();
  const [dias, setDias] = useState<number>(1);
  const [cid, setCid] = useState('');
  const [texto, setTexto] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Atualiza o texto padrão quando o modal abre ou os dados mudam
  useEffect(() => {
    if (evolucao && open) {
      setTexto(
        `Atesto para os devidos fins que o(a) Sr(a). ${evolucao.nome_paciente || '[PACIENTE]'} esteve sob meus cuidados médicos nesta data, necessitando de ${dias} (escreva por extenso) dia(s) de afastamento de suas atividades laborais${cid ? ` por apresentar condições compatíveis com o CID: ${cid}` : ''}.`
      );
    }
  }, [evolucao, dias, cid, open]);

  const handleSubmit = async () => {
    if (!evolucao || dias <= 0 || !texto) {
      setError('Preencha todos os campos obrigatórios (Dias e Texto).');
      return;
    }

    setIsLoading(true);
    setError('');

    const dataToSend = {
      id_paciente: evolucao.id_paciente,
      id_profissional: evolucao.id_profissional,
      id_atendimento: evolucao.id_atendimento,
      dias_afastamento: dias,
      cid: cid || null,
      texto_atestado: texto
    };

    try {
      // CORRIGIDO: Removido o '/api' do início
      const response = await apiFetch('/atestados', 'POST', dataToSend);
      
      onOpenChange(false);
      navigate('/imprimir/atestado', { state: { atestadoId: response.id_atestado } });

    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao salvar atestado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBadge className="w-5 h-5 text-blue-600" />
            Gerar Atestado Médico
          </DialogTitle>
          <DialogDescription>
            Atestado para: {evolucao.nome_paciente || 'Paciente'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dias">Dias de Afastamento</Label>
              <Input
                id="dias"
                type="number"
                min="1"
                value={dias}
                onChange={(e) => setDias(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="cid">CID (Opcional)</Label>
              <Input
                id="cid"
                type="text"
                placeholder="Ex: A09.0"
                value={cid}
                onChange={(e) => setCid(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="texto">Texto do Atestado</Label>
            <Textarea
              id="texto"
              rows={8}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Atesto para os devidos fins que..."
            />
            <p className="text-xs text-gray-500 mt-1">
              O texto é preenchido automaticamente. Ajuste se necessário.
            </p>
          </div>
          
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 mr-2" />
            )}
            Salvar e Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
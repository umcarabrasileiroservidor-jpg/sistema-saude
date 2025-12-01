import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Skeleton } from './ui/skeleton'; 

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Interface do Atestado (completa)
interface AtestadoCompleto {
  id_atestado: number;
  data_emissao: string;
  dias_afastamento: number;
  cid: string | null;
  texto_atestado: string;
  nome_paciente: string;
  cpf_paciente: string;
  nome_profissional: string;
  especialidade_profissional: string;
}

const apiFetch = async (endpoint: string) => {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('Usuário não autenticado');
  const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };
  const response = await fetch(`${API_URL}${endpoint}`, { headers });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Falha na requisição');
  }
  return data.data;
};

// Helper de Formatação de Data
const formatDisplayDateTime = (isoString: string | undefined | null): string => {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch { return isoString; }
}
const formatDisplayDate = (isoString: string | undefined | null): string => {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    } catch { return isoString; }
}


export default function ImpressaoAtestado() {
  const location = useLocation();
  const navigate = useNavigate();
  const printTriggered = useRef(false);

  const [atestado, setAtestado] = useState<AtestadoCompleto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const atestadoId: number | undefined = location.state?.atestadoId;

  useEffect(() => {
    if (!atestadoId) {
      alert("ID do atestado não encontrado. Retornando...");
      navigate(-1);
      return;
    }

    const fetchAtestado = async () => {
      try {
        // CORRIGIDO: Removido o '/api' do início
        const data = await apiFetch(`/atestados/${atestadoId}`);
        setAtestado(data);
      } catch (err) {
        console.error(err);
        alert("Erro ao buscar dados do atestado. Retornando...");
        navigate(-1);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAtestado();

  }, [atestadoId, navigate]);

  useEffect(() => {
    if (atestado && !isLoading && !printTriggered.current) {
      printTriggered.current = true;
      window.print();
      window.onafterprint = () => {
        navigate(-1);
      };
    }
  }, [atestado, isLoading, navigate]);

  if (isLoading || !atestado) {
    return (
        <div className="w-full max-w-2xl mx-auto p-8 bg-white text-black space-y-8">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-1/2 mx-auto" />
        </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-white text-black print:p-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-gray-400 pb-4 mb-8 print:border-b-2">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center print:bg-gray-200">
            <Heart className="w-8 h-8 text-white print:text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-blue-900 print:text-black">{atestado.nome_profissional}</h1>
            <p className="text-base text-gray-700 print:text-gray-800">{atestado.especialidade_profissional}</p>
          </div>
        </div>
        <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-800 print:text-black">ATESTADO MÉDICO</h2>
            <p className="text-sm text-gray-600 print:text-gray-700">ID: {atestado.id_atestado}</p>
        </div>
      </div>

      {/* Corpo do Atestado */}
      <div className="my-12 px-4">
        <p className="text-lg leading-relaxed text-justify indent-8">
          {atestado.texto_atestado}
        </p>
      </div>
      
      {/* CID */}
      {atestado.cid && (
        <div className="my-10 px-4">
            <p className="text-lg font-medium"><strong>CID:</strong> {atestado.cid}</p>
        </div>
      )}

      {/* Local e Data */}
      <div className="my-12 px-4 text-right">
        <p className="text-base">Recife, {formatDisplayDate(atestado.data_emissao)}.</p>
        <p className="text-sm text-gray-500">{formatDisplayDateTime(atestado.data_emissao)}</p>
      </div>


      {/* Assinatura */}
      <div className="mt-24 pt-4 text-center">
        <p className="text-lg font-semibold border-t-2 border-gray-400 w-3/4 mx-auto pt-2">
            {atestado.nome_profissional}
        </p>
        <p className="text-base text-gray-700">{atestado.especialidade_profissional}</p>
        <p className="text-sm text-gray-600">(Assinatura e Carimbo)</p>
      </div>
    </div>
  );
}
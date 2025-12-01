import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { User, Calendar, Clipboard, FileText, Heart, Printer, ArrowLeft, FileBadge } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// --- Interfaces ---
interface Paciente {
  id_paciente: number;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  sexo: string;
  telefone: string;
  email: string;
  convenio: string;
  status: string;
}
interface Atendimento {
  id_atendimento: number;
  data_atendimento: string;
  tipo_atendimento: string;
  status: string;
  observacoes: string | null;
  nome_profissional?: string;
}
interface Evolucao {
  id_evolucao: number;
  data_registro: string;
  observacoes: string | null;
  nome_profissional?: string;
}
interface Atestado {
  id_atestado: number;
  data_emissao: string;
  dias_afastamento: number;
  cid: string | null;
  nome_profissional?: string;
}
interface FichaData {
  paciente: Paciente;
  atendimentos: Atendimento[];
  evolucoes: Evolucao[];
  atestados: Atestado[];
}
// ---

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
        return new Date(isoString + 'T00:00:00').toLocaleDateString('pt-BR');
    } catch { return isoString; }
}

export default function FichaPaciente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ficha, setFicha] = useState<FichaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("ID do paciente não fornecido.");
      setIsLoading(false);
      return;
    }

    const fetchFicha = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiFetch(`/pacientes/${id}/ficha-completa`);
        setFicha(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFicha();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const FichaSkeleton = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <FichaSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">Erro ao carregar Ficha</h1>
        <p className="text-gray-600">{error}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  if (!ficha) {
    return <div className="max-w-4xl mx-auto p-4 text-center">Paciente não encontrado.</div>;
  }

  const { paciente, atendimentos, evolucoes, atestados } = ficha;

  return (
    // Layout otimizado para impressão
    <div className="max-w-4xl mx-auto p-4 print:p-0 bg-white">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Pacientes
        </Button>
        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Ficha
        </Button>
      </div>

      {/* Cabeçalho da Impressão (Visível apenas na impressão) */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center print:bg-gray-200">
                <Heart className="w-7 h-7 text-white print:text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-900 print:text-black">HealthCare</h1>
                <p className="text-sm text-gray-500 print:text-gray-700">Sistema de Gestão de Saúde</p>
              </div>
            </div>
            <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-800 print:text-black">Ficha do Paciente</h2>
                <p className="text-sm text-gray-600 print:text-gray-700">Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
        </div>
      </div>


      {/* Card de Dados Pessoais */}
      <Card className="shadow-lg print:shadow-none print:border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl text-blue-700">{paciente.nome_completo}</CardTitle>
            <CardDescription>ID do Paciente: {paciente.id_paciente}</CardDescription>
          </div>
          <Badge variant={paciente.status === 'Ativo' ? 'default' : 'destructive'} className="h-6">
            {paciente.status}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
            <div>
              <strong className="text-gray-600">CPF:</strong>
              <p className="text-gray-900">{paciente.cpf}</p>
            </div>
            <div>
              <strong className="text-gray-600">Data Nasc.:</strong>
              <p className="text-gray-900">{formatDisplayDate(paciente.data_nascimento)}</p>
            </div>
            <div>
              <strong className="text-gray-600">Sexo:</strong>
              <p className="text-gray-900">{paciente.sexo}</p>
            </div>
            <div>
              <strong className="text-gray-600">Telefone:</strong>
              <p className="text-gray-900">{paciente.telefone}</p>
            </div>
            <div className="md:col-span-2">
              <strong className="text-gray-600">Email:</strong>
              <p className="text-gray-900">{paciente.email}</p>
            </div>
            <div>
              <strong className="text-gray-600">Convênio:</strong>
              <p className="text-gray-900">{paciente.convenio}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Evoluções */}
      <Card className="mt-6 shadow-lg print:shadow-none print:border-0 print:mt-4 print:break-before-page">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Histórico de Evoluções Clínicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {evolucoes.length === 0 ? (
            <p className="text-gray-500 italic text-center py-4">Nenhuma evolução registrada.</p>
          ) : (
            evolucoes.map(evo => (
              <div key={evo.id_evolucao} className="border rounded-lg p-4 bg-gray-50/50 print:border-gray-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">Dr(a). {evo.nome_profissional || 'Desconhecido'}</span>
                  <span className="text-xs text-gray-500">{formatDisplayDateTime(evo.data_registro)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{evo.observacoes}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Histórico de Atendimentos */}
      <Card className="mt-6 shadow-lg print:shadow-none print:border-0 print:mt-4 print:break-before-page">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clipboard className="w-5 h-5 text-green-600" />
            Histórico de Atendimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atendimentos.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-4">Nenhum atendimento registrado.</TableCell></TableRow>
              ) : (
                atendimentos.map(atd => (
                  <TableRow key={atd.id_atendimento}>
                    <TableCell>{formatDisplayDateTime(atd.data_atendimento)}</TableCell>
                    <TableCell><Badge variant="outline">{atd.tipo_atendimento}</Badge></TableCell>
                    <TableCell>{atd.nome_profissional || 'N/A'}</TableCell>
                    <TableCell>{atd.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Histórico de Atestados */}
      <Card className="mt-6 shadow-lg print:shadow-none print:border-0 print:mt-4 print:break-before-page">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBadge className="w-5 h-5 text-purple-600" />
            Histórico de Atestados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Emissão</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>CID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atestados.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-4">Nenhum atestado registrado.</TableCell></TableRow>
              ) : (
                atestados.map(atd => (
                  <TableRow key={atd.id_atestado}>
                    <TableCell>{formatDisplayDateTime(atd.data_emissao)}</TableCell>
                    <TableCell>{atd.nome_profissional || 'N/A'}</TableCell>
                    <TableCell>{atd.dias_afastamento} dias</TableCell>
                    <TableCell><Badge variant="secondary">{atd.cid || 'N/A'}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
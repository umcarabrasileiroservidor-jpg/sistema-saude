
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Shield, Search, Activity, ArrowRightLeft, AlertCircle } from 'lucide-react'; // Adicionado AlertCircle

// URL da API e Helper
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const apiFetch = async (endpoint: string) => {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}${endpoint}`, { headers });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || `Falha na requisição ${endpoint}`);
  }
  return data;
};

// Tipos para os dados da API
interface LogAcesso {
  id_log: number;
  nome_usuario: string | null; // Pode ser nulo se o usuário for deletado
  acao: string;
  data_acao: string;
  ip_origem: string | null;
}
interface AcessoInterunidade {
    id_acesso: number;
    nome_profissional: string | null;
    nome_paciente: string | null;
    nome_unidade_origem: string | null;
    nome_unidade_destino: string | null;
    data_acesso: string;
}

export default function Logs() {
  const [logsAcesso, setLogsAcesso] = useState<LogAcesso[]>([]);
  const [acessosInterunidades, setAcessosInterunidades] = useState<AcessoInterunidade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterTipo, setFilterTipo] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Busca todos os dados ao carregar
  useEffect(() => {
    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [logsData, interunidadesData] = await Promise.all([
                apiFetch('/logs'),
                apiFetch('/acessos-interunidades')
            ]);
            setLogsAcesso(logsData.data || []);
            setAcessosInterunidades(interunidadesData.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, []);

  // Extrai tipos de ação únicos dos logs para o filtro
  const tiposDeAcao = [...new Set(logsAcesso.map(log => log.acao).filter(Boolean))].sort();

  const filteredLogs = logsAcesso.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (log.nome_usuario && log.nome_usuario.toLowerCase().includes(term)) ||
                        (log.acao && log.acao.toLowerCase().includes(term));
    const matchFilter = filterTipo === 'all' || log.acao === filterTipo;
    return matchSearch && matchFilter;
  });

  // --- CORREÇÃO AQUI: Remove 'destructive' do tipo de retorno ---
  const getAcaoColor = (acao: string | null): "default" | "secondary" | "outline" => {
    const acaoLower = (acao || '').toLowerCase();
    if (acaoLower.includes('login') || acaoLower.includes('logout')) return 'default';
    if (acaoLower.includes('create') || acaoLower.includes('insert') || acaoLower.includes('cadastro')) return 'secondary';
    if (acaoLower.includes('delete') || acaoLower.includes('remove')) return 'secondary'; // Mapeado para 'secondary'
    if (acaoLower.includes('update') || acaoLower.includes('edit')) return 'outline';
    return 'default';
  };
  // --- FIM DA CORREÇÃO ---


  const formatDisplayDateTime = (isoString: string | undefined | null): string => {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleString('pt-BR');
    } catch { return isoString; }
  };

  const renderLoading = (colSpan: number, text: string) => (
      <TableRow>
        <TableCell colSpan={colSpan} className="text-center py-8">
            <div className="flex justify-center items-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                {text}
            </div>
        </TableCell>
      </TableRow>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logs e Auditoria</h1>
        <p className="text-sm text-gray-600">Registros de acessos e atividades do sistema</p>
      </div>

       {error && (
        <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-md">
           <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5" /><strong>Erro ao carregar logs:</strong> {error}</div>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ações Registradas</p>
                <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '...' : logsAcesso.length}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
         <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Logins Registrados</p>
                <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '...' : logsAcesso.filter(l => l.acao?.toLowerCase().includes('login')).length}</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-gray-600">Acessos Interunidades</p>
                 <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '...' : acessosInterunidades.length}</h3>
               </div>
               <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                 <ArrowRightLeft className="w-6 h-6 text-purple-600" />
               </div>
             </div>
           </CardContent>
        </Card>
         <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Falhas (Exemplo)</p>
                {/* O backend não retorna status de falha no log, então este card é apenas visual */}
                <h3 className="text-2xl font-bold text-gray-900">0</h3>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs de Acesso */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Acesso</CardTitle>
          <CardDescription>Registro de todas as ações dos usuários</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por usuário ou ação..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {tiposDeAcao.map(acao => (
                    <SelectItem key={acao} value={acao}>{acao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>IP de Origem</TableHead>
                  {/* Coluna Status Removida */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? renderLoading(4, "Carregando logs de acesso...") :
                 filteredLogs.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8">Nenhum log encontrado.</TableCell></TableRow> :
                 filteredLogs
                  .map((log) => (
                    <TableRow key={log.id_log}>
                      <TableCell className="text-sm">{formatDisplayDateTime(log.data_acao)}</TableCell>
                      <TableCell>{log.nome_usuario || 'Usuário Deletado'}</TableCell>
                      <TableCell>
                        <Badge variant={getAcaoColor(log.acao)}>{log.acao || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{log.ip_origem || '-'}</TableCell>
                      {/* Célula Status Removida */}
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Acessos Interunidades */}
      <Card>
        <CardHeader>
          <CardTitle>Acessos Interunidades</CardTitle>
          <CardDescription>Registro de profissionais acessando prontuários de outras unidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Paciente Acessado</TableHead>
                  <TableHead>Unidade Origem</TableHead>
                  <TableHead>Unidade Destino</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {isLoading ? renderLoading(5, "Carregando acessos interunidades...") :
                 acessosInterunidades.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8">Nenhum acesso interunidades registrado.</TableCell></TableRow> :
                 acessosInterunidades
                  .map((acesso) => (
                    <TableRow key={acesso.id_acesso}>
                      <TableCell className="text-sm">{formatDisplayDateTime(acesso.data_acesso)}</TableCell>
                      <TableCell>{acesso.nome_profissional || 'N/A'}</TableCell>
                      <TableCell>{acesso.nome_paciente || 'N/A'}</TableCell>
                      <TableCell><Badge variant="outline">{acesso.nome_unidade_origem || 'N/A'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                          <Badge variant="outline">{acesso.nome_unidade_destino || 'N/A'}</Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import InputMask from 'react-input-mask'; // Importa InputMask
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input'; // Importa Input
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Plus, AlertCircle, CheckCircle, Clock, Trash2, Search } from 'lucide-react'; // Importa Search

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface FilaItem {
  id_fila: number;
  id_paciente: number;
  id_profissional: number;
  nome_paciente?: string;
  prioridade: 'Normal' | 'Urgente';
  data_entrada: string;
  status: 'Aguardando' | 'Notificado';
  canal_notificacao: string | null;
}

interface Paciente {
  id_paciente: number;
  nome_completo: string;
  cpf: string; // Adicionado CPF para filtro
}

interface Profissional {
  id_profissional: number;
  nome_completo: string;
}

const initialFormData = {
  id_paciente: '',
  id_profissional: '',
  prioridade: 'Normal',
  canal_notificacao: 'SMS'
};

const apiFetch = async (endpoint: string, method: string, body: any = null) => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('Usuário não autenticado');
  }
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


export default function FilaEspera() {
  const [filaEspera, setFilaEspera] = useState<FilaItem[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]); // Pacientes agora tem CPF
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estados para Filtros
  const [filterPrioridade, setFilterPrioridade] = useState('all');
  const [filtroNome, setFiltroNome] = useState<string>('');
  const [filtroCpf, setFiltroCpf] = useState<string>('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [filaData, pacienteData, profissionalData] = await Promise.all([
          apiFetch('/fila_espera', 'GET'),
          apiFetch('/pacientes', 'GET'), // Assume que retorna CPF
          apiFetch('/profissionais', 'GET')
      ]);
      setFilaEspera(filaData.data || []);
      setPacientes(pacienteData.data || []); // Guarda pacientes com CPF
      setProfissionais(profissionalData.data || []);
    } catch (err: any) {
      setError(err.message);
      setFilaEspera([]);
      setPacientes([]);
      setProfissionais([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    fetchData();
  }, []);


  const handleAdd = () => {
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.id_paciente || !formData.id_profissional) {
        alert('Paciente e Profissional são obrigatórios.');
        return;
    }

    const dataToSend = {
      id_paciente: parseInt(formData.id_paciente, 10),
      id_profissional: parseInt(formData.id_profissional, 10),
      prioridade: formData.prioridade,
      canal_notificacao: formData.canal_notificacao
    };

    try {
      setIsLoading(true);
      await apiFetch('/fila_espera', 'POST', dataToSend);
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
      alert(`Erro ao adicionar à fila: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificar = async (id: number) => {
    try {
        setIsLoading(true);
        await apiFetch(`/fila_espera/${id}`, 'PUT', { status: 'Notificado' });
        fetchData();
    } catch (err: any) {
        setError(err.message);
        alert(`Erro ao notificar: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAtender = async (id: number) => {
    if (confirm('Confirmar atendimento e remover o paciente da fila?')) {
        try {
            setIsLoading(true);
            await apiFetch(`/fila_espera/${id}`, 'DELETE');
            fetchData();
        } catch (err: any) {
            setError(err.message);
            alert(`Erro ao atender: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }
  };

  // Lógica de Filtro Combinada
  const filteredFila = filaEspera.filter(f => {
      // Filtro Prioridade (Select)
      const matchPrioridade = filterPrioridade === 'all' || f.prioridade === filterPrioridade;

      // Filtro Nome (Input)
      const nomeLowerFiltro = filtroNome.toLowerCase();
      const matchNome = !nomeLowerFiltro || (f.nome_paciente && f.nome_paciente.toLowerCase().includes(nomeLowerFiltro));
      
      // Filtro CPF (InputMask)
      const cpfLimpoFiltro = filtroCpf.replace(/[^\d]/g, ''); 
      let matchCpf = true;
      if (cpfLimpoFiltro) {
          const pacienteFila = pacientes.find(p => p.id_paciente === f.id_paciente);
          const cpfLimpoPaciente = pacienteFila?.cpf?.replace(/[^\d]/g, '');
          matchCpf = !!pacienteFila && cpfLimpoPaciente === cpfLimpoFiltro;
      }

      return matchPrioridade && matchNome && matchCpf; // Combina todos
  });

  const getPrioridadeColor = (prioridade: string): "destructive" | "secondary" => {
    return prioridade === 'Urgente' ? 'destructive' : 'secondary';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Aguardando': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'Notificado': return <AlertCircle className="w-5 h-5 text-blue-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatDisplayDateTime = (isoString: string | undefined | null): string => {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleString('pt-BR');
    } catch { return isoString; }
  }
  
  const userRole = currentUser?.papel;
  const canManage = userRole === 'Administrador' || userRole === 'Recepcionista';
  const canDelete = userRole === 'Administrador';

  const handleClearFilters = () => {
    setFilterPrioridade('all');
    setFiltroNome('');
    setFiltroCpf('');
  };


  return (
    <div className="space-y-6">
      {/* --- Cabeçalho com Botão --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fila de Espera</h1>
          <p className="text-sm text-gray-600">Gerencie a fila de espera de pacientes</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar à Fila
              </Button>
            </DialogTrigger>
            {/* --- Dialog Content (Formulário) --- */}
            <DialogContent className="max-w-xl"> {/* Reduced width */}
              <DialogHeader>
                <DialogTitle>Adicionar Paciente à Fila</DialogTitle>
                <DialogDescription>Preencha os dados para adicionar o paciente</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4"> {/* Added padding top */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Paciente</Label>
                    <Select value={formData.id_paciente} onValueChange={(value: string) => setFormData({ ...formData, id_paciente: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {pacientes.map(p => (
                          <SelectItem key={p.id_paciente} value={String(p.id_paciente)}>{p.nome_completo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Profissional</Label>
                    <Select value={formData.id_profissional} onValueChange={(value: string) => setFormData({ ...formData, id_profissional: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {profissionais.map(p => (
                          <SelectItem key={p.id_profissional} value={String(p.id_profissional)}>{p.nome_completo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={formData.prioridade} onValueChange={(value: 'Normal' | 'Urgente') => setFormData({ ...formData, prioridade: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Canal de Notificação</Label>
                    <Select value={formData.canal_notificacao} onValueChange={(value: string) => setFormData({ ...formData, canal_notificacao: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Telefone">Telefone</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6 border-t pt-4"> {/* Adjusted spacing */}
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

       {/* --- Exibição de Erro --- */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-md">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {/* --- Cards de Resumo --- */}
      {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total na Fila</p>
                    <h3 className="text-2xl font-bold text-gray-900">{filaEspera.length}</h3>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Urgentes</p>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {filaEspera.filter(f => f.prioridade === 'Urgente').length}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Notificados</p>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {filaEspera.filter(f => f.status === 'Notificado').length}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
      )}

      {/* --- Card Principal com Filtros e Tabela --- */}
      <Card>
        <CardHeader>
          {/* Container para Título e Filtros */}
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
              <div>
                <CardTitle>Fila de Espera</CardTitle>
                <CardDescription>Pacientes aguardando atendimento</CardDescription>
              </div>
              {/* Inputs de Filtro */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-end">
                  {/* Select Prioridade */}
                  <div className="min-w-[150px]">
                     <Label htmlFor="filterPrioridade" className="text-xs font-medium">Filtrar Prioridade</Label>
                     <Select value={filterPrioridade} onValueChange={(value: string) => setFilterPrioridade(value)}>
                       <SelectTrigger id="filterPrioridade" className="h-9">
                          <SelectValue placeholder="Todas" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">Todas</SelectItem>
                         <SelectItem value="Urgente">Urgente</SelectItem>
                         <SelectItem value="Normal">Normal</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   {/* Input Nome */}
                   <div className="flex-1 min-w-[150px]">
                      <Label htmlFor="filtroNomeFila" className="text-xs font-medium">Buscar por Nome</Label>
                      <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                              id="filtroNomeFila"
                              type="text"
                              placeholder="Nome..."
                              value={filtroNome}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroNome(e.target.value)}
                              className="h-9 pl-8"
                          />
                      </div>
                   </div>
                   {/* Input CPF */}
                   <div className="min-w-[120px]">
                       <Label htmlFor="filtroCpfFila" className="text-xs font-medium">Buscar por CPF</Label>
                       <InputMask
                          id="filtroCpfFila"
                          mask="999.999.999-99"
                          value={filtroCpf}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroCpf(e.target.value)}
                       >
                         {(inputProps: any) => <Input {...inputProps} placeholder="CPF..." className="h-9"/>}
                       </InputMask>
                   </div>
                   {/* Botão Limpar */}
                   {(filterPrioridade !== 'all' || filtroNome || filtroCpf) && (
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={handleClearFilters}
                         className="h-9" 
                       >
                         Limpar
                       </Button>
                   )}
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Data de Entrada</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-4">Carregando fila de espera...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                // Mensagem Vazio / Filtro Vazio
                ) : filteredFila.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {filterPrioridade !== 'all' || filtroNome || filtroCpf ? 'Nenhum paciente encontrado para os filtros aplicados.' : 'Nenhum paciente na fila de espera.'}
                    </TableCell>
                  </TableRow>
                // Lista Filtrada
                ) : (
                  filteredFila
                    // Ordenação (backend já pode fazer isso, mas garantimos aqui)
                    .sort((a, b) => {
                        // Prioridade Urgente primeiro
                        if (a.prioridade === 'Urgente' && b.prioridade !== 'Urgente') return -1;
                        if (a.prioridade !== 'Urgente' && b.prioridade === 'Urgente') return 1;
                        // Depois por data de entrada (mais antigo primeiro)
                        return a.data_entrada.localeCompare(b.data_entrada);
                    })
                    .map((item: FilaItem) => (
                      <TableRow key={item.id_fila}>
                        <TableCell>{getStatusIcon(item.status)}</TableCell>
                        <TableCell>{item.nome_paciente || 'N/A'}</TableCell>
                        <TableCell>{profissionais.find(p => p.id_profissional === item.id_profissional)?.nome_completo || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getPrioridadeColor(item.prioridade)}>
                            {item.prioridade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDisplayDateTime(item.data_entrada)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.canal_notificacao || '-'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canManage && item.status === 'Aguardando' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleNotificar(item.id_fila)}
                                disabled={isLoading}
                              >
                                Notificar
                              </Button>
                            )}
                            {canDelete && (
                                 <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleAtender(item.id_fila)}
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={isLoading}
                                >
                                    Atender
                                </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
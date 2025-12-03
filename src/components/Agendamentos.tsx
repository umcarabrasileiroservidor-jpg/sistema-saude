import { useState, useEffect } from 'react';
import InputMask from 'react-input-mask';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Calendar as CalendarIcon, Plus, Edit, Trash2, Clock, Search } from 'lucide-react'; // Importa Search
import { Skeleton } from './ui/skeleton'; // Importa Skeleton

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface Agendamento {
  id_agendamento: number;
  id_paciente: number;
  id_profissional: number;
  nome_paciente?: string;
  nome_profissional?: string;
  data_hora: string;
  status: string;
  historico_alteracao: string | null;
  data_alteracao?: string;
}

interface Paciente {
  id_paciente: number;
  nome_completo: string;
  cpf: string;
}

interface Profissional {
  id_profissional: number;
  nome_completo: string;
}

const initialFormData = {
  id_paciente: '',
  id_profissional: '',
  data: '',
  hora: '',
  status: 'Confirmado',
  historico_alteracao: ''
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

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [filtroData, setFiltroData] = useState<string>('');
  const [filtroCpf, setFiltroCpf] = useState<string>('');
  const [filtroNome, setFiltroNome] = useState<string>('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [agendamentoData, pacienteData, profissionalData] = await Promise.all([
          apiFetch('/agendamentos', 'GET'),
          apiFetch('/pacientes', 'GET'),
          apiFetch('/profissionais', 'GET')
      ]);
      setAgendamentos(agendamentoData.data || []);
      setPacientes(pacienteData.data || []);
      setProfissionais(profissionalData.data || []);
    } catch (err: any) {
      setError(err.message);
      setAgendamentos([]);
      setPacientes([]);
      setProfissionais([]);
    } finally {
      setTimeout(() => setIsLoading(false), 300); // Delay visual
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
    setEditingAgendamento(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (agendamento: Agendamento) => {
    setEditingAgendamento(agendamento);
    
    // CORREÇÃO DEFINITIVA DE DATA/HORA
    const d = new Date(agendamento.data_hora);
    
    // Pega os dados locais do navegador (Brasil) um por um
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
    const dia = String(d.getDate()).padStart(2, '0');
    
    const hora = String(d.getHours()).padStart(2, '0');
    const minuto = String(d.getMinutes()).padStart(2, '0');

    // Monta as strings manualmente: YYYY-MM-DD e HH:mm
    const dataCorreta = `${ano}-${mes}-${dia}`;
    const horaCorreta = `${hora}:${minuto}`;

    setFormData({
      id_paciente: String(agendamento.id_paciente),
      id_profissional: String(agendamento.id_profissional),
      data: dataCorreta, // Usa a data montada manualmente
      hora: horaCorreta, // Usa a hora montada manualmente
      status: agendamento.status || 'Confirmado',
      historico_alteracao: agendamento.historico_alteracao || ''
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.id_paciente || !formData.id_profissional || !formData.data || !formData.hora || !formData.status) {
        alert('Todos os campos (exceto histórico) são obrigatórios.');
        return;
    }

    const dataHoraISO = `${formData.data}T${formData.hora}:00`;

    const dataToSend = {
      id_paciente: parseInt(formData.id_paciente, 10),
      id_profissional: parseInt(formData.id_profissional, 10),
      data_hora: dataHoraISO,
      status: formData.status,
      historico_alteracao: formData.historico_alteracao
    };

    try {
      setIsLoading(true);
      if (editingAgendamento) {
        await apiFetch(`/agendamentos/${editingAgendamento.id_agendamento}`, 'PUT', dataToSend);
      } else {
        await apiFetch('/agendamentos', 'POST', dataToSend);
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
      alert(`Erro ao salvar agendamento: ${err.message}`);
      setIsLoading(false); // Para loading em caso de erro
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente excluir este agendamento? Esta ação é permanente.')) {
      try {
        setIsLoading(true);
        await apiFetch(`/agendamentos/${id}`, 'DELETE');
        fetchData();
      } catch (err: any) {
        setError(err.message);
        alert(`Erro ao excluir agendamento: ${err.message}`);
        setIsLoading(false);
      }
    }
  };


  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Confirmado': return 'default';
      case 'Pendente': return 'secondary';
      case 'Cancelado': return 'destructive';
      case 'Realizado': return 'outline';
      default: return 'secondary';
    }
  };

  const agendamentosFiltrados = agendamentos.filter(ag => {
      const matchData = !filtroData || ag.data_hora.startsWith(filtroData);

      const cpfLimpoFiltro = filtroCpf.replace(/[^\d]/g, ''); 
      let matchCpf = true;
      if (cpfLimpoFiltro) {
          const pacienteAgendamento = pacientes.find(p => p.id_paciente === ag.id_paciente);
          const cpfLimpoPaciente = pacienteAgendamento?.cpf?.replace(/[^\d]/g, ''); 
          matchCpf = !!pacienteAgendamento && cpfLimpoPaciente === cpfLimpoFiltro;
      }
      
      const nomeLowerFiltro = filtroNome.toLowerCase();
      const matchNome = !nomeLowerFiltro || (ag.nome_paciente && ag.nome_paciente.toLowerCase().includes(nomeLowerFiltro));
      
      return matchData && matchCpf && matchNome;
  });

  const agendamentosPorData = agendamentosFiltrados.reduce((acc: { [key: string]: Agendamento[] }, agendamento) => {
    const data = agendamento.data_hora.split('T')[0];
    if (!acc[data]) {
      acc[data] = [];
    }
    acc[data].push(agendamento);
    return acc;
  }, {});

  const userRole = currentUser?.papel;
  const canManage = userRole === 'Administrador' || userRole === 'Recepcionista';
  const canDelete = userRole === 'Administrador';

  const formatDateTime = (isoString: string | undefined | null) => {
    if (!isoString) return { date: '-', time: '-', fullDate: '-' };
    try {
        const date = new Date(isoString);
        return {
            date: date.toLocaleDateString('pt-BR'),
            time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            fullDate: date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        };
    } catch {
        return { date: isoString, time: '-', fullDate: isoString };
    }
  }

  // Skeleton para Loading dos Grupos de Agendamento
  const AgendaSkeleton = () => (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i}>
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-sm text-gray-600">Gerencie os agendamentos da unidade</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 shadow hover:shadow-lg transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingAgendamento ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
                <DialogDescription>Preencha os dados do agendamento</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <Label>Paciente</Label>
                  <Select value={formData.id_paciente} onValueChange={(value: string) => setFormData({ ...formData, id_paciente: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
                    <SelectContent>
                      {profissionais.map(p => (
                        <SelectItem key={p.id_profissional} value={String(p.id_profissional)}>{p.nome_completo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={formData.data} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, data: e.target.value })} />
                </div>
                <div>
                  <Label>Hora</Label>
                  <Input type="time" value={formData.hora} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, hora: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value: string) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Confirmado">Confirmado</SelectItem>
                      <SelectItem value="Realizado">Realizado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? (editingAgendamento ? 'Salvando...' : 'Criando...') : 'Salvar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-md animate-shake">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {/* Grid Principal (Calendário + Estatísticas) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                <div>
                  <CardTitle>Calendário de Agendamentos</CardTitle>
                  <CardDescription>
                    {isLoading ? 'Carregando...' : `Visualizando ${agendamentosFiltrados.length} ${agendamentosFiltrados.length !== 1 ? 'agendamentos' : 'agendamento'}`}
                  </CardDescription>
                </div>
                {/* Inputs de Filtro */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-end">
                   <div>
                      <Label htmlFor="filtroData" className="text-xs font-medium">Filtrar Data</Label>
                      <Input
                        id="filtroData"
                        type="date"
                        value={filtroData}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroData(e.target.value)}
                        className="h-9"
                      />
                   </div>
                   <div>
                       <Label htmlFor="filtroCpf" className="text-xs font-medium">Filtrar CPF</Label>
                       <InputMask
                          id="filtroCpf"
                          mask="999.999.999-99"
                          value={filtroCpf}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroCpf(e.target.value)}
                       >
                         {(inputProps: any) => <Input {...inputProps} placeholder="CPF..." className="h-9 w-32"/>}
                       </InputMask>
                   </div>
                   <div>
                      <Label htmlFor="filtroNome" className="text-xs font-medium">Filtrar Nome</Label>
                       <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            id="filtroNome"
                            type="text"
                            placeholder="Nome..."
                            value={filtroNome}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroNome(e.target.value)}
                            className="h-9 pl-8"
                          />
                       </div>
                   </div>
                   {(filtroData || filtroCpf || filtroNome) && (
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => { setFiltroData(''); setFiltroCpf(''); setFiltroNome(''); }}
                         className="h-9" 
                       >
                         Limpar
                       </Button>
                   )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                 <AgendaSkeleton />
              ) : Object.keys(agendamentosPorData).length === 0 ? (
                 <div className="text-center py-16 text-gray-500">
                   <Search className="w-12 h-12 mx-auto text-gray-400" />
                   <h3 className="mt-2 text-lg font-medium">Nenhum agendamento encontrado</h3>
                   <p className="mt-1 text-sm">
                     {filtroData || filtroCpf || filtroNome ? 'Ajuste os filtros ou limpe-os para ver mais resultados.' : 'Quando um agendamento for criado, ele aparecerá aqui.'}
                   </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.keys(agendamentosPorData).sort((a,b) => a.localeCompare(b)).map(data => ( // Ordena as datas
                    <div key={data}>
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarIcon className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-lg text-gray-900">
                          {formatDateTime(data + 'T00:00:00').fullDate}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {agendamentosPorData[data]
                          .sort((a: Agendamento, b: Agendamento) => a.data_hora.localeCompare(b.data_hora))
                          .map((agendamento: Agendamento) => {
                             const { time } = formatDateTime(agendamento.data_hora);
                             return (
                              <div
                                key={agendamento.id_agendamento}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                  <div className="flex items-center gap-2 text-blue-600 font-medium min-w-[70px] flex-shrink-0">
                                    <Clock className="w-4 h-4" />
                                    <span>{time}</span>
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                    <p className="font-medium text-gray-900 truncate" title={agendamento.nome_paciente}>{agendamento.nome_paciente || 'Paciente não encontrado'}</p>
                                    <p className="text-sm text-gray-600 truncate" title={agendamento.nome_profissional}>{agendamento.nome_profissional || 'Profissional não encontrado'}</p>
                                  </div>
                                  <Badge variant={getStatusColor(agendamento.status)} className="flex-shrink-0">
                                    {agendamento.status}
                                  </Badge>
                                </div>
                                <div className="flex gap-1 ml-2 flex-shrink-0">
                                  {canManage && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(agendamento)} title="Editar">
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {canDelete && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(agendamento.id_agendamento)} title="Excluir">
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                             );
                           })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card de Estatísticas */}
          <div className="space-y-6 lg:sticky lg:top-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Estatísticas (Filtradas)</CardTitle>
                <CardDescription>Resumo dos agendamentos visíveis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg flex justify-between items-center">
                  <p className="text-sm text-gray-600">Total na Lista</p>
                  <p className="text-lg font-semibold text-gray-900">{agendamentosFiltrados.length}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg flex justify-between items-center">
                  <p className="text-sm text-gray-600">Confirmados</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {agendamentosFiltrados.filter(a => a.status === 'Confirmado').length}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg flex justify-between items-center">
                  <p className="text-sm text-gray-600">Pendentes</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {agendamentosFiltrados.filter(a => a.status === 'Pendente').length}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg flex justify-between items-center">
                  <p className="text-sm text-gray-600">Cancelados</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {agendamentosFiltrados.filter(a => a.status === 'Cancelado').length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}
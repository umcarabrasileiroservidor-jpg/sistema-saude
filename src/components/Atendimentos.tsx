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
import { Textarea } from './ui/textarea';
import { Plus, Edit, Trash2, Activity, Search } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface Atendimento {
  id_atendimento: number;
  id_paciente: number;
  id_profissional: number;
  nome_paciente?: string;
  nome_profissional?: string;
  tipo_atendimento: string;
  data_atendimento: string;
  status: string;
  observacoes: string | null;
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
  tipo_atendimento: 'Consulta',
  data_atendimento: '',
  status: 'Realizado',
  observacoes: ''
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

export default function Atendimentos() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [filtroData, setFiltroData] = useState<string>('');
  const [filtroCpf, setFiltroCpf] = useState<string>('');
  const [filtroNome, setFiltroNome] = useState<string>('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAtendimento, setEditingAtendimento] = useState<Atendimento | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [atendimentoData, pacienteData, profissionalData] = await Promise.all([
          apiFetch('/atendimentos', 'GET'),
          apiFetch('/pacientes', 'GET'),
          apiFetch('/profissionais', 'GET')
      ]);
      setAtendimentos(atendimentoData.data || []);
      setPacientes(pacienteData.data || []);
      setProfissionais(profissionalData.data || []);
    } catch (err: any) {
      setError(err.message);
      setAtendimentos([]);
      setPacientes([]);
      setProfissionais([]);
    } finally {
      setTimeout(() => setIsLoading(false), 300);
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
    setEditingAtendimento(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (atendimento: Atendimento) => {
    setEditingAtendimento(atendimento);

    let dataHoraValue = '';

    if (atendimento.data_atendimento) {
        try {
            // CORREÇÃO DE FUSO HORÁRIO (PARA EDIÇÃO)
            const d = new Date(atendimento.data_atendimento);
            
            // Adiciona o offset para compensar a conversão do navegador
            const userTimezoneOffset = d.getTimezoneOffset() * 60000;
            const dataLocal = new Date(d.getTime() + userTimezoneOffset);
            
            const ano = dataLocal.getFullYear();
            const mes = String(dataLocal.getMonth() + 1).padStart(2, '0');
            const dia = String(dataLocal.getDate()).padStart(2, '0');
            const hora = String(dataLocal.getHours()).padStart(2, '0');
            const minuto = String(dataLocal.getMinutes()).padStart(2, '0');

            // Formato para o input: YYYY-MM-DDTHH:mm
            dataHoraValue = `${ano}-${mes}-${dia}T${hora}:${minuto}`;
            
        } catch (e) { console.error("Erro ao formatar data:", e); }
    }
    
    setFormData({
      id_paciente: String(atendimento.id_paciente),
      id_profissional: String(atendimento.id_profissional),
      tipo_atendimento: atendimento.tipo_atendimento || 'Consulta',
      data_atendimento: dataHoraValue,
      status: atendimento.status || 'Realizado',
      observacoes: atendimento.observacoes || ''
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.id_paciente || !formData.id_profissional || !formData.tipo_atendimento || !formData.data_atendimento || !formData.status) {
        alert('Paciente, Profissional, Tipo, Data/Hora e Status são obrigatórios.');
        return;
    }

    const dataHoraISO = `${formData.data_atendimento}:00`;

    const dataToSend = {
      id_paciente: parseInt(formData.id_paciente, 10),
      id_profissional: parseInt(formData.id_profissional, 10),
      tipo_atendimento: formData.tipo_atendimento,
      data_atendimento: dataHoraISO,
      status: formData.status,
      observacoes: formData.observacoes || null
    };

    try {
      setIsLoading(true);
      if (editingAtendimento) {
        await apiFetch(`/atendimentos/${editingAtendimento.id_atendimento}`, 'PUT', dataToSend);
      } else {
        await apiFetch('/atendimentos', 'POST', dataToSend);
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
      alert(`Erro ao salvar atendimento: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente excluir este atendimento? Esta ação é permanente.')) {
      try {
        setIsLoading(true);
        await apiFetch(`/atendimentos/${id}`, 'DELETE');
        fetchData();
      } catch (err: any) {
        setError(err.message);
        alert(`Erro ao excluir atendimento: ${err.message}`);
        setIsLoading(false);
      }
    }
  };

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Agendado': return 'secondary';
      case 'Em Andamento': return 'default';
      case 'Concluído': return 'outline';
      case 'Cancelado': return 'destructive';
      default: return 'secondary';
    }
  };

  // --- CORREÇÃO DE DATA/HORA PARA VISUALIZAÇÃO NA TABELA ---
  const formatDisplayDateTime = (isoString: string | undefined | null): string => {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        // Adiciona o offset para mostrar a hora que foi salva no banco, sem a subtração do navegador
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const offsetDate = new Date(date.getTime() + userTimezoneOffset);

        return offsetDate.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return isoString;
    }
  };

  // Lógica de Filtro
  const atendimentosFiltrados = atendimentos.filter(at => {
      const matchData = !filtroData || at.data_atendimento.startsWith(filtroData);

      const cpfLimpoFiltro = filtroCpf.replace(/[^\d]/g, ''); 
      let matchCpf = true;
      if (cpfLimpoFiltro) {
          const pacienteAtendimento = pacientes.find(p => p.id_paciente === at.id_paciente);
          const cpfLimpoPaciente = pacienteAtendimento?.cpf?.replace(/[^\d]/g, '');
          matchCpf = !!pacienteAtendimento && cpfLimpoPaciente === cpfLimpoFiltro;
      }
      
      const nomeLowerFiltro = filtroNome.toLowerCase();
      const matchNome = !nomeLowerFiltro || (at.nome_paciente && at.nome_paciente.toLowerCase().includes(nomeLowerFiltro));
      
      return matchData && matchCpf && matchNome;
  });

  const userRole = currentUser?.papel;
  const canManage = userRole === 'Administrador' || userRole === 'Profissional';
  const canDelete = userRole === 'Administrador';

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atendimentos</h1>
          <p className="text-sm text-gray-600">Registre e acompanhe os atendimentos</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 shadow hover:shadow-lg transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Novo Atendimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingAtendimento ? 'Editar Atendimento' : 'Novo Atendimento'}</DialogTitle>
                <DialogDescription>Preencha os dados do atendimento</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
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
                    <Label>Tipo de Atendimento</Label>
                    <Select value={formData.tipo_atendimento} onValueChange={(value: string) => setFormData({ ...formData, tipo_atendimento: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consulta">Consulta</SelectItem>
                        <SelectItem value="Retorno">Retorno</SelectItem>
                        <SelectItem value="Exame">Exame</SelectItem>
                        <SelectItem value="Procedimento">Procedimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data e Hora</Label>
                    <Input
                      type="datetime-local"
                      value={formData.data_atendimento}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, data_atendimento: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value: string) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={4}
                    placeholder="Observações sobre o atendimento..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                   {isLoading ? (editingAtendimento ? 'Salvando...' : 'Criando...') : 'Salvar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-md">
          <strong>Erro:</strong> {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div>
              <CardTitle>Lista de Atendimentos</CardTitle>
              <CardDescription>
                 {isLoading ? 'Carregando...' : `Visualizando ${atendimentosFiltrados.length} ${atendimentosFiltrados.length !== 1 ? 'atendimentos' : 'atendimento'}`}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
               <div>
                  <Label htmlFor="filtroDataAtendimento" className="text-xs font-medium">Filtrar Data</Label>
                  <Input
                    id="filtroDataAtendimento"
                    type="date"
                    value={filtroData}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroData(e.target.value)}
                    className="h-9"
                  />
               </div>
               <div>
                   <Label htmlFor="filtroCpfAtendimento" className="text-xs font-medium">Filtrar CPF</Label>
                   <InputMask
                      id="filtroCpfAtendimento"
                      mask="999.999.999-99"
                      value={filtroCpf}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroCpf(e.target.value)}
                   >
                     {(inputProps: any) => <Input {...inputProps} placeholder="CPF..." className="h-9 w-32"/>}
                   </InputMask>
               </div>
               <div>
                  <Label htmlFor="filtroNomeAtendimento" className="text-xs font-medium">Filtrar Nome</Label>
                  <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        id="filtroNomeAtendimento"
                        type="text"
                        placeholder="Nome..."
                        value={filtroNome}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroNome(e.target.value)}
                        className="h-9 pl-8 flex-1"
                      />
                  </div>
               </div>
               {(filtroData || filtroCpf || filtroNome) && (
                   <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => { setFiltroData(''); setFiltroCpf(''); setFiltroNome(''); }}
                     className="self-end h-9" 
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
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-4">Carregando atendimentos...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : atendimentosFiltrados.length === 0 ? ( 
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {filtroData || filtroCpf || filtroNome ? 'Nenhum atendimento encontrado para os filtros aplicados.' : 'Nenhum atendimento encontrado.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  atendimentosFiltrados 
                    .sort((a, b) => b.data_atendimento.localeCompare(a.data_atendimento))
                    .map((atendimento: Atendimento) => (
                      <TableRow key={atendimento.id_atendimento} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          {/* AQUI ESTA A CHAMADA DA FUNÇÃO CORRIGIDA */}
                          {formatDisplayDateTime(atendimento.data_atendimento)}
                        </TableCell>
                        <TableCell>{atendimento.nome_paciente || 'N/A'}</TableCell>
                        <TableCell>{atendimento.nome_profissional || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{atendimento.tipo_atendimento}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(atendimento.status)}>
                            {atendimento.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-gray-600" title={atendimento.observacoes || ''}>
                          {atendimento.observacoes}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canManage && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(atendimento)} title="Editar Atendimento">
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(atendimento.id_atendimento)} title="Excluir Atendimento">
                                <Trash2 className="w-4 h-4 text-red-600 hover:text-red-700" />
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
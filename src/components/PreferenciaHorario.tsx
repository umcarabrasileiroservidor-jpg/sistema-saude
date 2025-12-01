import { useState, useEffect } from 'react';
import InputMask from 'react-input-mask'; // Importa InputMask
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input'; // Importa Input
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Edit, Trash2, Clock, Search, User } from 'lucide-react'; // Importa Search e User
import { Skeleton } from './ui/skeleton'; // Para um loading mais visual

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface Preferencia {
  id_preferencia: number;
  id_paciente: number;
  nome_paciente?: string;
  data_hora_preferida: string;
}

interface Paciente {
  id_paciente: number;
  nome_completo: string;
  cpf: string; // Adicionado CPF
}

const initialFormData = {
  id_paciente: '',
  data_hora_preferida: '',
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

export default function PreferenciaHorario() {
  const [preferencias, setPreferencias] = useState<Preferencia[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]); // Pacientes agora tem CPF
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estados para Filtros
  const [filtroNome, setFiltroNome] = useState<string>('');
  const [filtroCpf, setFiltroCpf] = useState<string>('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreferencia, setEditingPreferencia] = useState<Preferencia | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [prefData, pacienteData] = await Promise.all([
        apiFetch('/preferencia_horario', 'GET'),
        apiFetch('/pacientes', 'GET') // Assume que retorna CPF
      ]);
      setPreferencias(prefData.data || []);
      setPacientes(pacienteData.data || []); // Armazena pacientes com CPF
    } catch (err: any) {
      setError(err.message);
      setPreferencias([]);
      setPacientes([]);
    } finally {
      // Pequeno delay para simular carregamento e evitar piscar a tela
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
    setEditingPreferencia(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (preferencia: Preferencia) => {
    setEditingPreferencia(preferencia);
    const dataHoraLocal = preferencia.data_hora_preferida ? preferencia.data_hora_preferida.substring(0, 16) : '';
    setFormData({
      id_paciente: String(preferencia.id_paciente),
      data_hora_preferida: dataHoraLocal,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.id_paciente || !formData.data_hora_preferida) {
      alert('Paciente e Data/Hora são obrigatórios.');
      return;
    }

    const dataToSend = {
      id_paciente: parseInt(formData.id_paciente, 10),
      data_hora_preferida: `${formData.data_hora_preferida}:00`,
    };

    try {
      setIsLoading(true);
      if (editingPreferencia) {
        await apiFetch(`/preferencia_horario/${editingPreferencia.id_preferencia}`, 'PUT', dataToSend);
      } else {
        await apiFetch('/preferencia_horario', 'POST', dataToSend);
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
      alert(`Erro ao salvar preferência: ${err.message}`);
    } finally {
      // setIsLoading(false); // fetchData já faz isso
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente excluir esta preferência?')) {
      try {
        setIsLoading(true);
        await apiFetch(`/preferencia_horario/${id}`, 'DELETE');
        fetchData();
      } catch (err: any) {
        setError(err.message);
        alert(`Erro ao excluir preferência: ${err.message}`);
        setIsLoading(false); // Garante que loading para em caso de erro
      }
    }
  };

  // Lógica de Filtro Combinada
  const filteredPreferencias = preferencias.filter(pref => {
      // Filtro por Nome (do Input)
      const nomeLowerFiltro = filtroNome.toLowerCase();
      // Usa o nome_paciente que já vem na resposta da API /preferencia_horario
      const matchNome = !nomeLowerFiltro || (pref.nome_paciente && pref.nome_paciente.toLowerCase().includes(nomeLowerFiltro));

      // Filtro por CPF (do InputMask)
      const cpfLimpoFiltro = filtroCpf.replace(/[^\d]/g, ''); 
      let matchCpf = true;
      if (cpfLimpoFiltro) {
          // Busca o paciente correspondente na lista de pacientes (que tem o CPF)
          const pacientePref = pacientes.find(p => p.id_paciente === pref.id_paciente);
          const cpfLimpoPaciente = pacientePref?.cpf?.replace(/[^\d]/g, ''); 
          matchCpf = !!pacientePref && cpfLimpoPaciente === cpfLimpoFiltro;
      }

      return matchNome && matchCpf; // Combina os filtros
  });

  const formatDisplayDateTime = (isoString: string | undefined | null) => {
    if (!isoString) return { date: '-', time: '-' };
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString('pt-BR'),
        time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
    } catch { return { date: isoString, time: '-' }; }
  };
  
  const userRole = currentUser?.papel;
  const canManage = userRole === 'Administrador' || userRole === 'Recepcionista';

  const handleClearFilters = () => {
    setFiltroNome('');
    setFiltroCpf('');
  };

  // Componente Skeleton para Loading da Tabela
  const TableSkeleton = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={`skel-${index}`}>
        <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
        <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-16 inline-block" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="space-y-6 animate-fadeIn"> {/* Animação simples */}
      {/* --- Cabeçalho com Botão --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preferências de Horário</h1>
          <p className="text-sm text-gray-600">Gerencie as preferências de horário dos pacientes</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 shadow hover:shadow-lg transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Nova Preferência
              </Button>
            </DialogTrigger>
            {/* --- Dialog Content (Formulário) --- */}
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPreferencia ? 'Editar Preferência' : 'Nova Preferência de Horário'}</DialogTitle>
                <DialogDescription>Registre a preferência de horário do paciente</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
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
                  <Label>Data e Hora Preferida</Label>
                  <Input
                    type="datetime-local"
                    value={formData.data_hora_preferida}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, data_hora_preferida: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6 border-t pt-4"> {/* Ajustado espaçamento */}
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* --- Exibição de Erro --- */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-md animate-shake"> {/* Animação de erro */}
          <strong>Erro:</strong> {error}
        </div>
      )}

      {/* --- Card Principal com Filtros e Tabela --- */}
      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow"> {/* Efeito suave no card */}
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
              <div>
                <CardTitle>Preferências Cadastradas</CardTitle>
                <CardDescription>
                  {isLoading ? 'Carregando...' : `Total de ${filteredPreferencias.length} ${filteredPreferencias.length !== 1 ? 'preferências' : 'preferência'} ${filtroNome || filtroCpf ? 'encontradas' : 'registradas'}`}
                </CardDescription>
              </div>
              {/* Inputs de Filtro */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-end">
                   {/* Input Nome */}
                   <div className="flex-1 min-w-[150px]">
                      <Label htmlFor="filtroNomePref" className="text-xs font-medium">Buscar por Nome</Label>
                      <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                              id="filtroNomePref"
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
                       <Label htmlFor="filtroCpfPref" className="text-xs font-medium">Buscar por CPF</Label>
                       <InputMask
                          id="filtroCpfPref"
                          mask="999.999.999-99"
                          value={filtroCpf}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroCpf(e.target.value)}
                       >
                         {(inputProps: any) => <Input {...inputProps} placeholder="CPF..." className="h-9"/>}
                       </InputMask>
                   </div>
                   {/* Botão Limpar */}
                   {(filtroNome || filtroCpf) && (
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={handleClearFilters}
                         className="h-9" 
                         title="Limpar filtros"
                       >
                         Limpar
                       </Button>
                   )}
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto"> {/* Tabela rolável em telas menores */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Paciente</TableHead> {/* Largura definida */}
                  <TableHead className="w-[40%]">Data e Hora Preferida</TableHead> {/* Largura definida */}
                  <TableHead className="text-right w-[20%]">Ações</TableHead> {/* Largura definida */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableSkeleton /> // Usa o Skeleton
                // Mensagem Vazio / Filtro Vazio
                ) : filteredPreferencias.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                             <Search className="w-10 h-10 text-gray-400" />
                             <span>
                               {filtroNome || filtroCpf ? 'Nenhuma preferência encontrada para os filtros aplicados.' : 'Nenhuma preferência cadastrada ainda.'}
                             </span>
                          </div>
                      </TableCell>
                  </TableRow>
                // Lista Filtrada
                ) : (
                  filteredPreferencias
                    // Ordena por data preferida (mais recente primeiro)
                    .sort((a, b) => (b.data_hora_preferida || '').localeCompare(a.data_hora_preferida || ''))
                    .map((preferencia) => {
                       const { date, time } = formatDisplayDateTime(preferencia.data_hora_preferida);
                       return (
                          <TableRow key={preferencia.id_preferencia} className="hover:bg-muted/50 transition-colors"> {/* Efeito hover */}
                            <TableCell>
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
                                      <User className="w-4 h-4" />
                                   </div>
                                   <span className="font-medium truncate" title={preferencia.nome_paciente}>{preferencia.nome_paciente || 'Paciente N/A'}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span>{date} às {time}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {canManage && (
                                  <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(preferencia)} title="Editar">
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(preferencia.id_preferencia)} title="Excluir">
                                      <Trash2 className="w-4 h-4 text-red-600 hover:text-red-700" />
                                    </Button>
                                  </div>
                              )}
                            </TableCell>
                          </TableRow>
                       );
                    })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
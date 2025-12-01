import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InputMask from 'react-input-mask';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Plus, Edit, Trash2, FileText, Calendar, Search, Printer, FileBadge } from 'lucide-react'; // Importa FileBadge
import { Skeleton } from './ui/skeleton';
import ModalAtestado from './ModalAtestado'; // NOVO: Importa o modal de atestado

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// ... (Interfaces Evolucao, Paciente, Profissional, Atendimento, apiFetch) ...
// (O código existente dessas funções permanece o mesmo)
interface Evolucao {
  id_evolucao: number;
  id_paciente: number;
  id_profissional: number;
  id_atendimento: number | null;
  nome_paciente?: string;
  nome_profissional?: string;
  data_registro: string;
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

interface Atendimento {
    id_atendimento: number;
    id_paciente: number;
    id_profissional?: number;
    nome_paciente?: string;
    data_atendimento: string;
    tipo_atendimento: string;
}

const initialFormData = {
  id_paciente: '',
  id_profissional: '',
  id_atendimento: 'null',
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

export default function EvolucaoMedica() {
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [selectedPacienteId, setSelectedPacienteId] = useState<string>('all');
  const [filtroNome, setFiltroNome] = useState<string>('');
  const [filtroCpf, setFiltroCpf] = useState<string>('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvolucao, setEditingEvolucao] = useState<Evolucao | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  // --- NOVO: Estados para o Modal de Atestado ---
  const [isAtestadoModalOpen, setIsAtestadoModalOpen] = useState(false);
  const [selectedEvolucao, setSelectedEvolucao] = useState<Evolucao | null>(null);
  // ---

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // ... (fetchData, useEffect, handleAdd, handleEdit, handleSave, handleDelete, handlePrint) ...
  // (O código existente dessas funções permanece o mesmo)
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [evoData, pacData, profData, atendData] = await Promise.all([
          apiFetch('/evolucao_medica', 'GET'),
          apiFetch('/pacientes', 'GET'),
          apiFetch('/profissionais', 'GET'),
          apiFetch('/atendimentos', 'GET')
      ]);
      setEvolucoes(evoData.data || []);
      setPacientes(pacData.data || []);
      setProfissionais(profData.data || []);
      setAtendimentos(atendData.data || []);
    } catch (err: any) {
      setError(err.message);
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
    setEditingEvolucao(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (evolucao: Evolucao) => {
    setEditingEvolucao(evolucao);
    setFormData({
      id_paciente: String(evolucao.id_paciente),
      id_profissional: String(evolucao.id_profissional),
      id_atendimento: evolucao.id_atendimento ? String(evolucao.id_atendimento) : "null",
      observacoes: evolucao.observacoes || ''
    });
    setIsDialogOpen(true);
  };

  const handlePrint = (evolucao: Evolucao) => {
    navigate('/imprimir/evolucao', { state: { evolucao: evolucao } });
  };

  const handleSave = async () => {
    if (!formData.id_paciente || !formData.id_profissional || !formData.observacoes) {
        alert('Paciente, Profissional e Observações são obrigatórios.');
        return;
    }
    const dataToSend = {
      id_paciente: parseInt(formData.id_paciente, 10),
      id_profissional: parseInt(formData.id_profissional, 10),
      id_atendimento: formData.id_atendimento && formData.id_atendimento !== "null" ? parseInt(formData.id_atendimento, 10) : null,
      observacoes: formData.observacoes
    };
    try {
      setIsLoading(true);
      if (editingEvolucao) {
        await apiFetch(`/evolucao_medica/${editingEvolucao.id_evolucao}`, 'PUT', dataToSend);
      } else {
        await apiFetch('/evolucao_medica', 'POST', dataToSend);
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
      alert(`Erro ao salvar evolução: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente excluir este registro de evolução? Esta ação é permanente.')) {
      try {
        setIsLoading(true);
        await apiFetch(`/evolucao_medica/${id}`, 'DELETE');
        fetchData();
      } catch (err: any) {
        setError(err.message);
        alert(`Erro ao excluir evolução: ${err.message}`);
        setIsLoading(false);
      }
    }
  };
  
  // --- NOVO: Abre o modal de atestado ---
  const handleOpenAtestadoModal = (evolucao: Evolucao) => {
    setSelectedEvolucao(evolucao);
    setIsAtestadoModalOpen(true);
  };
  
  // ... (filteredEvolucoes, userRole, formatDisplayDateTime, formatAtendimentoOption, handleClearFilters, CardSkeleton) ...
  // (O código existente dessas funções permanece o mesmo)
  const filteredEvolucoes = evolucoes.filter(e => {
      const matchIdSelect = selectedPacienteId === 'all' || String(e.id_paciente) === selectedPacienteId;
      const nomeLowerFiltro = filtroNome.toLowerCase();
      const matchNome = !nomeLowerFiltro || (e.nome_paciente && e.nome_paciente.toLowerCase().includes(nomeLowerFiltro));
      const cpfLimpoFiltro = filtroCpf.replace(/[^\d]/g, ''); 
      let matchCpf = true;
      if (cpfLimpoFiltro) {
          const pacienteEvolucao = pacientes.find(p => p.id_paciente === e.id_paciente);
          const cpfLimpoPaciente = pacienteEvolucao?.cpf?.replace(/[^\d]/g, ''); 
          matchCpf = !!pacienteEvolucao && cpfLimpoPaciente === cpfLimpoFiltro;
      }
      return matchIdSelect && matchNome && matchCpf;
  });

  const userRole = currentUser?.papel;
  const canManage = userRole === 'Administrador' || userRole === 'Profissional';
  const canDelete = userRole === 'Administrador';

  const formatDisplayDateTime = (isoString: string | undefined | null): string => {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch { return isoString; }
  }

  const formatAtendimentoOption = (atendimento: Atendimento): string => {
    const dataFormatada = formatDisplayDateTime(atendimento.data_atendimento);
    return `${atendimento.nome_paciente || 'Paciente N/A'} - ${atendimento.tipo_atendimento} (${dataFormatada})`;
  }

  const handleClearFilters = () => {
      setSelectedPacienteId('all');
      setFiltroNome('');
      setFiltroCpf('');
  };

  const CardSkeleton = () => (
    <Card className="border-l-4 border-l-gray-200 overflow-hidden">
        <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start justify-between mb-4 gap-2">
                <div className="flex items-start gap-4 flex-1">
                    <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2 mt-1">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                    </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                </div>
            </div>
            <div className="md:ml-16 mt-4 p-4 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </div>
        </CardContent>
    </Card>
  );

  return (
    <> {/* Adiciona Fragmento para o Modal */}
      <div className="space-y-6 animate-fadeIn">
        {/* ... (Cabeçalho da Página e Modal de Adicionar/Editar Evolução) ... */}
        {/* (O Dialog para Adicionar/Editar Evolução permanece o mesmo) */}
        <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Evolução Médica</h1>
              <p className="text-sm text-gray-600">Registros de evolução clínica dos pacientes</p>
            </div>
            {canManage && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 shadow hover:shadow-lg transition-all">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Evolução
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  {/* ... (Conteúdo do Modal de Evolução) ... */}
                   <DialogHeader>
                    <DialogTitle>{editingEvolucao ? 'Editar Evolução Médica' : 'Nova Evolução Médica'}</DialogTitle>
                    <DialogDescription>Registre a evolução clínica do paciente</DialogDescription>
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
                    </div>
                    <div>
                      <Label>Atendimento Vinculado (Opcional)</Label>
                      <Select value={formData.id_atendimento} onValueChange={(value: string) => setFormData({ ...formData, id_atendimento: value })}>
                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">Nenhum</SelectItem>
                          {atendimentos
                            .filter(a => !formData.id_paciente || String(a.id_paciente) === formData.id_paciente)
                            .sort((a,b) => b.data_atendimento.localeCompare(a.data_atendimento))
                            .map(a => (
                                <SelectItem key={a.id_atendimento} value={String(a.id_atendimento)}>
                                    {formatAtendimentoOption(a)}
                                </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Observações Clínicas</Label>
                      <Textarea
                        value={formData.observacoes}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, observacoes: e.target.value })}
                        rows={8}
                        placeholder="Descreva a evolução clínica do paciente, exames realizados, prescrições, etc..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                      {isLoading ? (editingEvolucao ? 'Salvando...' : 'Criando...') : 'Salvar'}
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

        {/* ... (Card de Filtros) ... */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                  <div>
                    <CardTitle>Histórico de Evoluções</CardTitle>
                    <CardDescription>
                      {isLoading ? 'Carregando...' : `Visualizando ${filteredEvolucoes.length} de ${evolucoes.length} evoluções`}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-end">
                     <div className="flex-1 min-w-[150px]">
                          <Label htmlFor="selectPaciente" className="text-xs font-medium">Filtrar Paciente (Lista)</Label>
                          <Select value={selectedPacienteId} onValueChange={setSelectedPacienteId}>
                              <SelectTrigger id="selectPaciente" className="h-9">
                                  <SelectValue placeholder="Todos" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">Todos os pacientes</SelectItem>
                                  {pacientes.map(p => (
                                      <SelectItem key={p.id_paciente} value={String(p.id_paciente)}>{p.nome_completo}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                       <div className="flex-1 min-w-[150px]">
                          <Label htmlFor="filtroNomeEvolucao" className="text-xs font-medium">Buscar por Nome</Label>
                          <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                              <Input
                                  id="filtroNomeEvolucao"
                                  type="text"
                                  placeholder="Nome..."
                                  value={filtroNome}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroNome(e.target.value)}
                                  className="h-9 pl-8"
                              />
                          </div>
                       </div>
                       <div className="min-w-[120px]">
                           <Label htmlFor="filtroCpfEvolucao" className="text-xs font-medium">Buscar por CPF</Label>
                           <InputMask
                              id="filtroCpfEvolucao"
                              mask="999.999.999-99"
                              value={filtroCpf}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroCpf(e.target.value)}
                           >
                             {(inputProps: any) => <Input {...inputProps} placeholder="CPF..." className="h-9"/>}
                           </InputMask>
                       </div>
                       {(selectedPacienteId !== 'all' || filtroNome || filtroCpf) && (
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
            
            {/* ... (CardContent com a Lista de Evoluções) ... */}
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                    <>
                      <CardSkeleton />
                      <CardSkeleton />
                      <CardSkeleton />
                    </>
                ) : filteredEvolucoes.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                       <FileText className="w-12 h-12 mx-auto text-gray-400" />
                       <h3 className="mt-2 text-lg font-medium">Nenhuma evolução encontrada</h3>
                       <p className="mt-1 text-sm">
                         {selectedPacienteId !== 'all' || filtroNome || filtroCpf ? 'Ajuste os filtros ou limpe-os para ver mais resultados.' : 'Quando uma evolução for registrada, ela aparecerá aqui.'}
                       </p>
                    </div>
                ) : (
                    filteredEvolucoes
                      .sort((a, b) => b.data_registro.localeCompare(a.data_registro))
                      .map((evolucao: Evolucao) => (
                        <Card key={evolucao.id_evolucao} className="border-l-4 border-l-blue-600 overflow-hidden hover:shadow-md transition-shadow">
                          <CardContent className="p-4 md:p-6">
                            <div className="flex flex-col md:flex-row items-start justify-between mb-4 gap-2">
                              {/* ... (Conteúdo do Card de Evolução) ... */}
                              <div className="flex items-start gap-4 flex-1">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <h3 className="font-semibold text-lg text-gray-900 truncate" title={evolucao.nome_paciente}>{evolucao.nome_paciente || 'Paciente N/A'}</h3>
                                  <p className="text-sm text-gray-600 mt-1 truncate" title={evolucao.nome_profissional}>
                                    Profissional: {evolucao.nome_profissional || 'N/A'}
                                  </p>
                                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                                    <Calendar className="w-4 h-4" />
                                    Registrado em: {formatDisplayDateTime(evolucao.data_registro)}
                                  </div>
                                </div>
                              </div>
                              
                              {/* --- BOTÕES DE AÇÃO --- */}
                              <div className="flex gap-1 flex-shrink-0 self-start md:self-center ml-auto md:ml-0">
                                  {/* NOVO: Botão Atestado */}
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-blue-600 hover:text-blue-700"
                                    onClick={() => handleOpenAtestadoModal(evolucao)} 
                                    title="Gerar Atestado"
                                  >
                                    <FileBadge className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handlePrint(evolucao)} 
                                    title="Imprimir Evolução"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </Button>
                                  {canManage && (
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(evolucao)} title="Editar Evolução">
                                          <Edit className="w-4 h-4" />
                                      </Button>
                                  )}
                                  {canDelete && (
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(evolucao.id_evolucao)} title="Excluir Evolução">
                                          <Trash2 className="w-4 h-4 text-red-600" />
                                      </Button>
                                  )}
                              </div>
                            </div>
                            {evolucao.observacoes && (
                              <div className="md:ml-16 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Observações Clínicas:</h4>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{evolucao.observacoes}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                )}
              </div>
            </CardContent>
        </Card>
      </div>

      {/* --- NOVO: Renderiza o Modal de Atestado --- */}
      {selectedEvolucao && (
        <ModalAtestado
          open={isAtestadoModalOpen}
          onOpenChange={setIsAtestadoModalOpen}
          evolucao={selectedEvolucao}
        />
      )}
    </>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InputMask from 'react-input-mask';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Plus, Send, FileText, Trash2, Search, User, Printer, MessageSquare, Mail } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface Instrucao {
  id_instrucao: number;
  id_paciente: number;
  id_profissional: number;
  id_atendimento: number;
  nome_paciente?: string;
  nome_profissional?: string;
  texto_instrucao: string | null;
  canal_envio: string | null;
  data_envio: string;
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
  id_atendimento: 'null', // Começa selecionando "Nenhum"
  texto_instrucao: '',
  canal_envio: 'Impresso'
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

export default function InstrucoesPos() {
  const [instrucoes, setInstrucoes] = useState<Instrucao[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [filtroNome, setFiltroNome] = useState<string>('');
  const [filtroCpf, setFiltroCpf] = useState<string>('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [instrData, pacData, profData, atendData] = await Promise.all([
          apiFetch('/instrucoes_pos', 'GET'),
          apiFetch('/pacientes', 'GET'),
          apiFetch('/profissionais', 'GET'),
          apiFetch('/atendimentos', 'GET')
      ]);
      setInstrucoes(instrData.data || []);
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
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    // CORREÇÃO: Removida a obrigatoriedade do id_atendimento
    if (!formData.id_paciente || !formData.id_profissional || !formData.texto_instrucao) {
        alert('Paciente, Profissional e Texto da Instrução são obrigatórios.');
        return;
    }

    const dataToSend = {
      id_paciente: parseInt(formData.id_paciente, 10),
      id_profissional: parseInt(formData.id_profissional, 10),
      // CORREÇÃO: Envia null se a string for "null", senão envia o número
      id_atendimento: formData.id_atendimento && formData.id_atendimento !== "null" 
          ? parseInt(formData.id_atendimento, 10) 
          : null,
      texto_instrucao: formData.texto_instrucao,
      canal_envio: formData.canal_envio || null
    };

    try {
      setIsLoading(true);
      await apiFetch('/instrucoes_pos', 'POST', dataToSend);
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
      alert(`Erro ao enviar instrução: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente excluir esta instrução? Esta ação é permanente.')) {
        try {
            setIsLoading(true);
            await apiFetch(`/instrucoes_pos/${id}`, 'DELETE');
            fetchData();
        } catch (err: any) {
            setError(err.message);
            alert(`Erro ao excluir instrução: ${err.message}`);
            setIsLoading(false);
        }
    }
  };
  
  const handlePrint = (instrucao: Instrucao) => {
    navigate('/imprimir/instrucao', { state: { instrucao: instrucao } });
  };

  const filteredInstrucoes = instrucoes.filter(instr => {
      const nomeLowerFiltro = filtroNome.toLowerCase();
      const matchNome = !nomeLowerFiltro || (instr.nome_paciente && instr.nome_paciente.toLowerCase().includes(nomeLowerFiltro));

      const cpfLimpoFiltro = filtroCpf.replace(/[^\d]/g, '');
      let matchCpf = true;
      if (cpfLimpoFiltro) {
          const pacienteInstr = pacientes.find(p => p.id_paciente === instr.id_paciente);
          const cpfLimpoPaciente = pacienteInstr?.cpf?.replace(/[^\d]/g, '');
          matchCpf = !!pacienteInstr && cpfLimpoPaciente === cpfLimpoFiltro;
      }
      return matchNome && matchCpf;
  });

  const getCanalIcon = (canal: string | null) => {
      switch (canal) {
          case 'Impresso': return <Printer className="w-3 h-3 mr-1.5" />;
          case 'SMS': return <MessageSquare className="w-3 h-3 mr-1.5" />;
          case 'Email': return <Mail className="w-3 h-3 mr-1.5" />;
          case 'WhatsApp': return <MessageSquare className="w-3 h-3 mr-1.5 text-green-600" />;
          default: return <FileText className="w-3 h-3 mr-1.5" />;
      }
  };

  const formatDisplayDate = (isoString: string | undefined | null): string => {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleDateString('pt-BR');
    } catch { return isoString; }
  }

  const formatAtendimentoOption = (atendimento: Atendimento): string => {
    const dataFormatada = formatDisplayDate(atendimento.data_atendimento);
    return `${atendimento.nome_paciente || 'Paciente N/A'} - ${atendimento.tipo_atendimento} (${dataFormatada})`;
  }

  const userRole = currentUser?.papel;
  const canManage = userRole === 'Administrador' || userRole === 'Profissional';
  const canDelete = userRole === 'Administrador';

  const handleClearFilters = () => {
    setFiltroNome('');
    setFiltroCpf('');
  };

  const TableSkeletonInst = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={`skel-inst-${index}`}>
        <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
        <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
        <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instruções Pós-Atendimento</h1>
          <p className="text-sm text-gray-600">Gerencie as orientações enviadas aos pacientes</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 shadow hover:shadow-lg transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Nova Instrução
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova Instrução Pós-Atendimento</DialogTitle>
                <DialogDescription>Crie e envie orientações ao paciente</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Paciente</Label>
                    <Select value={formData.id_paciente} onValueChange={(value: string) => setFormData({ ...formData, id_paciente: value, id_atendimento: 'null' })}>
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
                    <Select value={formData.id_profissional} onValueChange={(value: string) => setFormData({ ...formData, id_profissional: value, id_atendimento: 'null' })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Selecione o atendimento relacionado" /></SelectTrigger>
                    <SelectContent>
                      {/* CORREÇÃO: Adicionada opção "Nenhum" */}
                      <SelectItem value="null">Nenhum (Instrução Geral)</SelectItem>
                      {atendimentos
                        .filter(a =>
                            (!formData.id_paciente || String(a.id_paciente) === formData.id_paciente) &&
                            (!formData.id_profissional || !a.id_profissional || String(a.id_profissional) === formData.id_profissional)
                         )
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
                  <Label>Texto da Instrução</Label>
                  <Textarea
                    value={formData.texto_instrucao}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, texto_instrucao: e.target.value })}
                    rows={6}
                    placeholder="Digite as orientações pós-atendimento..."
                  />
                </div>
                <div>
                  <Label>Canal de Envio</Label>
                  <Select value={formData.canal_envio} onValueChange={(value: string) => setFormData({ ...formData, canal_envio: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Impresso">Impresso</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  <Send className="w-4 h-4 mr-2" />
                  {isLoading ? 'Enviando...' : 'Enviar Instrução'}
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

      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Enviado</p>
                    <h3 className="text-2xl font-bold text-gray-900">{instrucoes.length}</h3>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-gray-600">Impresso</p>
                     <h3 className="text-2xl font-bold text-gray-900">
                       {instrucoes.filter(i => i.canal_envio === 'Impresso').length}
                     </h3>
                   </div>
                   <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Printer className="w-6 h-6 text-purple-600" />
                   </div>
                 </div>
               </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">SMS / WhatsApp</p>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {instrucoes.filter(i => i.canal_envio === 'SMS' || i.canal_envio === 'WhatsApp').length}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                   <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-gray-600">Email</p>
                     <h3 className="text-2xl font-bold text-gray-900">
                       {instrucoes.filter(i => i.canal_envio === 'Email').length}
                     </h3>
                   </div>
                   <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-6 h-6 text-orange-600" />
                   </div>
                 </div>
               </CardContent>
            </Card>
        </div>
      )}

      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
              <div>
                <CardTitle>Instruções Enviadas</CardTitle>
                 <CardDescription>
                  {isLoading ? 'Carregando...' : `Histórico de ${filteredInstrucoes.length} ${filteredInstrucoes.length !== 1 ? 'instruções' : 'instrução'} ${filtroNome || filtroCpf ? 'encontradas' : 'enviadas'}`}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-end">
                   <div className="flex-1 min-w-[150px]">
                      <Label htmlFor="filtroNomeInst" className="text-xs font-medium">Buscar por Nome</Label>
                      <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                              id="filtroNomeInst"
                              type="text"
                              placeholder="Nome..."
                              value={filtroNome}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroNome(e.target.value)}
                              className="h-9 pl-8"
                          />
                      </div>
                   </div>
                   <div className="min-w-[120px]">
                       <Label htmlFor="filtroCpfInst" className="text-xs font-medium">Buscar por CPF</Label>
                       <InputMask
                          id="filtroCpfInst"
                          mask="999.999.999-99"
                          value={filtroCpf}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFiltroCpf(e.target.value)}
                       >
                         {(inputProps: any) => <Input {...inputProps} placeholder="CPF..." className="h-9"/>}
                       </InputMask>
                   </div>
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
           <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[10%]">Data</TableHead>
                    <TableHead className="w-[20%]">Paciente</TableHead>
                    <TableHead className="w-[20%]">Profissional</TableHead>
                    <TableHead className="w-[30%]">Instrução (Início)</TableHead>
                    <TableHead className="w-[10%]">Canal</TableHead>
                    <TableHead className="text-right w-[10%]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {isLoading ? (
                       <TableSkeletonInst />
                   ) : filteredInstrucoes.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                             <div className="flex flex-col items-center gap-2">
                                 <FileText className="w-10 h-10 text-gray-400" />
                                 <span>
                                   {filtroNome || filtroCpf ? 'Nenhuma instrução encontrada para os filtros.' : 'Nenhuma instrução enviada ainda.'}
                                 </span>
                              </div>
                          </TableCell>
                      </TableRow>
                   ) : (
                      filteredInstrucoes
                        .sort((a, b) => b.data_envio.localeCompare(a.data_envio))
                        .map((instrucao: Instrucao) => (
                          <TableRow key={instrucao.id_instrucao} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="text-xs text-gray-600">
                              {formatDisplayDate(instrucao.data_envio)}
                            </TableCell>
                            <TableCell className="font-medium truncate" title={instrucao.nome_paciente}>{instrucao.nome_paciente || 'N/A'}</TableCell>
                            <TableCell className="text-sm text-gray-600 truncate" title={instrucao.nome_profissional}>{instrucao.nome_profissional || 'N/A'}</TableCell>
                            <TableCell className="max-w-md">
                              <p className="truncate text-sm text-gray-800" title={instrucao.texto_instrucao || ''}>
                                  {instrucao.texto_instrucao}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge variant={"outline"} className="text-xs flex items-center">
                                {getCanalIcon(instrucao.canal_envio)}
                                {instrucao.canal_envio || 'N/A'}
                              </Badge>
                            </TableCell>
                             <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon" className="h-8 w-8"
                                        onClick={() => handlePrint(instrucao)}
                                        title="Imprimir Instrução"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </Button>
                                    {canDelete && (
                                        <Button
                                            variant="ghost"
                                            size="icon" className="h-8 w-8"
                                            onClick={() => handleDelete(instrucao.id_instrucao)}
                                            title="Excluir Instrução"
                                            disabled={isLoading}
                                        >
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
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Importa useNavigate
import InputMask from 'react-input-mask';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Search, Plus, Edit, Trash2, FileText } from 'lucide-react'; // Importa FileText para Ficha

// ... (Função validarCPF, API_URL, Interface Paciente, initialFormData, apiFetch) ...
// (O código existente dessas funções permanece o mesmo)
function validarCPF(cpf: string): boolean {
  if (typeof cpf !== 'string') return false;
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  const digitos = cpf.split('').map(Number);
  const calcDigit = (sliceEnd: number): number => {
    let soma = 0;
    for (let i = 0, j = sliceEnd + 1; i < sliceEnd; i++, j--) {
      soma += digitos[i] * j;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const dv1 = calcDigit(9);
  if (dv1 !== digitos[9]) return false;
  const dv2 = calcDigit(10);
  if (dv2 !== digitos[10]) return false;
  return true;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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
  data_cadastro?: string;
}

const initialFormData = {
  nome_completo: '',
  cpf: '',
  data_nascimento: '',
  sexo: '',
  telefone: '',
  email: '',
  convenio: '',
  status: 'Ativo'
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


export default function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate(); // Hook para navegação

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch('/pacientes', 'GET');
      setPacientes(data.data || []);
    } catch (err: any) {
      setError(err.message);
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
    setEditingPaciente(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (paciente: Paciente) => {
    setEditingPaciente(paciente);
    setFormData({
      nome_completo: paciente.nome_completo || '',
      cpf: paciente.cpf || '',
      data_nascimento: paciente.data_nascimento ? new Date(paciente.data_nascimento).toISOString().split('T')[0] : '',
      sexo: paciente.sexo || '',
      telefone: paciente.telefone || '',
      email: paciente.email || '',
      convenio: paciente.convenio || '',
      status: paciente.status || 'Ativo',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!validarCPF(formData.cpf)) {
        alert('Erro: O CPF digitado é inválido.');
        return;
    }
    if (!formData.nome_completo || !formData.cpf) {
      alert('Nome completo e CPF são obrigatórios.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
        alert('Erro: O formato do e-mail digitado é inválido.');
        return;
    }

    try {
      setIsLoading(true); 
      if (editingPaciente) {
        await apiFetch(`/pacientes/${editingPaciente.id_paciente}`, 'PUT', formData);
      } else {
        await apiFetch('/pacientes', 'POST', formData);
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      if (err.message.includes('Este CPF já está cadastrado')) {
          alert('Erro ao salvar: Este CPF já está cadastrado no sistema.');
      } else {
          alert(`Erro ao salvar: ${err.message}`);
      }
    } finally {
        setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente excluir este paciente? Esta ação é permanente.')) {
      try {
        setIsLoading(true);
        await apiFetch(`/pacientes/${id}`, 'DELETE');
        fetchData();
      } catch (err: any) {
        setError(err.message);
        alert(`Erro ao excluir: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // NOVO: Navega para a Ficha do Paciente
  const handleViewFicha = (id: number) => {
    navigate(`/pacientes/${id}/ficha`);
  };

  const filteredPacientes = pacientes.filter((p: Paciente) =>
    (p.nome_completo && p.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.cpf && p.cpf.includes(searchTerm))
  );

  const userRole = currentUser?.papel;
  const canCreate = userRole === 'Administrador' || userRole === 'Recepcionista';
  const canEdit = userRole === 'Administrador' || userRole === 'Recepcionista' || userRole === 'Profissional';
  const canDelete = userRole === 'Administrador';

  return (
    <div className="space-y-6">
      {/* ... (Cabeçalho da Página e Modal de Adicionar/Editar) ... */}
      {/* (O Dialog para Adicionar/Editar Paciente permanece o mesmo) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastro de Pacientes</h1>
          <p className="text-sm text-gray-600">Gerencie os pacientes da unidade</p>
        </div>
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPaciente ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
                <DialogDescription>Preencha os dados do paciente</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome Completo</Label>
                  <Input value={formData.nome_completo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nome_completo: e.target.value })} />
                </div>
                <div>
                  <Label>CPF</Label>
                  <InputMask
                    mask="999.999.999-99"
                    value={formData.cpf} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cpf: e.target.value })}
                    disabled={!!editingPaciente}
                  >
                    {(inputProps: any) => <Input {...inputProps} />}
                  </InputMask>
                </div>
                <div>
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={formData.data_nascimento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, data_nascimento: e.target.value })} />
                </div>
                <div>
                  <Label>Sexo</Label>
                  <Select value={formData.sexo} onValueChange={(value: string) => setFormData({ ...formData, sexo: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Telefone</Label>
                  <InputMask
                    mask="(99)99999-9999"
                    value={formData.telefone} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, telefone: e.target.value })}
                  >
                     {(inputProps: any) => <Input {...inputProps} type="tel" />}
                  </InputMask>
                </div>
                <div className="col-span-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <Label>Convênio</Label>
                  <Input value={formData.convenio} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, convenio: e.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value: string) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? (editingPaciente ? 'Salvando...' : 'Criando...') : 'Salvar'}
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
          <CardTitle>Lista de Pacientes</CardTitle>
          <CardDescription>Total de {pacientes.length} pacientes cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      {/* ... (Loading Skeleton) ... */}
                    </TableCell>
                  </TableRow>
                ) : filteredPacientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Nenhum paciente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPacientes.map((paciente: Paciente) => (
                    <TableRow key={paciente.id_paciente}>
                      <TableCell>{paciente.nome_completo}</TableCell>
                      <TableCell>{paciente.cpf}</TableCell>
                      <TableCell>{paciente.telefone}</TableCell>
                      <TableCell>
                        <Badge variant={paciente.status === 'Ativo' ? 'default' : 'secondary'}>
                          {paciente.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* --- NOVO BOTÃO FICHA --- */}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewFicha(paciente.id_paciente)} title="Ver Ficha do Paciente">
                            <FileText className="w-4 h-4" />
                          </Button>
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(paciente)} title="Editar Paciente">
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(paciente.id_paciente)} title="Excluir Paciente">
                              <Trash2 className="w-4 h-4 text-red-600" />
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

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
import { Search, Plus, Edit, Trash2 } from 'lucide-react';

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

interface Profissional {
  id_profissional: number;
  nome_completo: string;
  cpf: string;
  especialidade: string;
  email: string;
  telefone: string;
  status: string;
}

const initialFormData = {
  nome_completo: '',
  cpf: '',
  especialidade: '',
  email: '',
  telefone: '',
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

export default function Profissionais() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEspecialidade, setFilterEspecialidade] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfissional, setEditingProfissional] = useState<Profissional | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const especialidades = ['Cardiologia', 'Pediatria', 'Ortopedia', 'Dermatologia', 'Neurologia', 'Clínico Geral'];

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch('/profissionais', 'GET');
      setProfissionais(data.data || []);
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
    setEditingProfissional(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (profissional: Profissional) => {
    setEditingProfissional(profissional);
    setFormData({
        nome_completo: profissional.nome_completo || '',
        cpf: profissional.cpf || '',
        especialidade: profissional.especialidade || '',
        email: profissional.email || '',
        telefone: profissional.telefone || '',
        status: profissional.status || 'Ativo',
    });
    setIsDialogOpen(true);
  };

 const handleSave = async () => {
    if (!validarCPF(formData.cpf)) {
        alert('Erro: O CPF digitado é inválido.');
        return;
    }

    if (!formData.nome_completo || !formData.cpf || !formData.especialidade) {
        alert('Nome completo, CPF e Especialidade são obrigatórios.');
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex simples para email
    // Verifica se o email foi preenchido E se ele não bate com o regex
    if (formData.email && !emailRegex.test(formData.email)) {
        alert('Erro: O formato do e-mail digitado é inválido.');
        return; // Para a execução
    }

    try {
      setIsLoading(true);
      if (editingProfissional) {
        await apiFetch(`/profissionais/${editingProfissional.id_profissional}`, 'PUT', formData);
      } else {
        await apiFetch('/profissionais', 'POST', formData);
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
    if (confirm('Deseja realmente excluir este profissional? Esta ação é permanente.')) {
      try {
        setIsLoading(true);
        await apiFetch(`/profissionais/${id}`, 'DELETE');
        fetchData();
      } catch (err: any) {
        setError(err.message);
        alert(`Erro ao excluir: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredProfissionais = profissionais.filter((p: Profissional) => {
    const matchSearch = (p.nome_completo && p.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (p.cpf && p.cpf.includes(searchTerm));
    const matchEspecialidade = filterEspecialidade === 'all' || p.especialidade === filterEspecialidade;
    return matchSearch && matchEspecialidade;
  });

  const userRole = currentUser?.papel;
  const canManage = userRole === 'Administrador';


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastro de Profissionais</h1>
          <p className="text-sm text-gray-600">Gerencie os profissionais de saúde</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo Profissional
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProfissional ? 'Editar Profissional' : 'Novo Profissional'}</DialogTitle>
                <DialogDescription>Preencha os dados do profissional</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome Completo</Label>
                  <Input value={formData.nome_completo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nome_completo: e.target.value })} 
                  disabled={!!editingProfissional}/>
                </div>
                
                <div>
                  <Label>CPF</Label>
                  <InputMask
                    mask="999.999.999-99"
                    value={formData.cpf} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cpf: e.target.value })}
                    disabled={!!editingProfissional}
                  >
                    {(inputProps: any) => <Input {...inputProps} />}
                  </InputMask>
                </div>

                <div>
                  <Label>Especialidade</Label>
                  <Select value={formData.especialidade} onValueChange={(value: string) => setFormData({ ...formData, especialidade: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {especialidades.map(esp => (
                        <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })} />
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
                    {isLoading ? (editingProfissional ? 'Salvando...' : 'Criando...') : 'Salvar'}
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
          <CardTitle>Lista de Profissionais</CardTitle>
          <CardDescription>Total de {profissionais.length} profissionais cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterEspecialidade} onValueChange={(value: string) => setFilterEspecialidade(value)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por especialidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as especialidades</SelectItem>
                {especialidades.map(esp => (
                  <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-4">Carregando dados...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredProfissionais.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhum profissional encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfissionais.map((profissional: Profissional) => (
                    <TableRow key={profissional.id_profissional}>
                      <TableCell>{profissional.nome_completo}</TableCell>
                      <TableCell>{profissional.cpf}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{profissional.especialidade}</Badge>
                      </TableCell>
                      <TableCell>{profissional.telefone}</TableCell>
                      <TableCell>
                        <Badge variant={profissional.status === 'Ativo' ? 'default' : 'secondary'}>
                          {profissional.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canManage && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(profissional)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(profissional.id_profissional)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </>
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
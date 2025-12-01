import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Search, Plus, Edit, Trash2, Shield } from 'lucide-react';
import { Skeleton } from './ui/skeleton'; 

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface Usuario {
  id_usuario: number;
  nome_usuario: string;
  papel: string;
  id_profissional: number | null;
  ultimo_acesso: string | null;
  status?: string;
}

interface Profissional {
    id_profissional: number;
    nome_completo: string;
}

const initialFormData = {
  nome_usuario: '',
  senha: '',
  papel: '',
  id_profissional: '',
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

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [userData, profData] = await Promise.all([
          apiFetch('/usuarios', 'GET'),
          apiFetch('/profissionais', 'GET')
      ]);
      setUsuarios(userData.data || []);
      setProfissionais(profData.data || []);
    } catch (err: any) {
      setError(err.message);
      setUsuarios([]);
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
    setEditingUsuario(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      nome_usuario: usuario.nome_usuario || '',
      senha: '', // Senha nunca é preenchida ao editar
      papel: usuario.papel || '',
      id_profissional: usuario.id_profissional ? String(usuario.id_profissional) : '',
      status: usuario.status || 'Ativo',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome_usuario || !formData.papel) {
        alert('Nome de usuário e Papel são obrigatórios.');
        return;
    }
    if (!editingUsuario && !formData.senha) {
        alert('Senha é obrigatória ao criar um novo usuário.');
        return;
    }

    const dataToSend: any = {
        nome_usuario: formData.nome_usuario,
        papel: formData.papel,
        id_profissional: formData.id_profissional ? parseInt(formData.id_profissional, 10) : null,
    };
    
    if (formData.senha) {
        dataToSend.senha = formData.senha;
    }

    try {
      setIsLoading(true);
      if (editingUsuario) {
        await apiFetch(`/usuarios/${editingUsuario.id_usuario}`, 'PUT', dataToSend);
      } else {
        const createData = { ...dataToSend };
        await apiFetch('/usuarios', 'POST', createData);
      }
      setIsDialogOpen(false);
      fetchData(); 
    } catch (err: any) {
      setError(err.message);
      alert(`Erro ao salvar usuário: ${err.message}`);
      setIsLoading(false); 
    }
  };

  const handleDelete = async (id: number) => {
    if (currentUser?.id_usuario === id) {
        alert("Você não pode excluir seu próprio usuário.");
        return;
    }
    if (confirm('Deseja realmente excluir este usuário? Esta ação é permanente.')) {
      try {
        setIsLoading(true);
        await apiFetch(`/usuarios/${id}`, 'DELETE');
        fetchData(); 
      } catch (err: any) {
        setError(err.message);
        alert(`Erro ao excluir usuário: ${err.message}`);
        setIsLoading(false);
      }
    }
  };

  const filteredUsuarios = usuarios.filter((u: Usuario) =>
    (u.nome_usuario && u.nome_usuario.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const userRole = currentUser?.papel;
  const canManage = userRole === 'Administrador';

  const getProfissionalName = (id: number | null): string => {
      if (!id) return '-';
      const prof = profissionais.find(p => p.id_profissional === id);
      return prof ? prof.nome_completo : 'Desconhecido';
  }

  const formatDateTime = (isoString: string | null | undefined): string => {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleString('pt-BR');
    } catch {
        return isoString;
    }
  }
  
  const TableSkeleton = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={`skel-user-${index}`}>
        <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
        <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-16 inline-block" /></TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastro de Usuários</h1>
          <p className="text-sm text-gray-600">Gerencie os usuários do sistema</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 shadow hover:shadow-lg transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
                <DialogDescription>Preencha os dados do usuário</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <Label>Nome de Usuário (Login)</Label>
                  <Input value={formData.nome_usuario} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nome_usuario: e.target.value })} />
                </div>
                <div>
                  <Label>Senha {editingUsuario && '(deixe em branco para manter)'}</Label>
                  <Input type="password" value={formData.senha} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, senha: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Papel</Label>
                  <Select value={formData.papel} onValueChange={(value: string) => setFormData({ ...formData, papel: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Administrador">Administrador</SelectItem>
                      <SelectItem value="Recepcionista">Recepcionista</SelectItem>
                      <SelectItem value="Profissional">Profissional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.papel === 'Profissional' && (
                  <div className="col-span-2">
                    <Label>Profissional Vinculado</Label>
                    <Select value={formData.id_profissional} onValueChange={(value: string) => setFormData({ ...formData, id_profissional: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        {profissionais.map(prof => (
                          <SelectItem key={prof.id_profissional} value={String(prof.id_profissional)}>
                            {prof.nome_completo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? (editingUsuario ? 'Salvando...' : 'Criando...') : 'Salvar'}
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

      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
             <div>
                <CardTitle>Lista de Usuários</CardTitle>
                <CardDescription>
                   {isLoading ? 'Carregando...' : `Total de ${filteredUsuarios.length} ${filteredUsuarios.length !== 1 ? 'usuários' : 'usuário'} ${searchTerm ? 'encontrados' : 'cadastrados'}`}
                </CardDescription>
             </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nome de usuário..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário (Login)</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Profissional Vinculado</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              {/* CORRIGIDO: Removido espaço em branco que causa warning */}
              <TableBody>{
                isLoading ? (
                  <TableSkeleton />
                ) : filteredUsuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                       <div className="flex flex-col items-center gap-2">
                         <Search className="w-10 h-10 text-gray-400" />
                         <span>{searchTerm ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}</span>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsuarios.map((usuario: Usuario) => (
                    <TableRow key={usuario.id_usuario} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{usuario.nome_usuario}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className={`w-4 h-4 ${
                            usuario.papel === 'Administrador' ? 'text-red-600' :
                            usuario.papel === 'Profissional' ? 'text-blue-600' : 'text-green-600'
                          }`} />
                          <Badge variant="outline">{usuario.papel}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{getProfissionalName(usuario.id_profissional)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{formatDateTime(usuario.ultimo_acesso)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canManage && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(usuario)} title="Editar">
                                <Edit className="w-4 h-4" />
                              </Button>
                              {currentUser?.id_usuario !== usuario.id_usuario && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(usuario.id_usuario)} title="Excluir">
                                  <Trash2 className="w-4 h-4 text-red-600 hover:text-red-700" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )
              }</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
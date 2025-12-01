import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Plus, Edit, Trash2, Building, MapPin, Phone, Mail, AlertCircle, Users } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';

// URL da API e Helper
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const apiFetch = async (endpoint: string, method: string = 'GET', body: any = null) => {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options: RequestInit = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();
  if (!response.ok || !data.success) {
    console.error(`API Error (${method} ${endpoint}):`, data.error);
    throw new Error(data.error || `Falha na requisição ${method} ${endpoint}`);
  }
  return data;
};

// Tipos
interface ProfissionalVinculado { id_profissional: number; nome: string; }
interface Unidade { id_unidade: number; nome_unidade: string; endereco: string | null; telefone: string | null; email: string | null; profissionaisVinculados: ProfissionalVinculado[]; }
interface Profissional { id_profissional: number; nome_completo: string; }

// Campos do Formulário
const initialFormData = {
  nome_unidade: '',
  endereco: '',
  telefone: '',
  email: ''
};

export default function UnidadesSaude() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [allProfissionais, setAllProfissionais] = useState<Profissional[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedProfissionaisIds, setSelectedProfissionaisIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [unidadesRes, profissionaisRes] = await Promise.all([
         apiFetch('/unidades_saude'),
         apiFetch('/profissionais')
      ]);
      setUnidades(unidadesRes.data || []);
      setAllProfissionais(profissionaisRes.data || []);
    } catch (err: any) {
      setError(err.message);
      setUnidades([]);
      setAllProfissionais([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) setCurrentUser(JSON.parse(user));
    fetchData();
  }, []);

  const handleAdd = () => {
    setEditingUnidade(null);
    setFormData(initialFormData);
    setSelectedProfissionaisIds([]);
    setIsDialogOpen(true);
  };

  const handleEdit = (unidade: Unidade) => {
    setEditingUnidade(unidade);
    setFormData({
      nome_unidade: unidade.nome_unidade || '',
      endereco: unidade.endereco || '',
      telefone: unidade.telefone || '',
      email: unidade.email || ''
    });
    setSelectedProfissionaisIds(unidade.profissionaisVinculados.map(p => p.id_profissional));
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome_unidade) {
      alert('Nome da Unidade é obrigatório.');
      return;
    }
    const dataToSend = {
        ...formData,
        profissionaisIds: selectedProfissionaisIds
    };
    try {
      setIsLoading(true);
      if (editingUnidade) {
        await apiFetch(`/unidades_saude/${editingUnidade.id_unidade}`, 'PUT', dataToSend);
      } else {
        await apiFetch('/unidades_saude', 'POST', dataToSend);
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
      alert(`Erro ao salvar unidade: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
     if (confirm('Deseja realmente excluir esta unidade? Vínculos com profissionais serão removidos (se configurado ON DELETE CASCADE).')) {
      try {
        setIsLoading(true);
        await apiFetch(`/unidades_saude/${id}`, 'DELETE');
        fetchData();
      } catch (err: any) {
        setError(err.message);
        if (err.message.includes('foreign key constraint') || err.message.includes('vinculada a outros registros')) {
             alert('Erro ao excluir: A unidade ainda possui vínculos ativos (profissionais, acessos, etc.) que impedem a exclusão.');
        } else {
            alert(`Erro ao excluir unidade: ${err.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // --- CORREÇÃO 1: Tipagem do parâmetro 'checked' ---
  const handleProfissionalSelect = (profId: number, checked: boolean | 'indeterminate') => {
      if (checked === true) {
          setSelectedProfissionaisIds(prev => [...prev, profId]);
      } else {
          setSelectedProfissionaisIds(prev => prev.filter(id => id !== profId));
      }
  };

  // RBAC
  const userRole = currentUser?.papel;
  const canManage = userRole === 'Administrador';

  // Componente de Loading
  // --- CORREÇÃO 2: Removido comentário JSX que causava erro ---
  const renderLoading = () => (
     <div className="flex justify-center items-center py-10 col-span-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Carregando unidades...</span>
     </div>
  );
  // --- FIM CORREÇÃO 2 ---

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unidades de Saúde</h1>
          <p className="text-sm text-gray-600">Gerencie as unidades de atendimento</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Nova Unidade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingUnidade ? 'Editar Unidade' : 'Nova Unidade de Saúde'}</DialogTitle>
                <DialogDescription>Preencha os dados da unidade e selecione os profissionais vinculados</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                  <Label htmlFor="nome_unidade">Nome da Unidade</Label>
                  <Input id="nome_unidade" value={formData.nome_unidade} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nome_unidade: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="endereco">Endereço Completo</Label>
                  <Input id="endereco" value={formData.endereco} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, endereco: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" value={formData.telefone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, telefone: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>

                <div className="pt-4 border-t">
                    <Label className="flex items-center gap-2 mb-3 font-semibold">
                       <Users className="w-4 h-4" /> Profissionais Vinculados
                    </Label>
                    {isLoading ? <p className='text-sm text-gray-500'>Carregando profissionais...</p> :
                     allProfissionais.length === 0 ? <p className='text-sm text-gray-500'>Nenhum profissional cadastrado.</p> :
                    (
                    <ScrollArea className="h-48 border rounded-md p-4">
                        <div className="space-y-3">
                        {allProfissionais.map(prof => (
                            <div key={prof.id_profissional} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`prof-${prof.id_profissional}`}
                                    checked={selectedProfissionaisIds.includes(prof.id_profissional)}
                                    // --- CORREÇÃO 1 APLICADA AQUI ---
                                    onCheckedChange={(checked: boolean | 'indeterminate') => handleProfissionalSelect(prof.id_profissional, checked)}
                                />
                                <label
                                    htmlFor={`prof-${prof.id_profissional}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {prof.nome_completo}
                                </label>
                            </div>
                         ))}
                         </div>
                    </ScrollArea>
                    )}
                </div>

              </div>
              <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-md">
           <div className="flex items-center gap-2">
             <AlertCircle className="w-5 h-5" />
             <strong>Erro:</strong> {error}
           </div>
        </div>
      )}

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
            renderLoading()
        ) : unidades.length === 0 && !error ? (
             <p className="text-center text-gray-500 py-10 lg:col-span-2">Nenhuma unidade cadastrada.</p>
        ) : (
            unidades.map((unidade) => (
              <Card key={unidade.id_unidade} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 overflow-hidden mr-2">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                      </div>
                      <div className="overflow-hidden">
                        <CardTitle className="truncate" title={unidade.nome_unidade}>{unidade.nome_unidade}</CardTitle>
                        <CardDescription>Unidade de Atendimento</CardDescription>
                      </div>
                    </div>
                    {canManage && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className='w-8 h-8' onClick={() => handleEdit(unidade)} title="Editar Unidade">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className='w-8 h-8' onClick={() => handleDelete(unidade.id_unidade)} title="Excluir Unidade">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-800">{unidade.endereco || '-'}</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <Phone className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-800">{unidade.telefone || '-'}</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <Mail className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-800">{unidade.email || '-'}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-gray-600 mb-2">Profissionais Vinculados:</p>
                    <div className="flex flex-wrap gap-1">
                      {unidade.profissionaisVinculados && unidade.profissionaisVinculados.length > 0 ? (
                        unidade.profissionaisVinculados.map((prof) => (
                          <Badge key={prof.id_profissional} variant="secondary">{prof.nome || `ID: ${prof.id_profissional}`}</Badge>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 italic">Nenhum</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Plus, Download, Eye, BookOpen, FileText, Video, Trash2, AlertCircle, Search } from 'lucide-react';
import { Skeleton } from './ui/skeleton'; // Import Skeleton

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

interface Material {
  id_material: number;
  titulo: string | null;
  categoria: string | null;
  url_arquivo: string | null;
  data_upload: string;
  acessos: number; 
}

const initialFormData = {
  titulo: '',
  categoria: '',
  url_arquivo: ''
};

interface MateriaisTreinamentoProps {
  currentUser: any;
}

export default function MateriaisTreinamento({ currentUser }: MateriaisTreinamentoProps) {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  
  // Estados de Filtro
  const [filtroTitulo, setFiltroTitulo] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('all');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categorias = ['Procedimentos', 'Segurança', 'Tecnologia', 'Clínico', 'Administrativo'];

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch('/materiais_treinamento'); // GET
      setMateriais(data.data || []);
    } catch (err: any) {
      setError(err.message);
      setMateriais([]);
    } finally {
      setTimeout(() => setIsLoading(false), 300); // Delay visual
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.titulo || !formData.categoria || !formData.url_arquivo) {
      alert('Título, Categoria e URL são obrigatórios.');
      return;
    }
    try {
      // Seta loading local para o botão, mas o geral já está na tabela
      await apiFetch('/materiais_treinamento', 'POST', formData);
      setIsDialogOpen(false);
      fetchData(); // Recarrega a lista
    } catch (err: any) {
      setError(err.message);
      alert(`Erro ao salvar material: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente excluir este material?')) {
      try {
        setIsLoading(true); // Ativa o skeleton da tabela
        await apiFetch(`/materiais_treinamento/${id}`, 'DELETE');
        fetchData();
      } catch (err: any) {
        setError(err.message);
         if (err.message.includes('foreign key constraint')) {
             alert('Erro ao excluir: Existem registros de acesso vinculados a este material.');
         } else {
            alert(`Erro ao excluir material: ${err.message}`);
         }
         setIsLoading(false); // Para o loading em caso de erro
      }
    }
  };


  const handleAcessar = async (material: Material) => {
    if (!currentUser?.id_usuario || !material.url_arquivo) {
        alert("Erro: ID do usuário ou URL do material não encontrados.");
        return;
    }
    try {
        await apiFetch('/materiais_treinamento/acesso', 'POST', {
            id_material: material.id_material,
            id_usuario: currentUser.id_usuario
        });
        window.open(material.url_arquivo, '_blank');
        fetchData(); // Recarrega para obter nova contagem de acessos
    } catch (err: any) {
        setError(`Erro ao registrar acesso: ${err.message}`);
        window.open(material.url_arquivo, '_blank');
    }
  };

  const getIconByUrl = (url: string | null) => {
    if (!url) return <BookOpen className="w-5 h-5 text-gray-400" />;
    if (url.includes('.pdf')) return <FileText className="w-5 h-5 text-red-600" />;
    if (url.includes('.mp4') || url.includes('.avi') || url.includes('youtube.com') || url.includes('youtu.be')) return <Video className="w-5 h-5 text-purple-600" />;
    return <BookOpen className="w-5 h-5 text-blue-600" />;
  };

  const isAdmin = currentUser?.papel === 'Administrador';
  
  // Lógica de Filtro
  const filteredMateriais = materiais.filter(material => {
      const matchTitulo = !filtroTitulo || (material.titulo && material.titulo.toLowerCase().includes(filtroTitulo.toLowerCase()));
      const matchCategoria = filtroCategoria === 'all' || material.categoria === filtroCategoria;
      return matchTitulo && matchCategoria;
  });

  const totalAcessos = materiais.reduce((sum, m) => sum + m.acessos, 0);
  const maisAcessado = [...materiais].sort((a, b) => b.acessos - a.acessos)[0];

  // Componente Skeleton para os Cards
  const CardSkeleton = () => (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <Skeleton className="w-8 h-8 rounded-md flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between space-y-3">
         <div className="space-y-1">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
         </div>
         <Skeleton className="h-9 w-full rounded-md" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materiais de Treinamento</h1>
          <p className="text-sm text-gray-600">Biblioteca de documentos e recursos para capacitação</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 shadow hover:shadow-lg transition-all">
                <Plus className="w-4 h-4 mr-2" /> Novo Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Novo Material de Treinamento</DialogTitle>
                <DialogDescription>Adicione um novo recurso à biblioteca</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Título</Label>
                  <Input value={formData.titulo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, titulo: e.target.value })} />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(value: string) => setFormData({ ...formData, categoria: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                    <SelectContent>
                      {categorias.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>URL do Arquivo</Label>
                  <Input value={formData.url_arquivo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, url_arquivo: e.target.value })} placeholder="https://exemplo.com/arquivo.pdf" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-md animate-shake">
          <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5" /><strong>Erro:</strong> {error}</div>
        </div>
      )}

      {/* Cards de Resumo */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Materiais</p>
                  <h3 className="text-2xl font-bold text-gray-900">{materiais.length}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Acessos</p>
                  <h3 className="text-2xl font-bold text-gray-900">{totalAcessos}</h3>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Mais Acessado</p>
                  <h3 className="text-lg font-semibold text-gray-900 truncate" title={maisAcessado?.titulo || '-'}>
                    {maisAcessado?.titulo || '-'}
                  </h3>
                   <p className="text-xs text-gray-500">({maisAcessado?.acessos || 0} acessos)</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Download className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Card de Filtros */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1 w-full sm:w-auto">
              <Label htmlFor="filtroTitulo" className="text-xs font-medium">Buscar por Título</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                    id="filtroTitulo"
                    placeholder="Nome do protocolo, manual..."
                    value={filtroTitulo}
                    onChange={(e) => setFiltroTitulo(e.target.value)}
                    className="h-9 pl-8"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
               <Label htmlFor="filtroCategoria" className="text-xs font-medium">Filtrar Categoria</Label>
               <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger id="filtroCategoria" className="h-9">
                      <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todas as Categorias</SelectItem>
                      {categorias.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
               </Select>
            </div>
            {(filtroTitulo || filtroCategoria !== 'all') && (
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setFiltroTitulo(''); setFiltroCategoria('all'); }}
                    className="h-9 w-full sm:w-auto"
                 >
                    Limpar
                 </Button>
            )}
        </CardContent>
      </Card>

      {/* Grid de Materiais */}
      {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
      ) : error ? (
          <div className="text-center py-10 text-red-500">Erro ao carregar materiais.</div>
      ) : filteredMateriais.length === 0 ? (
           <div className="text-center py-16 text-gray-500">
               <Search className="w-12 h-12 mx-auto text-gray-400" />
               <h3 className="mt-2 text-lg font-medium">Nenhum material encontrado</h3>
               <p className="mt-1 text-sm">
                 {filtroTitulo || filtroCategoria !== 'all' ? 'Tente ajustar seus filtros.' : 'Nenhum material de treinamento foi cadastrado.'}
               </p>
            </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMateriais.map((material) => (
              <Card key={material.id_material} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 overflow-hidden">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        {getIconByUrl(material.url_arquivo)}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <CardTitle className="text-base leading-tight truncate" title={material.titulo || ''}>
                            {material.titulo || 'Sem Título'}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <Badge variant="outline">{material.categoria || 'Sem Categoria'}</Badge>
                        </CardDescription>
                      </div>
                    </div>
                     {isAdmin && (
                        <Button
                            variant="ghost" size="icon" className='flex-shrink-0 w-8 h-8'
                            onClick={() => handleDelete(material.id_material)} title="Excluir Material"
                        >
                            <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                     )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
                  <div className="text-xs text-gray-600">
                    <p>Upload: {new Date(material.data_upload).toLocaleDateString('pt-BR')}</p>
                    <p>Acessos: {material.acessos}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default" size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleAcessar(material)}
                      disabled={!material.url_arquivo}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Acessar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
      )}
    </div>
  );
}
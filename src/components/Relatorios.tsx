import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Calendar, Download, AlertCircle, BarChart2, PieChart as PieIcon, LineChart as LineIcon, Printer } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
// 1. Importar bibliotecas de PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const apiFetch = async (endpoint: string) => {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}${endpoint}`, { headers });
  const data = await response.json();
  if (!response.ok || !data.success) {
    console.error(`API Error (${endpoint}):`, data.error);
    throw new Error(data.error || `Falha na requisição ${endpoint}`);
  }
  return data;
};

// Tipos
interface AtendimentoPorProfissional { name: string; value: number; }
interface DistribuicaoTipo { name: string; value: number; }
interface AtendimentosSemana { dia: string; realizados: number; agendados: number; }
interface EvolucaoNoShow { mes: string; taxa: number; }


export default function Relatorios() {
  const [periodoInicial, setPeriodoInicial] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [periodoFinal, setPeriodoFinal] = useState(new Date().toISOString().split('T')[0]);
  const [tipoIndicador, setTipoIndicador] = useState('atendimentos');

  const [atendimentosPorProfissional, setAtendimentosPorProfissional] = useState<AtendimentoPorProfissional[]>([]);
  const [distribuicaoTipoAtendimento, setDistribuicaoTipoAtendimento] = useState<DistribuicaoTipo[]>([]);
  const [atendimentosSemana, setAtendimentosSemana] = useState<AtendimentosSemana[]>([]);
  const [evolucaoNoShow, setEvolucaoNoShow] = useState<EvolucaoNoShow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [profData, tipoData, semanaData, noshowData] = await Promise.all([
                apiFetch('/relatorios/atendimentos-por-profissional'),
                apiFetch('/relatorios/distribuicao-tipo'),
                apiFetch('/relatorios/atendimentos-semana'),
                apiFetch('/relatorios/evolucao-noshow')
            ]);
            const sortedProfData = (profData.data || []).sort((a: AtendimentoPorProfissional, b: AtendimentoPorProfissional) => b.value - a.value);
            setAtendimentosPorProfissional(sortedProfData);
            setDistribuicaoTipoAtendimento(tipoData.data || []);
            setAtendimentosSemana(semanaData.data || []);
            setEvolucaoNoShow(noshowData.data || []);
        } catch (err: any) {
            setError(`Erro ao carregar dados dos relatórios: ${err.message}`);
        } finally {
             setTimeout(() => setIsLoading(false), 300);
        }
    };
    fetchData();
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // 2. FUNÇÃO DE GERAR PDF (SUBSTITUÍDA)
  const handleGerarRelatorio = () => {
    if (isLoading) {
      alert("Por favor, aguarde o carregamento dos dados antes de gerar o relatório.");
      return;
    }

    const doc = new jsPDF();
    const dataFiltro = `Período de ${new Date(periodoInicial).toLocaleDateString('pt-BR')} até ${new Date(periodoFinal).toLocaleDateString('pt-BR')}`;
    const dataGeracao = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
    let startY = 45; // Posição Y inicial no PDF

    // Título
    doc.setFontSize(18);
    doc.text("Relatório de Indicadores da Unidade", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(dataFiltro, 14, 29);
    doc.text(dataGeracao, 14, 35);

    // Tabela 1: Atendimentos por Profissional
    if (atendimentosPorProfissional.length > 0) {
      doc.setFontSize(12);
      doc.text("Atendimentos por Profissional", 14, startY);
      autoTable(doc, {
        startY: startY + 2,
        head: [['Profissional', 'Total de Atendimentos']],
        body: atendimentosPorProfissional.map(item => [item.name, item.value]),
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }, // Azul
        didDrawPage: (data) => { startY = data.cursor?.y ?? startY; }
      });
    } else {
      doc.text("Nenhum dado de atendimento por profissional.", 14, startY);
      startY += 10;
    }
    
    // Tabela 2: Distribuição por Tipo de Atendimento
    if (distribuicaoTipoAtendimento.length > 0) {
      startY += 10; // Espaço
      doc.setFontSize(12);
      doc.text("Distribuição por Tipo de Atendimento", 14, startY);
      autoTable(doc, {
        startY: startY + 2,
        head: [['Tipo de Atendimento', 'Quantidade']],
        body: distribuicaoTipoAtendimento.map(item => [item.name, item.value]),
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        didDrawPage: (data) => { startY = data.cursor?.y ?? startY; }
      });
    } else {
      doc.text("Nenhum dado de distribuição por tipo.", 14, startY + 10);
      startY += 20;
    }

    // Tabela 3: Atendimentos da Semana
    if (atendimentosSemana.length > 0) {
      startY += 10;
      doc.setFontSize(12);
      doc.text("Atendimentos da Semana (Agendados vs Realizados)", 14, startY);
      autoTable(doc, {
        startY: startY + 2,
        head: [['Dia da Semana', 'Agendados', 'Realizados']],
        body: atendimentosSemana.map(item => [item.dia, item.agendados, item.realizados]),
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        didDrawPage: (data) => { startY = data.cursor?.y ?? startY; }
      });
    } else {
      doc.text("Nenhum dado de atendimentos da semana.", 14, startY + 10);
      startY += 20;
    }

    // Tabela 4: Evolução da Taxa de No-Show
    if (evolucaoNoShow.length > 0) {
      startY += 10;
      doc.setFontSize(12);
      doc.text("Evolução da Taxa de Não Comparecimento (No-Show)", 14, startY);
      autoTable(doc, {
        startY: startY + 2,
        head: [['Mês', 'Taxa de No-Show (%)']],
        body: evolucaoNoShow.map(item => [item.mes, `${item.taxa.toFixed(1)}%`]),
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        didDrawPage: (data) => { startY = data.cursor?.y ?? startY; }
      });
    } else {
      doc.text("Nenhum dado de No-Show.", 14, startY + 10);
    }
    
    // Salva o arquivo
    doc.save(`Relatorio_Indicadores_${periodoFinal}.pdf`);
  };
  // --- FIM DA FUNÇÃO PDF ---

  const handlePrintPage = () => {
    alert("A impressão de gráficos pode não funcionar perfeitamente em todos os navegadores. Para relatórios oficiais, prefira a função 'Gerar Relatório'.");
    window.print();
  };

  // Funções helpers visuais (Skeleton, NoData, Label Pizza)
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if(percent < 0.05) return null;
    return (
      <text x={x} y={y} fill="white" fontSize="11px" fontWeight="bold" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  const ChartLoadingSkeleton = ({ type = 'bar' }: { type?: 'bar' | 'line' | 'pie' | 'verticalBar' }) => (
    <div className='h-[350px] w-full p-4'>
      <Skeleton className="h-4 w-1/2 mb-4" /> <Skeleton className="h-3 w-1/3 mb-6" />
      <div className="flex items-end h-[250px] space-x-2">
         {type === 'verticalBar' ? (<><Skeleton className="h-[250px] w-full" /><Skeleton className="h-[180px] w-full" /><Skeleton className="h-[220px] w-full" /><Skeleton className="h-[150px] w-full" /><Skeleton className="h-[200px] w-full" /><Skeleton className="h-[170px] w-full" /><Skeleton className="h-[230px] w-full" /></>)
         : type === 'pie' ? (<div className="flex justify-center items-center w-full h-full"><Skeleton className="h-48 w-48 rounded-full" /></div>)
         : type === 'line' ? (<Skeleton className="h-full w-full" />)
         : (<div className="w-full space-y-3">{Array.from({length: 8}).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>)}
      </div>
    </div>
  );
  const NoDataDisplay = ({ message = "Nenhum dado disponível." }: { message?: string }) => (
     <div className='h-[350px] flex flex-col justify-center items-center text-gray-500'>
        <BarChart2 className="w-12 h-12 mb-3 text-gray-400" />
        <p>{message}</p>
     </div>
  );
  // --- Fim dos helpers ---


  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="border-b pb-4 mb-6 flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Relatórios e Indicadores</h1>
          <p className="text-sm text-gray-500 mt-1">Análise de desempenho e indicadores da unidade</p>
        </div>
        <Button onClick={handlePrintPage} variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Página
        </Button>
      </div>

      {error && (
        <Card className="bg-red-50 border-red-200 animate-shake print:hidden">
            <CardContent className="p-4 flex items-center gap-3 text-red-700">
             <AlertCircle className="w-5 h-5 flex-shrink-0" />
             <div>
                <p className="font-semibold">Erro ao carregar dados:</p>
                <p className="text-sm">{error}</p>
             </div>
            </CardContent>
        </Card>
      )}

      {/* Card de Filtros */}
       <Card className="shadow-sm print:hidden">
        <CardHeader>
          <CardTitle>Filtros de Relatório</CardTitle>
          <CardDescription>Selecione o período para gerar um relatório em PDF</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="periodoInicial">Período Inicial</Label>
              <Input id="periodoInicial" type="date" value={periodoInicial} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeriodoInicial(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="periodoFinal">Período Final</Label>
              <Input id="periodoFinal" type="date" value={periodoFinal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeriodoFinal(e.target.value)} />
            </div>
            <div className="flex items-end">
              {/* O Select de 'Tipo de Relatório' foi removido pois o PDF agora gera TODOS os relatórios. */}
              {/* Este espaço pode ser usado para outro filtro, ou removido. */}
            </div>
            <div className="flex items-end">
              <Button onClick={handleGerarRelatorio} className="w-full bg-blue-600 hover:bg-blue-700 shadow hover:shadow-lg transition-all" disabled={isLoading}>
                <Download className="w-4 h-4 mr-2" />
                {isLoading ? 'Carregando dados...' : 'Gerar Relatório PDF'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">

        <Card className="shadow-sm hover:shadow-md transition-shadow print:shadow-none print:border print:break-inside-avoid">
          <CardHeader>
             <div className="flex items-center gap-2">
                 <BarChart2 className="w-5 h-5 text-gray-500" />
                 <CardTitle>Atendimentos por Profissional</CardTitle>
             </div>
            <CardDescription>Total de atendimentos registrados (geral)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? ( <ChartLoadingSkeleton type="bar" /> ) 
             : !atendimentosPorProfissional || atendimentosPorProfissional.length === 0 ? ( <NoDataDisplay message="Nenhum atendimento registrado."/> ) 
             : (
              <ResponsiveContainer width="100%" height={Math.max(350, atendimentosPorProfissional.length * 30)}> 
                <BarChart data={atendimentosPorProfissional} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barSize={18} >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={150} interval={0} fontSize={11} tickMargin={5} />
                  <Tooltip cursor={{ fill: 'rgba(230, 230, 230, 0.5)' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="#10b981" name="Atendimentos" radius={[0, 4, 4, 0]}>
                     <LabelList dataKey="value" position="right" fontSize={10} fill="#333"/> 
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow print:shadow-none print:border print:break-inside-avoid">
          <CardHeader>
             <div className="flex items-center gap-2">
                 <BarChart2 className="w-5 h-5 text-gray-500" />
                 <CardTitle>Atendimentos da Semana</CardTitle>
             </div>
            <CardDescription>Atendimentos realizados vs agendados (últimos 7 dias)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? ( <ChartLoadingSkeleton type="verticalBar" /> ) 
            : !atendimentosSemana || atendimentosSemana.length === 0 ? ( <NoDataDisplay message="Nenhum dado da semana."/> )
            : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={atendimentosSemana} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dia" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: '8px' }}/>
                  <Legend wrapperStyle={{ fontSize: '12px' }}/>
                  <Bar dataKey="agendados" fill="#a5b4fc" name="Agendados" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realizados" fill="#4f46e5" name="Realizados" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow print:shadow-none print:border print:break-inside-avoid">
          <CardHeader>
             <div className="flex items-center gap-2">
                 <LineIcon className="w-5 h-5 text-gray-500" />
                 <CardTitle>Evolução da Taxa de Não Comparecimento</CardTitle>
             </div>
            <CardDescription>Percentual de faltas nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? ( <ChartLoadingSkeleton type="line"/> ) 
             : !evolucaoNoShow || evolucaoNoShow.length === 0 ? ( <NoDataDisplay message="Nenhum dado de No-Show."/> )
             : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={evolucaoNoShow} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" fontSize={11}/>
                    <YAxis unit="%" fontSize={11}/>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} contentStyle={{ borderRadius: '8px' }}/>
                    <Legend wrapperStyle={{ fontSize: '12px' }}/>
                    <Line type="monotone" dataKey="taxa" stroke="#f59e0b" strokeWidth={2.5} name="Taxa de No-Show (%)" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow print:shadow-none print:border print:break-inside-avoid">
          <CardHeader>
             <div className="flex items-center gap-2">
                 <PieIcon className="w-5 h-5 text-gray-500" />
                 <CardTitle>Distribuição por Tipo de Atendimento</CardTitle>
             </div>
            <CardDescription>Proporção de atendimentos registrados (geral)</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? ( <ChartLoadingSkeleton type="pie"/> ) 
             : !distribuicaoTipoAtendimento || distribuicaoTipoAtendimento.length === 0 ? ( <NoDataDisplay message="Nenhum tipo de atendimento."/> )
             : (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={distribuicaoTipoAtendimento}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={110}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={2}
                    >
                      {distribuicaoTipoAtendimento.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={COLORS[index % COLORS.length]}/>
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} atend.`, name]} contentStyle={{ borderRadius: '8px' }}/>
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                  </PieChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Importar useNavigate
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Users, Calendar, Clipboard, TrendingUp, Clock, AlertCircle, BarChart2, Bell, Grid } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, LabelList } from 'recharts';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton'; // Importar Skeleton

// Interface para o objeto dentro do array statsCards
interface StatCard {
  label: string;
  key: keyof DashboardStats;
  icon: React.ElementType;
  color: string;
}

// URL da API e helper de requisição autenticada
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const apiFetch = async (endpoint: string) => {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${endpoint}`, { headers });
  const data = await response.json();
  if (!response.ok || !data.success) {
    console.error(`API Error (${endpoint}):`, data.error);
    throw new Error(data.error || `Erro na rota ${endpoint}`);
  }
  return data; // Retorna o objeto de resposta completo
};

// Tipagem dos dados reais vindos da API
interface Agendamento { id_agendamento: number; nome_paciente: string; nome_profissional: string; data_hora: string; }
interface DashboardStats { pacientesAtivos: number; agendamentosHoje: number; atendimentosHoje: number; taxaPresenca: number; proximosAgendamentos: Agendamento[]; }
interface AtendimentosSemanaItem { dia: string; atendimentos: number; }
interface NoShowItem { mes: string; taxa: number; }
interface Notificacao { id: number; tipo: 'urgente' | 'info' | 'alerta'; mensagem: string; tempo: string; }

interface DashboardProps {
  currentUser: any;
  // onNavigate: (page: string) => void; // 2. REMOVIDA a prop
}

export default function Dashboard({ currentUser }: DashboardProps) { // 3. REMOVIDA a prop
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [atendimentosSemana, setAtendimentosSemana] = useState<AtendimentosSemanaItem[]>([]);
  const [noShowData, setNoShowData] = useState<NoShowItem[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate(); // 4. INICIAR o navigate

  useEffect(() => {
    const fetchAllDashboardData = async () => {
       try {
        setIsLoading(true);
        setError(null);
        const [statsRes, semanaRes, noshowRes, notificacoesRes] = await Promise.all([
          apiFetch('/dashboard/stats'),
          apiFetch('/dashboard/atendimentos-semana'),
          apiFetch('/dashboard/no-show'),
          apiFetch('/dashboard/notificacoes')
        ]);
        setStatsData(statsRes);
        setAtendimentosSemana(semanaRes.data || []);
        setNoShowData(noshowRes.data || []);
        setNotificacoes(notificacoesRes.data || []);
      } catch (err: any) {
        console.error('Erro ao carregar dashboard:', err);
        setError(err.message);
      } finally {
        setTimeout(() => setIsLoading(false), 300); // Suavizar loading
      }
    };
    fetchAllDashboardData();
  }, []);

  const statsCards: StatCard[] = [
    { label: 'Pacientes Ativos', key: 'pacientesAtivos', icon: Users, color: 'bg-blue-500' },
    { label: 'Agendamentos Hoje', key: 'agendamentosHoje', icon: Calendar, color: 'bg-green-500' },
    { label: 'Atendimentos Hoje', key: 'atendimentosHoje', icon: Clipboard, color: 'bg-purple-500' },
    { label: 'Taxa de Presença', key: 'taxaPresenca', icon: TrendingUp, color: 'bg-orange-500' },
  ];

  const formatDateTime = (isoString: string | undefined | null) => {
    if (!isoString) return { date: '-', time: '-' };
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) throw new Error("Data inválida");
        return {
            date: d.toLocaleDateString('pt-BR'),
            time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
    } catch(e) {
        console.error("Erro ao formatar data/hora:", isoString, e);
        return { date: 'Data Inválida', time: '--:--'};
    }
  }

  // Skeletons para Loading
  const CardSkeleton = () => (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-7 w-16" />
          </div>
          <Skeleton className="w-12 h-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );

  const ChartSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-1/2 mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  );

  const ListSkeleton = () => (
    <div className="space-y-3">
      {Array.from({length: 3}).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className='flex-1 space-y-2'>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
            Bem-vindo(a), {currentUser?.nome_usuario || 'Usuário'}!
        </h1>
        <p className="text-sm text-gray-600">Visão geral do sistema de gestão de saúde</p>
      </header>

      {error && (
         <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 flex items-center gap-3 text-red-700">
             <AlertCircle className="w-5 h-5 flex-shrink-0" />
             <div>
                <p className="font-semibold">Erro ao carregar dashboard:</p>
                <p className="text-sm">{error}</p>
             </div>
            </CardContent>
        </Card>
      )}

      {/* CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          statsCards.map(({ label, key, icon: Icon, color }) => {
            let displayValue: string | number = '...';
            let currentBgColor = color;
            const value = statsData ? statsData[key as keyof DashboardStats] : 0;
            const numericValue = Number(value || 0);

            if (key === 'taxaPresenca') {
              displayValue = `${numericValue.toFixed(0)}%`;
              if (numericValue < 50) currentBgColor = 'bg-red-500';
              else if (numericValue < 80) currentBgColor = 'bg-orange-500';
            } else {
              displayValue = numericValue.toLocaleString('pt-BR');
            }
            
            return (
              <Card key={key} className="hover:shadow-xl hover:scale-[1.03] transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">{label}</p>
                      <h3 className="text-2xl font-bold mt-1 text-gray-900">
                        {displayValue}
                      </h3>
                    </div>
                    <div className={`${currentBgColor} w-12 h-12 rounded-lg flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      {/* GRÁFICOS */}
      <div className="flex items-center gap-2 text-xl font-semibold text-gray-800 mt-8 mb-4">
          <BarChart2 className="w-5 h-5 text-gray-500" />
          <h2>Análises Gráficas</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Atendimentos da Semana</CardTitle>
            <CardDescription>Número de atendimentos realizados por dia</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={atendimentosSemana}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dia" fontSize={12} />
                  <YAxis allowDecimals={false}/>
                  <Tooltip contentStyle={{ borderRadius: '8px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="atendimentos" fill="#3b82f6" name="Atendimentos" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="atendimentos" position="top" fontSize={10}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Taxa de Não Comparecimento (No-Show)</CardTitle>
            <CardDescription>Percentual de faltas nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={noShowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={12}/>
                  <YAxis unit="%" />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} contentStyle={{ borderRadius: '8px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)' }}/>
                  <Legend />
                  <Line type="monotone" dataKey="taxa" stroke="#f59e0b" strokeWidth={2.5} name="Taxa %" dot={{ r: 4 }} activeDot={{ r: 6 }}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PRÓXIMOS AGENDAMENTOS E NOTIFICAÇÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
                 <Clock className="w-5 h-5 text-gray-500" />
                 <CardTitle>Próximos Agendamentos</CardTitle>
            </div>
            <CardDescription>Próximos agendamentos confirmados</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? ( <ListSkeleton /> )
             : error || !statsData ? ( <p className="text-center text-red-500 py-4">Erro ao carregar agendamentos.</p> )
             : !statsData.proximosAgendamentos?.length ? ( <p className="text-center text-gray-500 py-4">Nenhum agendamento futuro encontrado.</p> )
             : (
              <div className="space-y-3">
                {statsData.proximosAgendamentos.map((ag) => {
                  const { date, time } = formatDateTime(ag.data_hora);
                  return (
                    <div key={ag.id_agendamento} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className='overflow-hidden'>
                          <p className="font-semibold text-gray-900 truncate" title={ag.nome_paciente}>{ag.nome_paciente}</p>
                          <p className="text-sm text-gray-600 truncate" title={ag.nome_profissional}>{ag.nome_profissional}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-semibold text-blue-600">{time}</p>
                        <p className="text-xs text-gray-500">{date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Button onClick={() => navigate('/agendamentos')} variant="outline" className="mt-4 w-full">
              Ver todos os agendamentos
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
             <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-500" />
                <CardTitle>Notificações</CardTitle>
             </div>
            <CardDescription>Alertas e avisos recentes do sistema</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? ( <ListSkeleton /> )
              : error ? ( <p className="text-center text-red-500 py-4">Erro ao carregar notificações.</p> )
              : !notificacoes.length ? ( <p className="text-center text-gray-500 py-4">Nenhuma notificação recente.</p> )
              : (
              <div className="space-y-3">
                {notificacoes.map((notificacao: Notificacao) => (
                  <div key={notificacao.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      notificacao.tipo === 'urgente' ? 'text-red-500' :
                      notificacao.tipo === 'alerta' ? 'text-orange-500' : 'text-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{notificacao.mensagem}</p>
                      <p className="text-xs text-gray-500 mt-1">{notificacao.tempo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ATALHOS - 5. onClick alterado para navigate() */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
           <div className="flex items-center gap-2">
              <Grid className="w-5 h-5 text-gray-500" />
              <CardTitle>Atalhos Rápidos</CardTitle>
           </div>
          <CardDescription>Acesso rápido às principais seções</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onClick={() => navigate('/pacientes')} variant="outline" className="h-20 flex-col gap-2 hover:bg-blue-50 transition-colors">
              <Users className="w-6 h-6 text-blue-600" /> Pacientes
            </Button>
            <Button onClick={() => navigate('/agendamentos')} variant="outline" className="h-20 flex-col gap-2 hover:bg-green-50 transition-colors">
              <Calendar className="w-6 h-6 text-green-600" /> Agendamentos
            </Button>
            <Button onClick={() => navigate('/atendimentos')} variant="outline" className="h-20 flex-col gap-2 hover:bg-purple-50 transition-colors">
              <Clipboard className="w-6 h-6 text-purple-600" /> Atendimentos
            </Button>
            <Button onClick={() => navigate('/relatorios')} variant="outline" className="h-20 flex-col gap-2 hover:bg-orange-50 transition-colors">
              <TrendingUp className="w-6 h-6 text-orange-600" /> Relatórios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

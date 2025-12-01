import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Pacientes from './components/Pacientes';
import Profissionais from './components/Profissionais';
import Usuarios from './components/Usuarios';
import Agendamentos from './components/Agendamentos';
import Atendimentos from './components/Atendimentos';
import EvolucaoMedica from './components/EvolucaoMedica';
import FilaEspera from './components/FilaEspera';
import PreferenciaHorario from './components/PreferenciaHorario';
import UnidadesSaude from './components/UnidadesSaude';
import InstrucoesPos from './components/InstrucoesPos';
import MateriaisTreinamento from './components/MateriaisTreinamento';
import Relatorios from './components/Relatorios';
import Logs from './components/Logs';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

// Telas de Impressão e Ficha
import ImpressaoEvolucao from './components/ImpressaoEvolucao';
import ImpressaoInstrucao from './components/ImpressaoInstrucao';
import FichaPaciente from './components/FichaPaciente'; // NOVO
import ImpressaoAtestado from './components/ImpressaoAtestado'; // NOVO

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('authToken');
    if (savedUser && savedToken) {
      setCurrentUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar userRole={currentUser?.papel} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar currentUser={currentUser} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard currentUser={currentUser} />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/profissionais" element={<Profissionais />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/agendamentos" element={<Agendamentos />} />
            <Route path="/atendimentos" element={<Atendimentos />} />
            <Route path="/evolucao" element={<EvolucaoMedica />} />
            <Route path="/fila" element={<FilaEspera />} />
            <Route path="/preferencias" element={<PreferenciaHorario />} />
            <Route path="/unidades" element={<UnidadesSaude />} />
            <Route path="/instrucoes" element={<InstrucoesPos />} />
            <Route path="/materiais" element={<MateriaisTreinamento currentUser={currentUser} />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/logs" element={<Logs />} />
            
            {/* --- NOVAS ROTAS --- */}
            <Route path="/pacientes/:id/ficha" element={<FichaPaciente />} />
            <Route path="/imprimir/atestado" element={<ImpressaoAtestado />} />
            {/* --- ROTAS DE IMPRESSÃO EXISTENTES --- */}
            <Route path="/imprimir/evolucao" element={<ImpressaoEvolucao />} />
            <Route path="/imprimir/instrucao" element={<ImpressaoInstrucao />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom'; // 1. Importar Link e useLocation
import { 
  Home, Users, UserCircle, Calendar, Clipboard, 
  Activity, Clock, Heart, Building, FileText, 
  BookOpen, BarChart3, Shield, UserCog, List
} from 'lucide-react';

interface SidebarProps {
  // 2. Props 'currentPage' e 'onNavigate' REMOVIDAS
  userRole: string;
}

export default function Sidebar({ userRole }: SidebarProps) {
  // 3. Obter a localização atual da URL
  const location = useLocation();

  const menuItems = [
    // 4. IDs alterados para corresponderem aos 'paths' da rota
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['Administrador', 'Recepcionista', 'Profissional'] },
    { id: 'pacientes', label: 'Pacientes', icon: Users, roles: ['Administrador', 'Recepcionista', 'Profissional'] },
    { id: 'profissionais', label: 'Profissionais', icon: UserCircle, roles: ['Administrador', 'Recepcionista'] },
    { id: 'usuarios', label: 'Usuários', icon: UserCog, roles: ['Administrador'] },
    { id: 'agendamentos', label: 'Agendamentos', icon: Calendar, roles: ['Administrador', 'Recepcionista', 'Profissional'] },
    { id: 'atendimentos', label: 'Atendimentos', icon: Clipboard, roles: ['Administrador', 'Profissional'] },
    { id: 'evolucao', label: 'Evolução Médica', icon: Activity, roles: ['Administrador', 'Profissional'] },
    { id: 'fila', label: 'Fila de Espera', icon: List, roles: ['Administrador', 'Recepcionista'] },
    { id: 'preferencias', label: 'Preferências', icon: Clock, roles: ['Administrador', 'Recepcionista'] },
    { id: 'unidades', label: 'Unidades', icon: Building, roles: ['Administrador'] },
    { id: 'instrucoes', label: 'Instruções', icon: FileText, roles: ['Administrador', 'Profissional'] },
    { id: 'materiais', label: 'Treinamento', icon: BookOpen, roles: ['Administrador', 'Profissional'] },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3, roles: ['Administrador'] },
    { id: 'logs', label: 'Logs', icon: Shield, roles: ['Administrador'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    // Adicionada classe print:hidden para não aparecer na impressão
    <aside className="w-64 bg-white border-r border-gray-200 shadow-sm print:hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-blue-900">HealthCare</h1>
            <p className="text-xs text-gray-500">Sistema de Gestão</p>
          </div>
        </div>
      </div>
      <nav className="p-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            // 5. 'isActive' agora compara o 'pathname' da URL com o 'id' do item
            const isActive = location.pathname === `/${item.id}`;
            return (
              <li key={item.id}>
                {/* 6. Substituído <button> por <Link> */}
                <Link
                  to={`/${item.id}`} // Navega para a URL correta
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

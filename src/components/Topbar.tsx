import { Button } from './ui/button';
import { LogOut, User } from 'lucide-react';
import { Badge } from './ui/badge';

interface TopbarProps {
  currentUser: any;
  onLogout: () => void;
}

export default function Topbar({ currentUser, onLogout }: TopbarProps) {
  // Tenta pegar o nome_usuario (do login) se o 'nome' (que não existe) falhar
  const userName = currentUser?.nome || currentUser?.nome_usuario || 'Usuário';

  return (
    // Adicionada classe print:hidden para não imprimir
    <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm print:hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800">Bem-vindo(a), {userName}</h2>
          <p className="text-sm text-gray-500">Gerencie sua unidade de saúde</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600" />
            <div className="text-right">
              <p className="text-sm">{userName}</p>
              <Badge variant="secondary" className="text-xs">
                {currentUser?.papel}
              </Badge>
            </div>
          </div>
          <Button 
            onClick={onLogout} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}

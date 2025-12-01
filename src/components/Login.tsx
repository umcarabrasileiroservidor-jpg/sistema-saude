import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Activity } from 'lucide-react';

// Define a URL base da sua API (do server.js)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface LoginProps {
  // onLogin agora recebe o objeto 'user' que vem da API
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); 

  // --- ADICIONADO 'React.FormEvent' ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Chama a rota /api/login do backend
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome_usuario: username, 
          senha: password,        
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao tentar fazer login');
      }

      // 3. Salva o token no localStorage para usar em outras telas
      localStorage.setItem('authToken', data.token);

      // 4. Chama a função onLogin (do App.tsx) com os dados do usuário
      onLogin(data.user);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <CardTitle>Sistema de Gestão de Saúde</CardTitle>
          <CardDescription>Entre com suas credenciais para acessar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                type="text"
                value={username}
                // --- ADICIONADO 'React.ChangeEvent<HTMLInputElement>' ---
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
                className="bg-white"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                // --- ADICIONADO 'React.ChangeEvent<HTMLInputElement>' ---
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                className="bg-white"
                disabled={isLoading}
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          
          
        </CardContent>
      </Card>
    </div>
  );
}
// Arquivo: src/components/ImpressaoEvolucao.tsx (Novo)

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

// Interface da Evolução (copiada de EvolucaoMedica.tsx)
interface Evolucao {
  id_evolucao: number;
  nome_paciente?: string;
  nome_profissional?: string;
  data_registro: string;
  observacoes: string | null;
}

// Helper para formatar data (copiado de EvolucaoMedica.tsx)
const formatDisplayDateTime = (isoString: string | undefined | null): string => {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch { return isoString; }
}

export default function ImpressaoEvolucao() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // O 'useRef' impede que o useEffect rode duas vezes em Strict Mode
  const printTriggered = useRef(false); 

  // Pega os dados da evolução passados pelo 'navigate'
  const evolucao: Evolucao | undefined = location.state?.evolucao;

  useEffect(() => {
    if (!evolucao) {
      // Se não houver dados (ex: recarregou a página), volta para a tela anterior
      alert("Dados da evolução não encontrados. Retornando...");
      navigate(-1); // Volta uma página no histórico
      return;
    }

    if (!printTriggered.current) {
      printTriggered.current = true; // Marca que a impressão foi acionada
      
      // Aciona a impressão
      window.print();

      // Define o que fazer *depois* que o usuário fechar a janela de impressão
      window.onafterprint = () => {
        navigate(-1); // Volta para a tela de Evolução Médica
      };
    }
  }, [evolucao, navigate]);

  if (!evolucao) {
    // Mostra tela em branco enquanto redireciona
    return null; 
  }

  // Este é o layout que será impresso
  // Classes 'text-black' são adicionadas para garantir a impressão
  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-white text-black">
      {/* Cabeçalho da Clínica */}
      <div className="flex items-center justify-between border-b border-gray-300 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center print:bg-gray-200">
            <Heart className="w-7 h-7 text-white print:text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-900 print:text-black">HealthCare</h1>
            <p className="text-sm text-gray-500 print:text-gray-700">Sistema de Gestão de Saúde</p>
          </div>
        </div>
        <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800 print:text-black">Evolução Médica</h2>
            <p className="text-sm text-gray-600 print:text-gray-700">ID: {evolucao.id_evolucao}</p>
        </div>
      </div>

      {/* Dados do Paciente */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold border-b border-gray-300 mb-3 text-gray-900 print:text-black">Dados do Paciente</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800 print:text-black">
          <div>
            <strong>Paciente:</strong> {evolucao.nome_paciente || 'N/A'}
          </div>
          <div>
            <strong>Data do Registro:</strong> {formatDisplayDateTime(evolucao.data_registro)}
          </div>
          <div>
            <strong>Profissional:</strong> {evolucao.nome_profissional || 'N/A'}
          </div>
        </div>
      </div>

      {/* Observações Clínicas */}
      <div>
         <h3 className="text-lg font-semibold border-b border-gray-300 mb-3 text-gray-900 print:text-black">Observações Clínicas</h3>
         <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 print:bg-white print:border-gray-300">
            <p className="text-sm text-gray-800 whitespace-pre-wrap print:text-black">
                {evolucao.observacoes || 'Nenhuma observação registrada.'}
            </p>
         </div>
      </div>

      {/* Rodapé */}
      <div className="mt-20 pt-4 border-t border-gray-300 text-center">
        <p className="text-sm text-gray-700 font-semibold mb-2 print:text-black">{evolucao.nome_profissional || 'Assinatura do Profissional'}</p>
        <p className="text-xs text-gray-500 print:text-gray-700">(Assinatura e Carimbo)</p>
      </div>
    </div>
  );
}
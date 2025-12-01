import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Heart, FileText } from 'lucide-react';

// Interface da Instrução
interface Instrucao {
  id_instrucao: number;
  nome_paciente?: string;
  nome_profissional?: string;
  data_envio: string;
  texto_instrucao: string | null;
  canal_envio: string | null;
}

// Helper para formatar data
const formatDisplayDate = (isoString: string | undefined | null): string => {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleDateString('pt-BR');
    } catch { return isoString; }
}

export default function ImpressaoInstrucao() {
  const location = useLocation();
  const navigate = useNavigate();
  const printTriggered = useRef(false);

  const instrucao: Instrucao | undefined = location.state?.instrucao;

  useEffect(() => {
    if (!instrucao) {
      alert("Dados da instrução não encontrados. Retornando...");
      navigate(-1);
      return;
    }

    if (!printTriggered.current) {
      printTriggered.current = true;
      window.print();
      window.onafterprint = () => {
        navigate(-1); // Volta para a tela de Instruções
      };
    }
  }, [instrucao, navigate]);

  if (!instrucao) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-white text-black">
      {/* Cabeçalho */}
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
            <h2 className="text-2xl font-bold text-gray-800 print:text-black">Instrução Médica</h2>
            <p className="text-sm text-gray-600 print:text-gray-700">ID: {instrucao.id_instrucao}</p>
        </div>
      </div>

      {/* Dados */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold border-b border-gray-300 mb-3 text-gray-900 print:text-black">Detalhes da Orientação</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-800 print:text-black">
          <div>
            <strong>Paciente:</strong> {instrucao.nome_paciente || 'N/A'}
          </div>
          <div>
            <strong>Data de Envio:</strong> {formatDisplayDate(instrucao.data_envio)}
          </div>
          <div>
            <strong>Profissional:</strong> {instrucao.nome_profissional || 'N/A'}
          </div>
           <div>
            <strong>Canal:</strong> {instrucao.canal_envio || 'N/A'}
          </div>
        </div>
      </div>

      {/* Texto da Instrução */}
      <div>
         <h3 className="text-lg font-semibold border-b border-gray-300 mb-3 text-gray-900 print:text-black">Orientações</h3>
         <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 print:bg-white print:border-gray-300 min-h-[300px]">
            <p className="text-sm text-gray-800 whitespace-pre-wrap print:text-black">
                {instrucao.texto_instrucao || 'Nenhuma instrução registrada.'}
            </p>
         </div>
      </div>

      {/* Rodapé */}
      <div className="mt-20 pt-4 border-t border-gray-300 text-center">
        <p className="text-sm text-gray-700 font-semibold mb-2 print:text-black">{instrucao.nome_profissional || 'Assinatura do Profissional'}</p>
        <p className="text-xs text-gray-500 print:text-gray-700">(Assinatura e Carimbo)</p>
      </div>
    </div>
  );
}

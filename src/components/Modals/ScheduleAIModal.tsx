import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { api } from '../../services/api';
import { ScheduleAIPreview } from '../../types';
import { dayKey, shiftDay, formatSeconds, formatTimeHM } from '../../utils/domain';

interface ScheduleAIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScheduleAIModal: React.FC<ScheduleAIModalProps> = ({ isOpen, onClose }) => {
  const { selectedEstudo, refreshData } = useStudy();
  const [inicio, setInicio] = useState(() => dayKey());
  const [fim, setFim] = useState(() => shiftDay(dayKey(), 60));
  const [duracaoMinutos, setDuracaoMinutos] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [preview, setPreview] = useState<ScheduleAIPreview | null>(null);

  if (!isOpen || !selectedEstudo) return null;

  const handleGeneratePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsGenerating(true);
    try {
      const data = await api.ia.cronogramaPrevia({
        concurso_id: selectedEstudo.id,
        inicio,
        fim,
        duracao_minutos: Number(duracaoMinutos),
      });
      setPreview(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao gerar prévia com IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setIsConfirming(true);
    try {
      await api.ia.cronogramaConfirmar({
        concurso_id: selectedEstudo.id,
        inicio,
        fim,
        duracao_minutos: Number(duracaoMinutos),
        atividades: preview.atividades,
      });
      await refreshData();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao confirmar cronograma.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cronograma Inteligente com IA
              </h3>
              <p className="text-xs text-slate-500">
                Encaixe automático nas suas janelas semanais com revisões espaçadas
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}

          {!preview ? (
            <form onSubmit={handleGeneratePreview} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    required
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Término (até a prova)
                  </label>
                  <input
                    type="date"
                    required
                    value={fim}
                    onChange={(e) => setFim(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Duração de Cada Bloco de Estudo (minutos)
                </label>
                <input
                  type="number"
                  min={25}
                  max={120}
                  required
                  value={duracaoMinutos}
                  onChange={(e) => setDuracaoMinutos(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Recomendado: 50 minutos. A IA respeita 10 minutos de intervalo entre blocos.
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Como funciona o algoritmo:
                </span>
                <p>• Mapeia todas as janelas de disponibilidade cadastradas.</p>
                <p>• A IA organiza a sequência pedagógica por peso das disciplinas.</p>
                <p>• Agenda automaticamente revisões espaçadas (1 dia, 7 dias, 30 dias e reforço final).</p>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Organizando horários e revisões...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Calcular Prévia do Cronograma</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 dark:bg-slate-850 dark:border-slate-700 text-center">
                  <span className="text-[11px] text-slate-400 font-medium">Total de Blocos</span>
                  <span className="block text-xl font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                    {preview.resumo.total_blocos}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 dark:bg-slate-850 dark:border-slate-700 text-center">
                  <span className="text-[11px] text-slate-400 font-medium">Estudos Iniciais</span>
                  <span className="block text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                    {preview.resumo.total_estudos_iniciais}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 dark:bg-slate-850 dark:border-slate-700 text-center">
                  <span className="text-[11px] text-slate-400 font-medium">Revisões Espaçadas</span>
                  <span className="block text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 tabular-nums">
                    {preview.resumo.total_revisoes}
                  </span>
                </div>
              </div>

              {preview.resumo.conteudos_nao_atendidos > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                  <span>
                    {preview.resumo.conteudos_nao_atendidos} tópicos não couberam nas janelas livres. Considere estender o período ou aumentar as horas semanais.
                  </span>
                </div>
              )}

              {/* Sample list */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {preview.atividades.slice(0, 15).map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200/70 bg-white dark:bg-slate-850 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {act.disciplina_nome || 'Matéria'}
                      </span>
                      <span className="text-slate-400 block text-[11px] font-mono">
                        {new Date(act.inicio_previsto).toLocaleDateString('pt-BR')} às {formatTimeHM(act.inicio_previsto)}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {act.tipo.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {preview && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
            <button
              onClick={() => setPreview(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              ← Alterar parâmetros
            </button>

            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isConfirming ? 'Gravando cronograma...' : 'Confirmar e Inserir na Agenda'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

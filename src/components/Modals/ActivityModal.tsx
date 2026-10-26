import React from 'react';
import { X, Play, CheckCircle2, Clock, Calendar, Trash2 } from 'lucide-react';
import { Atividade } from '../../types';
import { useStudy } from '../../context/StudyContext';
import { api } from '../../services/api';
import { formatSeconds, formatTimeHM } from '../../utils/domain';

interface ActivityModalProps {
  activity: Atividade | null;
  onClose: () => void;
  onStartPomodoro: (act: Atividade) => void;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  activity,
  onClose,
  onStartPomodoro,
}) => {
  const { disciplinas, conteudos, refreshData } = useStudy();

  if (!activity) return null;

  const disciplina = disciplinas.find((d) => d.id === activity.disciplina_id);
  const conteudo = conteudos.find((c) => c.id === activity.conteudo_id);
  const isDone = activity.status === 'concluido';

  const handleToggleStatus = async () => {
    const nextStatus = isDone ? 'pendente' : 'concluido';
    await api.atividades.update(activity.id, { status: nextStatus });
    await refreshData();
    onClose();
  };

  const handleDelete = async () => {
    if (confirm('Deseja excluir esta atividade do cronograma?')) {
      await api.atividades.delete(activity.id);
      await refreshData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6 animate-in zoom-in-95">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60">
              {disciplina?.nome || 'Disciplina'}
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
              {conteudo?.titulo || 'Sessão de Estudos'}
            </h3>
            {conteudo?.descricao && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {conteudo.descricao}
              </p>
            )}
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Data Prevista</span>
            </span>
            <span className="font-mono font-semibold">
              {new Date(activity.inicio_previsto).toLocaleDateString('pt-BR')} às {formatTimeHM(activity.inicio_previsto)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Duração</span>
            </span>
            <span className="font-mono font-semibold">
              {formatSeconds(activity.duracao_segundos)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/50 dark:border-slate-800">
            <span className="font-medium">Status</span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isDone
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {activity.status}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {!isDone && (
            <button
              onClick={() => {
                onClose();
                onStartPomodoro(activity);
              }}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar Pomodoro nesta Atividade</span>
            </button>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleDelete}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>

            <button
              onClick={handleToggleStatus}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
            >
              {isDone ? 'Marcar como Pendente' : 'Marcar como Concluído'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

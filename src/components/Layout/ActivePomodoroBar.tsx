import React, { useEffect, useState } from 'react';
import { Play, Pause, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { api } from '../../services/api';
import { sessionElapsed } from '../../utils/domain';

export const ActivePomodoroBar: React.FC<{ onOpenTimer: () => void }> = ({ onOpenTimer }) => {
  const { activePomodoro, refreshPomodoro } = useStudy();
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!activePomodoro) return;

    const updateTimer = () => {
      const elapsed = sessionElapsed(activePomodoro);
      const remaining = Math.max(0, activePomodoro.duracao_planejada_segundos - elapsed);
      setSecondsLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activePomodoro]);

  if (!activePomodoro || !['em_andamento', 'pausado'].includes(activePomodoro.status)) {
    return null;
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isPaused = activePomodoro.status === 'pausado';

  const handlePauseResume = async () => {
    if (isPaused) {
      await api.pomodoro.resume();
    } else {
      await api.pomodoro.pause();
    }
    await refreshPomodoro();
  };

  const handleFinish = async () => {
    try {
      await api.pomodoro.finish();
      await refreshPomodoro();
    } catch (err: any) {
      alert(err.message || 'Não é possível concluir antes do tempo previsto.');
    }
  };

  const handleCancel = async () => {
    if (confirm('Deseja interromper e cancelar esta sessão de foco?')) {
      await api.pomodoro.cancel();
      await refreshPomodoro();
    }
  };

  return (
    <div className="bg-slate-900 text-white px-6 py-2.5 flex items-center justify-between shadow-md border-b border-slate-800 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenTimer}>
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <Timer className={`w-4 h-4 ${!isPaused ? 'animate-pulse' : ''}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {activePomodoro.fase === 'foco' ? 'Foco em Andamento' : 'Intervalo'}
            </span>
            {isPaused && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-medium">
                Pausado
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-100 max-w-md truncate">
            {activePomodoro.titulo || 'Sessão de Estudo'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span
          className="font-mono text-xl font-bold tracking-tight text-emerald-400 tabular-nums cursor-pointer"
          onClick={onOpenTimer}
        >
          {timeFormatted}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePauseResume}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title={isPaused ? 'Retomar' : 'Pausar'}
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
          </button>
          <button
            onClick={handleFinish}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            title="Concluir Fase"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors"
            title="Cancelar"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Settings,
  History,
  Timer,
  BookOpen,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { api } from '../../services/api';
import { PomodoroSession, PomodoroPrefs } from '../../types';
import { sessionElapsed, formatSeconds } from '../../utils/domain';

export const PomodoroView: React.FC = () => {
  const { activePomodoro, refreshPomodoro, selectedEstudo, disciplinas, conteudos, atividades } =
    useStudy();

  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>('');
  const [selectedContentId, setSelectedContentId] = useState<string>('');
  const [history, setHistory] = useState<PomodoroSession[]>([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [prefs, setPrefs] = useState<PomodoroPrefs | null>(null);
  const [isEditingPrefs, setIsEditingPrefs] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);

  const loadHistory = async (offset = 0) => {
    try {
      const data = await api.pomodoro.getHistory(offset);
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPrefs = async () => {
    try {
      const p = await api.pomodoro.getPrefs();
      setPrefs(p);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadHistory(historyOffset);
    loadPrefs();
  }, [historyOffset]);

  useEffect(() => {
    if (!activePomodoro) {
      const defaultDuration = (prefs?.duracao_foco_segundos || 1500);
      setSecondsLeft(defaultDuration);
      return;
    }

    const updateTimer = () => {
      const elapsed = sessionElapsed(activePomodoro);
      const remaining = Math.max(0, activePomodoro.duracao_planejada_segundos - elapsed);
      setSecondsLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activePomodoro, prefs]);

  const isRunning = activePomodoro?.status === 'em_andamento';
  const isPaused = activePomodoro?.status === 'pausado';
  const hasActiveSession = Boolean(activePomodoro && ['em_andamento', 'pausado'].includes(activePomodoro.status));

  const totalPlanned = activePomodoro?.duracao_planejada_segundos || (prefs?.duracao_foco_segundos || 1500);
  const progressPercent = Math.min(100, Math.max(0, ((totalPlanned - secondsLeft) / totalPlanned) * 100));

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleStart = async (fase: 'foco' | 'pausa_curta' | 'pausa_longa' = 'foco') => {
    try {
      const disc = disciplinas.find((d) => d.id === selectedDisciplineId);
      const cont = conteudos.find((c) => c.id === selectedContentId);
      const title = disc ? `${disc.nome}${cont ? ` — ${cont.titulo}` : ''}` : 'Sessão de Foco Livre';

      await api.pomodoro.start({
        fase,
        disciplina_id: selectedDisciplineId || null,
        conteudo_id: selectedContentId || null,
      });
      await refreshPomodoro();
      await loadHistory(historyOffset);
    } catch (err: any) {
      alert(err.message || 'Erro ao iniciar pomodoro.');
    }
  };

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
      await loadHistory(historyOffset);
    } catch (err: any) {
      alert(err.message || 'Não é possível concluir antes do término do tempo planejado.');
    }
  };

  const handleCancel = async () => {
    if (confirm('Deseja interromper e cancelar a sessão ativa?')) {
      await api.pomodoro.cancel();
      await refreshPomodoro();
      await loadHistory(historyOffset);
    }
  };

  const currentDisciplines = disciplinas.filter(
    (d) => !selectedEstudo || d.concurso_id === selectedEstudo.id
  );

  const availableContents = conteudos.filter(
    (c) => c.disciplina_id === selectedDisciplineId
  );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-10">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Foco Profundo
          </span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Cronômetro Pomodoro
          </h2>
        </div>

        <button
          onClick={() => setIsEditingPrefs(!isEditingPrefs)}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors"
          title="Configurar durações"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Main Focus Dial Card */}
      <div className="p-8 md:p-12 rounded-3xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-sm text-center relative overflow-hidden">
        {/* Phase Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-6">
          <span
            className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-emerald-500 animate-ping' : isPaused ? 'bg-amber-400' : 'bg-slate-400'
            }`}
          ></span>
          <span>
            {hasActiveSession
              ? activePomodoro?.fase === 'foco'
                ? 'Fase de Foco Ativa'
                : 'Pausa / Descanso'
              : 'Pronto para Começar'}
          </span>
        </div>

        {/* Big Circular Clock */}
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center my-4">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="116"
              className="stroke-slate-100 dark:stroke-slate-800"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="128"
              cy="128"
              r="116"
              className="stroke-emerald-500 dark:stroke-emerald-400 transition-all duration-1000 ease-linear"
              strokeWidth="10"
              strokeDasharray={2 * Math.PI * 116}
              strokeDashoffset={2 * Math.PI * 116 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {timeFormatted}
            </span>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-2">
              {hasActiveSession ? activePomodoro?.titulo : 'Selecione a matéria abaixo'}
            </span>
          </div>
        </div>

        {/* Link Study Selectors (only if not running) */}
        {!hasActiveSession && (
          <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 my-6 text-left">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Matéria do Foco
              </label>
              <select
                value={selectedDisciplineId}
                onChange={(e) => {
                  setSelectedDisciplineId(e.target.value);
                  setSelectedContentId('');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Foco Livre (Sem matéria)</option>
                {currentDisciplines.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Assunto (Opcional)
              </label>
              <select
                disabled={!selectedDisciplineId}
                value={selectedContentId}
                onChange={(e) => setSelectedContentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50"
              >
                <option value="">Geral da Matéria</option>
                {availableContents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 mt-6">
          {!hasActiveSession ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => handleStart('foco')}
                className="px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Foco</span>
              </button>
              <button
                onClick={() => handleStart('pausa_curta')}
                className="px-4 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
              >
                Pausa Curta (5m)
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handlePauseResume}
                className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm dark:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
              >
                {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                <span>{isPaused ? 'Retomar Foco' : 'Pausar'}</span>
              </button>

              <button
                onClick={handleFinish}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Concluir Ciclo</span>
              </button>

              <button
                onClick={handleCancel}
                className="p-3 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                title="Cancelar sessão"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Histórico de Sessões
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-400">Páginas de 20 sessões</span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Nenhuma sessão registrada ainda.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((sess) => (
              <div key={sess.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {sess.titulo || 'Sessão de Foco'}
                  </span>
                  <div className="flex items-center gap-2 text-slate-400 mt-0.5 font-mono text-[11px]">
                    <span>{new Date(sess.iniciada_em).toLocaleDateString('pt-BR')}</span>
                    <span>·</span>
                    <span>Planejado: {formatSeconds(sess.duracao_planejada_segundos)}</span>
                    <span>·</span>
                    <span>Estudado: {formatSeconds(sess.tempo_acumulado_segundos)}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    sess.status === 'concluido'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {sess.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination buttons */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            disabled={historyOffset === 0}
            onClick={() => setHistoryOffset(Math.max(0, historyOffset - 20))}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 disabled:opacity-30"
          >
            ← Anteriores
          </button>
          <button
            disabled={history.length < 20}
            onClick={() => setHistoryOffset(historyOffset + 20)}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 disabled:opacity-30"
          >
            Próximos →
          </button>
        </div>
      </div>
    </div>
  );
};

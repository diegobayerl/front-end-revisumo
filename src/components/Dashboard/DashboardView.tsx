import React from 'react';
import {
  CheckCircle2,
  Clock,
  Play,
  Calendar,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { dayKey, dailySummary, formatSeconds, formatTimeHM, shiftDay } from '../../utils/domain';
import { Atividade } from '../../types';
import { api } from '../../services/api';

interface DashboardViewProps {
  onNavigate: (page: any) => void;
  onOpenActivity: (atividade: Atividade) => void;
  onStartPomodoroForActivity: (atividade: Atividade) => void;
  onOpenQuickSchedule: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenActivity,
  onStartPomodoroForActivity,
  onOpenQuickSchedule,
}) => {
  const { estudos, selectedEstudo, atividades, disciplinas, refreshData } = useStudy();
  const today = dayKey();
  const tomorrow = shiftDay(today, 1);

  const todaySummary = dailySummary(atividades, today);
  const tomorrowSummary = dailySummary(atividades, tomorrow);

  const handleToggleStatus = async (e: React.MouseEvent, atividade: Atividade) => {
    e.stopPropagation();
    const nextStatus = atividade.status === 'concluido' ? 'pendente' : 'concluido';
    await api.atividades.update(atividade.id, { status: nextStatus });
    await refreshData();
  };

  if (estudos.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-950/40 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
          Primeiro Passo
        </span>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-2 mb-3">
          Sem estudo cadastrado
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          Envie seu edital em PDF para a IA separar as disciplinas e os tópicos em segundos, ou cadastre seus estudos manualmente.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('estudos')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Cadastrar primeiro estudo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const getDisciplineName = (id: string) =>
    disciplinas.find((d) => d.id === id)?.nome || 'Disciplina';

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            {selectedEstudo ? `Estudo: ${selectedEstudo.nome}` : 'Visão Geral'}
          </span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            O seu ritmo de hoje.
          </h2>
        </div>

        <button
          onClick={onOpenQuickSchedule}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Atividade</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pendentes Hoje</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {todaySummary.pending.length}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Concluídas Hoje</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {todaySummary.completed.length}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tempo Planejado</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatSeconds(todaySummary.seconds)}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total de Atividades</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {todaySummary.items.length}
          </p>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Today's Agenda (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Roteiro de Hoje</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Suas sessões agendadas para o dia</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </div>

            {todaySummary.items.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800/80 rounded-2xl">
                <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nenhum estudo agendado para hoje</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">Aproveite para revisar ou agendar novos blocos.</p>
                <button
                  onClick={onOpenQuickSchedule}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors"
                >
                  + Agendar Bloco
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySummary.items.map((item) => {
                  const isDone = item.status === 'concluido';
                  return (
                    <div
                      key={item.id}
                      onClick={() => onOpenActivity(item)}
                      className={`group p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isDone
                          ? 'bg-slate-50/60 border-slate-200/60 dark:bg-slate-900/40 dark:border-slate-800/40 opacity-70'
                          : 'bg-white border-slate-200/80 hover:border-emerald-300/80 dark:bg-slate-850 dark:border-slate-700/80 dark:hover:border-emerald-500/50 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <button
                          onClick={(e) => handleToggleStatus(e, item)}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                            isDone
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 text-transparent'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 fill-current" />
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {formatTimeHM(item.inicio_previsto)}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                              {getDisciplineName(item.disciplina_id)}
                            </span>
                          </div>
                          <h4 className={`text-sm font-semibold mt-0.5 ${isDone ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                            {formatSeconds(item.duracao_segundos)} de estudo
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isDone && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartPomodoroForActivity(item);
                            }}
                            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 transition-colors"
                            title="Iniciar Pomodoro nesta atividade"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                            isDone
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          }`}
                        >
                          {isDone ? 'Concluído' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tomorrow Preview Card */}
          <div className="p-6 rounded-3xl bg-slate-50/70 border border-slate-200/60 dark:bg-slate-900/50 dark:border-slate-800/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Amanhã no Cronograma</h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {tomorrowSummary.items.length} {tomorrowSummary.items.length === 1 ? 'atividade' : 'atividades'}
              </span>
            </div>
            {tomorrowSummary.items.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhum estudo agendado para amanhã ainda.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {tomorrowSummary.items.slice(0, 4).map((item) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs flex justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {getDisciplineName(item.disciplina_id)}
                    </span>
                    <span className="text-slate-400 font-mono ml-2">
                      {formatTimeHM(item.inicio_previsto)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pomodoro Quick Dial */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-b from-white to-slate-50/80 border border-slate-200/80 dark:from-slate-900 dark:to-slate-900/60 dark:border-slate-800 shadow-xs text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Relógio Pomodoro
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 mb-6">
              Sessão de Foco
            </h3>

            {/* Circular Visual Dial */}
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin-slow"></div>
              <div className="text-center">
                <span className="font-mono text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                  25:00
                </span>
                <span className="block text-xs font-medium text-slate-400 mt-1">Pronto para iniciar</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('pomodoro')}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Abrir Pomodoro Completo</span>
            </button>
            <p className="text-[11px] text-slate-400 mt-3">25 min de foco · 5 min de pausa curta</p>
          </div>
        </div>
      </div>
    </div>
  );
};

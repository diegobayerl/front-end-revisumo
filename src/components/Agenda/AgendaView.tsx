import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Kanban, Columns, CalendarDays } from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import {
  dayKey,
  monthDays,
  weekDays,
  shiftDay,
  daySegments,
  formatTimeHM,
  formatSeconds,
} from '../../utils/domain';
import { Atividade } from '../../types';

interface AgendaViewProps {
  onOpenActivity: (atividade: Atividade) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({ onOpenActivity }) => {
  const { atividades, disciplinas } = useStudy();
  const [currentDay, setCurrentDay] = useState(() => dayKey());
  const [mode, setMode] = useState<'mes' | 'semana' | 'pipeline'>('mes');

  const getDisciplineName = (id: string) =>
    disciplinas.find((d) => d.id === id)?.nome || 'Disciplina';

  const monthGridDays = monthDays(currentDay);
  const weekGridDays = weekDays(currentDay);

  const pendingActivities = atividades.filter((a) => a.status === 'pendente');
  const completedActivities = atividades.filter((a) => a.status === 'concluido');
  const todayActivities = atividades.filter((a) => dayKey(a.inicio_previsto) === dayKey());

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Visão Temporal
          </span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Agenda de Estudos
          </h2>
        </div>

        {/* Mode Selector & Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setMode('mes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'mes'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setMode('semana')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'semana'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setMode('pipeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'pipeline'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Pipeline
            </button>
          </div>

          {mode !== 'pipeline' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentDay(shiftDay(currentDay, mode === 'mes' ? -30 : -7))}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDay(dayKey())}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Hoje
              </button>
              <button
                onClick={() => setCurrentDay(shiftDay(currentDay, mode === 'mes' ? 30 : 7))}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Próximo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mode 1: MÊS */}
      {mode === 'mes' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthGridDays.map((day) => {
              const dayItems = atividades.filter((a) => dayKey(a.inicio_previsto) === day);
              const isToday = day === dayKey();
              const [, month, dateNum] = day.split('-');
              return (
                <div
                  key={day}
                  className={`min-h-[90px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? 'bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-700'
                      : 'bg-slate-50/40 border-slate-100 hover:border-slate-200 dark:bg-slate-850/40 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isToday ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {dateNum}/{month}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onOpenActivity(item)}
                        className="truncate text-[10px] font-medium p-1 rounded bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer hover:border-emerald-400"
                        title={`${getDisciplineName(item.disciplina_id)} - ${formatSeconds(item.duracao_segundos)}`}
                      >
                        {getDisciplineName(item.disciplina_id)}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <span className="text-[9px] text-slate-400 block text-center">
                        +{dayItems.length - 2} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 2: SEMANA (com daySegments e divisão na meia-noite) */}
      {mode === 'semana' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
          <div className="grid grid-cols-7 gap-3">
            {weekGridDays.map((day) => {
              const segments = daySegments(atividades, day);
              const isToday = day === dayKey();
              const [, month, dateNum] = day.split('-');
              return (
                <div key={day} className="space-y-3">
                  <div
                    className={`p-2.5 text-center rounded-xl border ${
                      isToday
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-transparent'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold uppercase">
                      {new Date(day + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </span>
                    <span className="text-base font-bold font-mono">
                      {dateNum}/{month}
                    </span>
                  </div>

                  <div className="min-h-[400px] p-2 rounded-2xl bg-slate-50/50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 space-y-2">
                    {segments.length === 0 ? (
                      <span className="text-[11px] text-slate-400 text-center block pt-8">
                        Livre
                      </span>
                    ) : (
                      segments.map((seg, idx) => (
                        <div
                          key={idx}
                          onClick={() => onOpenActivity(seg.item)}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs cursor-pointer hover:border-emerald-400 transition-all text-xs space-y-1"
                        >
                          <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">
                            {formatTimeHM(seg.item.inicio_previsto)}
                          </span>
                          <h6 className="font-semibold text-slate-850 dark:text-slate-100 truncate">
                            {getDisciplineName(seg.item.disciplina_id)}
                          </h6>
                          <span className="text-[10px] text-slate-400 block">
                            {formatSeconds(seg.item.duracao_segundos)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 3: PIPELINE (Kanban) */}
      {mode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pendentes */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Pendentes
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                {pendingActivities.length}
              </span>
            </div>
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {pendingActivities.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenActivity(item)}
                  className="p-3 rounded-2xl border border-slate-200/70 bg-slate-50/50 hover:bg-white dark:bg-slate-850 dark:border-slate-700 cursor-pointer transition-all space-y-1"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {getDisciplineName(item.disciplina_id)}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{new Date(item.inicio_previsto).toLocaleDateString('pt-BR')}</span>
                    <span>{formatSeconds(item.duracao_segundos)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hoje */}
          <div className="p-5 rounded-3xl bg-white border border-emerald-200/60 dark:bg-slate-900 dark:border-emerald-800/40 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-emerald-950">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Hoje
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {todayActivities.length}
              </span>
            </div>
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {todayActivities.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenActivity(item)}
                  className="p-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/30 hover:bg-emerald-50/60 dark:bg-slate-850 dark:border-emerald-800/60 cursor-pointer transition-all space-y-1"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {getDisciplineName(item.disciplina_id)}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{formatTimeHM(item.inicio_previsto)}</span>
                    <span>{formatSeconds(item.duracao_segundos)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Concluídos */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Concluídos
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {completedActivities.length}
              </span>
            </div>
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {completedActivities.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenActivity(item)}
                  className="p-3 rounded-2xl border border-slate-200/40 bg-slate-50/30 dark:bg-slate-850/40 dark:border-slate-800 cursor-pointer transition-all space-y-1 opacity-70"
                >
                  <span className="text-xs font-bold line-through text-slate-500">
                    {getDisciplineName(item.disciplina_id)}
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{new Date(item.inicio_previsto).toLocaleDateString('pt-BR')}</span>
                    <span>Concluído</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

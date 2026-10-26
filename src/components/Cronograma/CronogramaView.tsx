import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Sparkles,
  Plus,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { Disponibilidade, Atividade } from '../../types';
import { api } from '../../services/api';
import { formatSeconds, formatTimeHM } from '../../utils/domain';

interface CronogramaViewProps {
  onOpenScheduleAIModal: () => void;
  onOpenQuickSchedule: () => void;
}

const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const CronogramaView: React.FC<CronogramaViewProps> = ({
  onOpenScheduleAIModal,
  onOpenQuickSchedule,
}) => {
  const { selectedEstudo, atividades, disciplinas, refreshData } = useStudy();
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [isAddingWindow, setIsAddingWindow] = useState(false);
  const [diaSemana, setDiaSemana] = useState(1);
  const [horarioInicio, setHorarioInicio] = useState('19:00');
  const [horarioFim, setHorarioFim] = useState('22:00');
  const [errorMsg, setErrorMsg] = useState('');

  const loadDisponibilidades = async () => {
    if (!selectedEstudo) return;
    try {
      const data = await api.disponibilidades.list(selectedEstudo.id);
      setDisponibilidades(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDisponibilidades();
  }, [selectedEstudo]);

  const handleAddWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstudo) return;
    setErrorMsg('');
    try {
      await api.disponibilidades.create({
        concurso_id: selectedEstudo.id,
        dia_semana: diaSemana,
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
      });
      setIsAddingWindow(false);
      await loadDisponibilidades();
    } catch (err: any) {
      setErrorMsg(err.message || 'Horário sobreposto ou inválido.');
    }
  };

  const handleDeleteWindow = async (id: string) => {
    await api.disponibilidades.delete(id);
    await loadDisponibilidades();
  };

  const handleDeleteAtividade = async (id: string) => {
    if (confirm('Deseja excluir esta atividade agendada?')) {
      await api.atividades.delete(id);
      await refreshData();
    }
  };

  const getDisciplineName = (id: string) =>
    disciplinas.find((d) => d.id === id)?.nome || 'Disciplina';

  const sortedAtividades = [...atividades].sort((a, b) =>
    a.inicio_previsto.localeCompare(b.inicio_previsto)
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Planejamento e Rotina
          </span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Cronograma de Estudos
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenQuickSchedule}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs transition-colors"
          >
            + Agendar Manual
          </button>
          <button
            onClick={onOpenScheduleAIModal}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm transition-all flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-white" />
            <span>Gerar Cronograma com IA</span>
          </button>
        </div>
      </div>

      {/* Grid: Disponibilidade Semanal (Left) + Próximas Atividades (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Disponibilidade (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Horários Disponíveis
                </h3>
                <p className="text-xs text-slate-500">
                  Janelas semanais em que você consegue estudar
                </p>
              </div>

              <button
                onClick={() => setIsAddingWindow(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            {isAddingWindow && (
              <form
                onSubmit={handleAddWindow}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700 space-y-3"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Nova Janela Semanal
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Dia da Semana
                  </label>
                  <select
                    value={diaSemana}
                    onChange={(e) => setDiaSemana(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  >
                    {DIAS_SEMANA.map((dia, idx) => (
                      <option key={idx} value={idx}>
                        {dia}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Início
                    </label>
                    <input
                      type="time"
                      required
                      value={horarioInicio}
                      onChange={(e) => setHorarioInicio(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Fim
                    </label>
                    <input
                      type="time"
                      required
                      value={horarioFim}
                      onChange={(e) => setHorarioFim(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingWindow(false)}
                    className="px-3 py-1.5 text-xs text-slate-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                  >
                    Salvar Horário
                  </button>
                </div>
              </form>
            )}

            {/* List of windows grouped by day */}
            <div className="space-y-2 mt-2">
              {disponibilidades.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  Nenhuma janela de disponibilidade cadastrada.
                  <br />
                  Cadastre seus horários para permitir que a IA organize o cronograma.
                </div>
              ) : (
                disponibilidades
                  .sort((a, b) => a.dia_semana - b.dia_semana || a.horario_inicio.localeCompare(b.horario_inicio))
                  .map((disp) => (
                    <div
                      key={disp.id}
                      className="p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {DIAS_SEMANA[disp.dia_semana]}
                        </span>
                        <span className="block font-mono text-xs text-emerald-800 dark:text-emerald-400 mt-0.5">
                          {disp.horario_inicio} até {disp.horario_fim}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteWindow(disp.id)}
                        className="p-1 rounded text-slate-300 hover:text-rose-500 transition-colors"
                        title="Remover janela"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Atividades do Cronograma (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Atividades Programadas
                </h3>
                <p className="text-xs text-slate-500">
                  {sortedAtividades.length} blocos de foco no cronograma
                </p>
              </div>

              <span className="text-xs font-medium text-slate-400">
                Ordenado cronologicamente
              </span>
            </div>

            {sortedAtividades.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <CalendarDays className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma atividade agendada
                </p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Gere o cronograma com IA ou adicione atividades manuais.
                </p>
                <button
                  onClick={onOpenScheduleAIModal}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors"
                >
                  Gerar com IA
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {sortedAtividades.map((item) => {
                  const date = new Date(item.inicio_previsto);
                  const isDone = item.status === 'concluido';
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        isDone
                          ? 'bg-slate-50/50 border-slate-200/50 opacity-60 dark:bg-slate-850/40 dark:border-slate-800'
                          : 'bg-white border-slate-200/80 dark:bg-slate-850 dark:border-slate-750 shadow-2xs'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}
                            {formatTimeHM(item.inicio_previsto)}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                            {getDisciplineName(item.disciplina_id)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Duração: {formatSeconds(item.duracao_segundos)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isDone
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {item.status}
                        </span>
                        <button
                          onClick={() => handleDeleteAtividade(item.id)}
                          className="p-1 rounded text-slate-300 hover:text-rose-500 transition-colors"
                          title="Excluir atividade"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

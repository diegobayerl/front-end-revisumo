import React, { useState } from 'react';
import { X, Calendar, Plus, Clock } from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { api } from '../../services/api';
import { dayKey } from '../../utils/domain';

interface QuickScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickScheduleModal: React.FC<QuickScheduleModalProps> = ({ isOpen, onClose }) => {
  const { selectedEstudo, disciplinas, conteudos, refreshData } = useStudy();

  const [disciplinaId, setDisciplinaId] = useState('');
  const [conteudoId, setConteudoId] = useState('');
  const [dataEstudo, setDataEstudo] = useState(() => dayKey());
  const [horarioInicio, setHorarioInicio] = useState('09:00');
  const [duracaoMinutos, setDuracaoMinutos] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !selectedEstudo) return null;

  const currentDisciplines = disciplinas.filter((d) => d.concurso_id === selectedEstudo.id);
  const availableContents = conteudos.filter((c) => c.disciplina_id === disciplinaId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disciplinaId) {
      setErrorMsg('Escolha uma disciplina.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      const inicioIso = new Date(`${dataEstudo}T${horarioInicio}:00`).toISOString();
      await api.planejamento.quickSchedule({
        concurso_id: selectedEstudo.id,
        disciplina_id: disciplinaId,
        conteudo_id: conteudoId || null,
        inicio_previsto: inicioIso,
        duracao_segundos: duracaoMinutos * 60,
      });
      await refreshData();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao agendar atividade.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Agendar Atividade Manual
            </h3>
            <p className="text-xs text-slate-500">
              Cadastre um bloco direto no seu cronograma
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Disciplina
            </label>
            <select
              required
              value={disciplinaId}
              onChange={(e) => {
                setDisciplinaId(e.target.value);
                setConteudoId('');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Selecione uma disciplina...</option>
              {currentDisciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome} (Peso {d.peso})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assunto / Conteúdo (Opcional)
            </label>
            <select
              disabled={!disciplinaId}
              value={conteudoId}
              onChange={(e) => setConteudoId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white disabled:opacity-50"
            >
              <option value="">Geral da disciplina</option>
              {availableContents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data
              </label>
              <input
                type="date"
                required
                value={dataEstudo}
                onChange={(e) => setDataEstudo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Horário de Início
              </label>
              <input
                type="time"
                required
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Duração (minutos)
            </label>
            <input
              type="number"
              min={15}
              max={240}
              required
              value={duracaoMinutos}
              onChange={(e) => setDuracaoMinutos(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm transition-all"
            >
              {isLoading ? 'Agendando...' : 'Salvar no Cronograma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import { api } from '../../services/api';
import { useStudy } from '../../context/StudyContext';

interface NewStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewStudyModal: React.FC<NewStudyModalProps> = ({ isOpen, onClose }) => {
  const { refreshData } = useStudy();
  const [nome, setNome] = useState('');
  const [banca, setBanca] = useState('');
  const [dataProva, setDataProva] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setErrorMsg('');
    setIsLoading(true);
    try {
      await api.estudos.create({
        nome: nome.trim(),
        banca: banca.trim() || undefined,
        data_prova: dataProva || null,
      });
      await refreshData();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao cadastrar estudo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Cadastrar Novo Estudo
            </h3>
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
              Nome do Concurso ou Objetivo
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Polícia Federal - Agente"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Banca Examinadora (Opcional)
            </label>
            <input
              type="text"
              value={banca}
              onChange={(e) => setBanca(e.target.value)}
              placeholder="Ex: Cebraspe, FGV, Vunesp, FCC..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Data da Prova (Opcional)
            </label>
            <input
              type="date"
              value={dataProva}
              onChange={(e) => setDataProva(e.target.value)}
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
              {isLoading ? 'Salvando...' : 'Cadastrar Estudo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

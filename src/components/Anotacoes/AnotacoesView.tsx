import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Edit3, FileText, BookOpen } from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { api } from '../../services/api';
import { Anotacao } from '../../types';

export const AnotacoesView: React.FC = () => {
  const { selectedEstudo, disciplinas, conteudos } = useStudy();
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<Anotacao> | null>(null);

  const loadNotes = async () => {
    try {
      const data = await api.anotacoes.list(selectedEstudo?.id);
      setAnotacoes(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [selectedEstudo]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editingNote.titulo?.trim()) return;

    if (editingNote.id) {
      await api.anotacoes.update(editingNote.id, {
        titulo: editingNote.titulo.trim(),
        texto: editingNote.texto || '',
        disciplina_id: editingNote.disciplina_id || null,
        conteudo_id: editingNote.conteudo_id || null,
      });
    } else {
      await api.anotacoes.create({
        concurso_id: selectedEstudo?.id,
        titulo: editingNote.titulo.trim(),
        texto: editingNote.texto || '',
        disciplina_id: editingNote.disciplina_id || null,
        conteudo_id: editingNote.conteudo_id || null,
      });
    }

    setIsEditing(false);
    setEditingNote(null);
    await loadNotes();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir esta anotação?')) {
      await api.anotacoes.delete(id);
      await loadNotes();
    }
  };

  const filteredNotes = anotacoes.filter((note) => {
    const matchesSearch =
      note.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.texto?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDisc = !selectedDisciplineId || note.disciplina_id === selectedDisciplineId;
    return matchesSearch && matchesDisc;
  });

  const getDisciplineName = (id?: string | null) =>
    disciplinas.find((d) => d.id === id)?.nome || 'Anotação Livre';

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Caderno de Estudos
          </span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Minhas Anotações
          </h2>
        </div>

        <button
          onClick={() => {
            setEditingNote({ titulo: '', texto: '', disciplina_id: '' });
            setIsEditing(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Anotação</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por palavras-chave em títulos ou notas..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <select
          value={selectedDisciplineId}
          onChange={(e) => setSelectedDisciplineId(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">Todas as matérias</option>
          {disciplinas
            .filter((d) => !selectedEstudo || d.concurso_id === selectedEstudo.id)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
        </select>
      </div>

      {/* Form Editor Modal / Inline Card */}
      {isEditing && (
        <form
          onSubmit={handleSave}
          className="p-6 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-md space-y-4 animate-in fade-in"
        >
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {editingNote?.id ? 'Editar Anotação' : 'Criar Nova Anotação'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Título da anotação..."
              value={editingNote?.titulo || ''}
              onChange={(e) => setEditingNote({ ...editingNote, titulo: e.target.value })}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold"
            />

            <select
              value={editingNote?.disciplina_id || ''}
              onChange={(e) => setEditingNote({ ...editingNote, disciplina_id: e.target.value })}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Anotação Livre (Sem matéria)</option>
              {disciplinas
                .filter((d) => !selectedEstudo || d.concurso_id === selectedEstudo.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
            </select>
          </div>

          <textarea
            required
            rows={5}
            placeholder="Escreva suas anotações, sínteses, resumos e dispositivos importantes..."
            value={editingNote?.texto || ''}
            onChange={(e) => setEditingNote({ ...editingNote, texto: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          ></textarea>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditingNote(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
            >
              Salvar Anotação
            </button>
          </div>
        </form>
      )}

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma anotação encontrada
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Crie anotações avulsas ou durante os ciclos de foco do Pomodoro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700 shadow-2xs transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 inline-block">
                  {getDisciplineName(note.disciplina_id)}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                  {note.titulo}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-5 leading-relaxed font-sans">
                  {note.texto}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                <span>{new Date(note.atualizado_em || note.criado_em || Date.now()).toLocaleDateString('pt-BR')}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingNote(note);
                      setIsEditing(true);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-500"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

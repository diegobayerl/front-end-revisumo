import React, { useState } from 'react';
import {
  Plus,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Trash2,
  Edit2,
  ChevronRight,
  FileCheck2,
  Scale,
} from 'lucide-react';
import { useStudy } from '../../context/StudyContext';
import { Estudo, Disciplina, Conteudo } from '../../types';
import { api } from '../../services/api';

interface EstudosViewProps {
  onOpenEditalModal: () => void;
  onOpenNewStudyModal: () => void;
}

export const EstudosView: React.FC<EstudosViewProps> = ({
  onOpenEditalModal,
  onOpenNewStudyModal,
}) => {
  const {
    estudos,
    selectedEstudo,
    setSelectedEstudo,
    disciplinas,
    conteudos,
    refreshData,
  } = useStudy();

  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(null);
  const [isAddingDiscipline, setIsAddingDiscipline] = useState(false);
  const [newDisciplineName, setNewDisciplineName] = useState('');
  const [newDisciplineWeight, setNewDisciplineWeight] = useState(1);

  const [isAddingContent, setIsAddingContent] = useState(false);
  const [newContentTitle, setNewContentTitle] = useState('');
  const [newContentDesc, setNewContentDesc] = useState('');

  const currentDisciplines = disciplinas.filter(
    (d) => d.concurso_id === selectedEstudo?.id
  );

  const activeDiscipline =
    currentDisciplines.find((d) => d.id === selectedDisciplineId) || currentDisciplines[0];

  const currentContents = conteudos.filter(
    (c) => c.disciplina_id === activeDiscipline?.id
  );

  const handleCreateDiscipline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEstudo || !newDisciplineName.trim()) return;
    await api.disciplinas.create({
      concurso_id: selectedEstudo.id,
      nome: newDisciplineName.trim(),
      peso: Number(newDisciplineWeight),
      descricao: '',
    });
    setNewDisciplineName('');
    setNewDisciplineWeight(1);
    setIsAddingDiscipline(false);
    await refreshData();
  };

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDiscipline || !newContentTitle.trim()) return;
    await api.conteudos.create({
      disciplina_id: activeDiscipline.id,
      titulo: newContentTitle.trim(),
      descricao: newContentDesc.trim(),
    });
    setNewContentTitle('');
    setNewContentDesc('');
    setIsAddingContent(false);
    await refreshData();
  };

  const handleDeleteDiscipline = async (id: string, name: string) => {
    if (confirm(`Deseja excluir a matéria "${name}" e todos os seus tópicos?`)) {
      await api.disciplinas.delete(id);
      await refreshData();
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (confirm('Deseja excluir este assunto?')) {
      await api.conteudos.delete(id);
      await refreshData();
    }
  };

  const handleDeleteEstudo = async (id: string, name: string) => {
    if (confirm(`Excluir o estudo "${name}"? Todas as matérias e cronogramas vinculados serão removidos.`)) {
      await api.estudos.delete(id);
      await refreshData();
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Organização Acadêmica
          </span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Meus Estudos & Conteúdos
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenNewStudyModal}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors shadow-xs"
          >
            + Novo Estudo Manual
          </button>
          <button
            onClick={onOpenEditalModal}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm transition-all flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-white" />
            <span>Importar Edital (PDF com IA)</span>
          </button>
        </div>
      </div>

      {/* Main Split Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Estudos Tabs (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
              Seus Objetivos Ativos
            </h3>

            <div className="space-y-1.5 mt-1">
              {estudos.map((estudo) => {
                const isSelected = selectedEstudo?.id === estudo.id;
                return (
                  <div
                    key={estudo.id}
                    onClick={() => setSelectedEstudo(estudo)}
                    className={`group p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-300/80 dark:bg-emerald-950/40 dark:border-emerald-700/60 shadow-xs'
                        : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {estudo.nome}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {estudo.banca && <span>{estudo.banca}</span>}
                        {estudo.data_prova && (
                          <>
                            <span>·</span>
                            <span>Prova: {new Date(estudo.data_prova).toLocaleDateString('pt-BR')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEstudo(estudo.id, estudo.nome);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        title="Excluir estudo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Disciplinas e Conteúdos (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedEstudo ? (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 shadow-xs space-y-6">
              {/* Study Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedEstudo.nome}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentDisciplines.length} matérias cadastradas
                  </p>
                </div>

                <button
                  onClick={() => setIsAddingDiscipline(true)}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Disciplina</span>
                </button>
              </div>

              {/* Form Nova Disciplina */}
              {isAddingDiscipline && (
                <form
                  onSubmit={handleCreateDiscipline}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700 space-y-3"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Cadastrar Matéria
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Nome da disciplina (ex: Direito Constitucional)"
                      value={newDisciplineName}
                      onChange={(e) => setNewDisciplineName(e.target.value)}
                      className="sm:col-span-3 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={newDisciplineWeight}
                      onChange={(e) => setNewDisciplineWeight(Number(e.target.value))}
                      placeholder="Peso (1 a 100)"
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      title="Peso de prioridade de 1 a 100"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingDiscipline(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-200/60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                    >
                      Salvar Matéria
                    </button>
                  </div>
                </form>
              )}

              {/* Disciplinas Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {currentDisciplines.map((d) => {
                  const isActive = activeDiscipline?.id === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDisciplineId(d.id)}
                      className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                        isActive
                          ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <span>{d.nome}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">
                        P{d.peso}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Conteúdos Section */}
              {activeDiscipline ? (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Tópicos de {activeDiscipline.nome}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {currentContents.length} assuntos cadastrados para estudo
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteDiscipline(activeDiscipline.id, activeDiscipline.nome)}
                        className="text-xs text-rose-500 hover:text-rose-600 font-medium px-2 py-1"
                      >
                        Excluir Matéria
                      </button>
                      <button
                        onClick={() => setIsAddingContent(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Novo Assunto</span>
                      </button>
                    </div>
                  </div>

                  {/* Form Novo Conteúdo */}
                  {isAddingContent && (
                    <form
                      onSubmit={handleCreateContent}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700 space-y-3"
                    >
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Adicionar Assunto
                      </h5>
                      <input
                        type="text"
                        required
                        placeholder="Título do assunto (ex: Controle de Constitucionalidade Concentrado)"
                        value={newContentTitle}
                        onChange={(e) => setNewContentTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      />
                      <textarea
                        placeholder="Orientações e escopo de estudo (opcional)"
                        value={newContentDesc}
                        onChange={(e) => setNewContentDesc(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      ></textarea>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingContent(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                        >
                          Salvar Assunto
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Contents List */}
                  {currentContents.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                      <p className="text-xs text-slate-500">Nenhum tópico cadastrado nesta matéria.</p>
                      <button
                        onClick={() => setIsAddingContent(true)}
                        className="mt-2 text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
                      >
                        + Cadastrar o primeiro assunto
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentContents.map((content) => (
                        <div
                          key={content.id}
                          className="p-3.5 rounded-xl border border-slate-200/70 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850 flex items-start justify-between gap-3 group transition-all"
                        >
                          <div className="space-y-1">
                            <h5 className="text-sm font-semibold text-slate-850 dark:text-slate-100">
                              {content.titulo}
                            </h5>
                            {content.descricao && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                {content.descricao}
                              </p>
                            )}

                            {/* Legal References Badges */}
                            {content.referencias_legais && content.referencias_legais.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {content.referencias_legais.map((ref, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50"
                                  >
                                    <Scale className="w-2.5 h-2.5" />
                                    <span>
                                      {ref.lei.toUpperCase()} arts. {ref.artigos.join(', ')}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteContent(content.id)}
                            className="p-1 rounded text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir assunto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Cadastre sua primeira matéria acima para adicionar os conteúdos.
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              Selecione ou crie um estudo à esquerda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

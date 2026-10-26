import React, { useState } from 'react';
import { X, Sparkles, UploadCloud, FileText, CheckCircle2, AlertCircle, Scale } from 'lucide-react';
import { api } from '../../services/api';
import { EditalPreview } from '../../types';
import { useStudy } from '../../context/StudyContext';

interface EditalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditalModal: React.FC<EditalModalProps> = ({ isOpen, onClose }) => {
  const { refreshData } = useStudy();
  const [file, setFile] = useState<File | null>(null);
  const [cargo, setCargo] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [preview, setPreview] = useState<EditalPreview | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Selecione um arquivo PDF.');
      return;
    }
    setErrorMsg('');
    setIsAnalyzing(true);
    try {
      const data = await api.ia.uploadEdital(file, cargo);
      setPreview(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao analisar o edital.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setIsConfirming(true);
    try {
      await api.ia.confirmarEdital(preview);
      await refreshData();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar edital.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Importar Edital com IA
              </h3>
              <p className="text-xs text-slate-500">
                Extraia disciplinas e tópicos de PDFs de até 30 MB
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!preview ? (
            <form onSubmit={handleUpload} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Cargo ou Especialidade
                </label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ex: Escrivão de Polícia, Auditor Fiscal, Vestibular Medicina..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Ajuda a IA a selecionar apenas os conteúdos específicos da sua vaga.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Arquivo do Edital (PDF)
                </label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-50 transition-colors">
                  <UploadCloud className="w-10 h-10 mx-auto text-emerald-600 dark:text-emerald-400 mb-3" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    {file ? file.name : 'Clique para selecionar o PDF do edital'}
                  </p>
                  <p className="text-[11px] text-slate-400">PDF até 30 MB</p>
                  <input
                    type="file"
                    accept="application/pdf"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="mt-3 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAnalyzing}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Analisando edital com IA (pode levar 1 a 2 min)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Processar Edital</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Preview Overview */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {preview.nome}
                  </h4>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {preview.disciplinas.length} matérias identificadas
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
                  {preview.banca && <span>Banca: <b>{preview.banca}</b></span>}
                  {preview.data_prova && <span>Prova: <b>{preview.data_prova}</b></span>}
                </div>
                {preview.observacoes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                    {preview.observacoes}
                  </p>
                )}
              </div>

              {/* Disciplines Tree */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Disciplinas e Tópicos Encontrados:
                </h5>

                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {preview.disciplinas.map((disc, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-850 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {disc.nome}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Peso {disc.peso}
                        </span>
                      </div>

                      <div className="pl-3 border-l-2 border-emerald-500/40 space-y-1.5 mt-2">
                        {disc.conteudos.map((cont, cIdx) => (
                          <div key={cIdx} className="text-xs space-y-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-200 block">
                              • {cont.titulo}
                            </span>
                            {cont.descricao && (
                              <p className="text-[11px] text-slate-400 pl-2">{cont.descricao}</p>
                            )}
                            {cont.referencias && cont.referencias.length > 0 && (
                              <div className="flex flex-wrap gap-1 pl-2 pt-0.5">
                                {cont.referencias.map((ref, rIdx) => (
                                  <span
                                    key={rIdx}
                                    className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  >
                                    <Scale className="w-2.5 h-2.5" />
                                    <span>{ref.lei.toUpperCase()} {ref.artigos.join(', ')}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {preview && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
            <button
              onClick={() => setPreview(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              ← Enviar outro arquivo
            </button>

            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isConfirming ? 'Cadastrando no banco...' : 'Confirmar e Criar Estudo'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState, useRef } from 'react';
import {
  dayKey,
  parseDay,
  shiftDay,
  weekDays,
  monthDays,
  endOf,
  dailySummary,
  sessionElapsed,
  daySegments,
  dateLabel,
  timeLabel,
  stamp,
  dateOnly,
  duration,
  stopwatch,
  statusLabel,
  phaseLabel,
  localInput,
} from './utils/domain';

type PageName =
  | 'dashboard'
  | 'cadastro'
  | 'cronograma'
  | 'anotacoes'
  | 'agenda'
  | 'configuracoes'
  | 'estudo';

interface LegalRef {
  lei: string;
  artigos?: string[];
  origem?: string;
  verificado?: boolean;
  url?: string;
}

interface Concurso {
  id: string;
  nome: string;
  banca?: string | null;
  data_prova?: string | null;
  fuso_horario?: string;
}

interface Disciplina {
  id: string;
  concurso_id: string;
  nome: string;
  peso: number;
  descricao?: string | null;
}

interface Conteudo {
  id: string;
  disciplina_id: string;
  titulo: string;
  descricao?: string | null;
  status: string;
  referencias_legais?: LegalRef[];
}

interface ItemCronograma {
  id: string;
  concurso_id: string;
  disciplina_id: string;
  conteudo_id?: string | null;
  inicio_previsto: string;
  duracao_segundos: number;
  status: string;
  tipo?: string;
  revisao_numero?: number;
}

interface Anotacao {
  id: string;
  disciplina_id?: string | null;
  conteudo_id?: string | null;
  titulo: string;
  corpo: string;
  criado_em: string;
}

interface Disponibilidade {
  id: string;
  concurso_id: string;
  dia_semana: number;
  horario_inicio: string;
  horario_fim: string;
}

interface PomodoroSettings {
  foco_segundos: number;
  pausa_curta_segundos: number;
  pausa_longa_segundos: number;
  ciclos_ate_pausa_longa: number;
}

interface PomodoroSession {
  id: string;
  disciplina_id?: string | null;
  conteudo_id?: string | null;
  item_cronograma_id?: string | null;
  titulo: string;
  fase: 'foco' | 'pausa_curta' | 'pausa_longa';
  status: string;
  duracao_planejada_segundos: number;
  tempo_acumulado_segundos: number;
  iniciada_em: string;
  retomada_em?: string | null;
}

interface ScheduleFlowState {
  step: number;
  reorganizar?: boolean;
  busy?: boolean;
  draft: {
    inicio: string;
    fim: string;
    minutos: number;
  };
}

async function apiCall(path: string, method = 'GET', body?: any): Promise<any> {
  const response = await fetch('/api/' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : {};
  if (!response.ok) {
    let msg = data?.error;
    if (!msg) {
      msg = [500, 502, 503, 504].includes(response.status)
        ? 'Não foi possível conectar ao servidor. Tente novamente em instantes.'
        : 'Não foi possível concluir a operação.';
    }
    const err: any = new Error(msg);
    err.status = response.status;
    throw err;
  }
  return data;
}

async function fetchAllRows(path: string): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 200) {
    const batch = await apiCall(`${path}?offset=${offset}`);
    rows.push(...batch);
    if (batch.length < 200) break;
  }
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

const pageTitles: Record<PageName, string> = {
  dashboard: 'Hoje',
  cadastro: 'Meus estudos',
  cronograma: 'Cronograma',
  anotacoes: 'Anotações',
  agenda: 'Agenda',
  configuracoes: 'Configurações',
  estudo: 'Sessão de estudo',
};

export const App: React.FC = () => {
  const [user, setUser] = useState<{ id: string; nome: string; email: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [registering, setRegistering] = useState(
    () => new URLSearchParams(window.location.search).get('cadastro') === '1'
  );
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const [theme, setThemeState] = useState<'light' | 'dark'>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  );

  const [toastMsg, setToastMsg] = useState('');
  const toastTimeout = useRef<any>(null);

  // Navigation & Workspace State
  const [page, setPage] = useState<PageName>('dashboard');
  const [contestId, setContestIdState] = useState<string>('');
  const [cadSubjectId, setCadSubjectId] = useState<string>('');
  const [studyId, setStudyId] = useState<string>('');
  const [studySubjectId, setStudySubjectId] = useState<string>('');
  const [studyTopicId, setStudyTopicId] = useState<string>('');
  const [day, setDay] = useState<string>(() => dayKey());
  const [previewDay, setPreviewDay] = useState<string>(() => shiftDay(dayKey(), 1));
  const [agendaAnchor, setAgendaAnchor] = useState<string>(() => dayKey());
  const [agendaMode, setAgendaMode] = useState<'mes' | 'semana' | 'pipeline'>('mes');
  const [filters, setFilters] = useState<{
    agenda: string;
    notes: string;
    history: string;
    scheduleSubject: string;
    scheduleStatus: string;
  }>({
    agenda: '',
    notes: '',
    history: '',
    scheduleSubject: '',
    scheduleStatus: '',
  });
  const [historyPage, setHistoryPage] = useState(0);
  const [phase, setPhase] = useState<'foco' | 'pausa_curta' | 'pausa_longa'>('foco');
  const [timerContext, setTimerContext] = useState<{
    disciplina_id?: string | null;
    conteudo_id?: string | null;
    item_cronograma_id?: string | null;
  }>({});
  const [clockNotice, setClockNotice] = useState('');
  const [clockOffset, setClockOffset] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Data Collections
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [itensCronograma, setItensCronograma] = useState<ItemCronograma[]>([]);
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>({
    foco_segundos: 1500,
    pausa_curta_segundos: 300,
    pausa_longa_segundos: 900,
    ciclos_ate_pausa_longa: 4,
  });
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);

  // Edital IA & Schedule IA states
  const [importingStudy, setImportingStudy] = useState(false);
  const [editalBusy, setEditalBusy] = useState(false);
  const [editalPreview, setEditalPreview] = useState<any>(null);
  const [editalError, setEditalError] = useState('');
  const [editalConfirmError, setEditalConfirmError] = useState('');
  const [editalNome, setEditalNome] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cargoInput, setCargoInput] = useState('');

  const [scheduleFlows, setScheduleFlows] = useState<Record<string, ScheduleFlowState>>({});
  const [schedulePreview, setSchedulePreview] = useState<any>(null);
  const [aiScheduleError, setAiScheduleError] = useState('');
  const [aiScheduleStatus, setAiScheduleStatus] = useState('');
  const [confirmAiError, setConfirmAiError] = useState('');

  // Study chat compose
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [noteError, setNoteError] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);

  // Settings form error
  const [prefError, setPrefError] = useState('');

  // Modal Editor state
  const [editorState, setEditorState] = useState<{
    resource: string;
    id?: string;
    defaults?: any;
  } | null>(null);
  const [editorError, setEditorError] = useState('');
  const [editorBusy, setEditorBusy] = useState(false);
  const [modalCourseId, setModalCourseId] = useState('');
  const [modalSubjectId, setModalSubjectId] = useState('');

  const showToast = (message: string) => {
    setToastMsg(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToastMsg(''), 5000);
  };

  const applyTheme = (nextTheme: 'light' | 'dark') => {
    document.documentElement.dataset.theme = nextTheme;
    setThemeState(nextTheme);
    try {
      localStorage.setItem('ritmo-theme', nextTheme);
    } catch {}
  };

  const toggleTheme = () => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const refreshData = async (preferredContestId?: string) => {
    const names = [
      'concursos',
      'disciplinas',
      'conteudos',
      'cronogramas',
      'itens_cronograma',
      'anotacoes',
      'disponibilidades',
    ];
    const values = await Promise.all([
      ...names.map((n) => fetchAllRows(n)),
      apiCall('pomodoro'),
      fetchAllRows('pomodoro/historico'),
    ]);
    const [
      concursosRows,
      disciplinasRows,
      conteudosRows,
      _cronogramasRows,
      itensRows,
      anotacoesRows,
      dispRows,
      pomoData,
      pomoHist,
    ] = values;

    setConcursos(concursosRows);
    setDisciplinas(disciplinasRows);
    setConteudos(conteudosRows);
    setItensCronograma(itensRows);
    setAnotacoes(anotacoesRows);
    setDisponibilidades(dispRows);
    if (pomoData?.settings) setPomodoroSettings(pomoData.settings);
    setPomodoroSessions(pomoHist || []);
    if (pomoData?.serverTime) {
      setClockOffset(new Date(pomoData.serverTime).getTime() - Date.now());
    }

    const targetContest = preferredContestId ?? contestId;
    if (
      targetContest !== 'all' &&
      !concursosRows.some((r: Concurso) => r.id === targetContest)
    ) {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem('ritmo-contest');
      } catch {}
      const resolved =
        saved === 'all'
          ? 'all'
          : concursosRows.some((r: Concurso) => r.id === saved)
          ? saved!
          : concursosRows[0]?.id || '';
      setContestIdState(resolved);
    } else if (preferredContestId) {
      setContestIdState(preferredContestId);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const me = await apiCall('me');
        setUser(me);
        await refreshData();
      } catch (err: any) {
        if (err.status !== 401 && err.message !== 'Entre na sua conta.') {
          setAuthError(err.message);
        }
      } finally {
        setAuthChecking(false);
      }
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now() + clockOffset), 1000);
    return () => clearInterval(id);
  }, [clockOffset]);

  useEffect(() => {
    if (!user) {
      document.title = registering ? 'Criar conta' : 'Entrar';
    } else {
      document.title = pageTitles[page];
    }
    const faviconSvg =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%231b4d3e'/%3E%3Cpath d='M21 46V21h7.5v4.6c1.8-3.3 4.9-5.1 9-5.1 1.4 0 2.6.2 3.5.5v7.6c-1.1-.4-2.4-.6-4-.6-4.7 0-8 2.8-8 7.8V46H21z' fill='%23f6f5f0'/%3E%3Ccircle cx='45.5' cy='42' r='4.2' fill='%23d97745'/%3E%3C/svg%3E";
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = faviconSvg;
  }, [user, registering, page]);

  // Helpers
  const competition = (id?: string | null) => concursos.find((r) => r.id === id);
  const subject = (id?: string | null) => disciplinas.find((r) => r.id === id);
  const topic = (id?: string | null) => conteudos.find((r) => r.id === id);
  const itemById = (id?: string | null) => itensCronograma.find((r) => r.id === id);
  const subjectName = (id?: string | null) => subject(id)?.nome || 'Foco livre';
  const topicName = (id?: string | null) => topic(id)?.titulo || '';
  const activeSession = pomodoroSessions.find((r) =>
    ['em_andamento', 'pausada'].includes(r.status)
  );

  const effectiveContestId =
    ['cadastro', 'cronograma'].includes(page) && (!contestId || contestId === 'all')
      ? concursos[0]?.id || ''
      : contestId;

  const selectedCompetition = competition(effectiveContestId);

  const filteredSubjects = disciplinas.filter(
    (r) => effectiveContestId === 'all' || r.concurso_id === effectiveContestId
  );
  const filteredTopics = conteudos.filter((r) =>
    filteredSubjects.some((d) => d.id === r.disciplina_id)
  );
  const filteredItems = itensCronograma.filter(
    (r) => effectiveContestId === 'all' || r.concurso_id === effectiveContestId
  );
  const filteredSessions = pomodoroSessions.filter(
    (s) =>
      !s.disciplina_id ||
      effectiveContestId === 'all' ||
      subject(s.disciplina_id)?.concurso_id === effectiveContestId
  );

  const setContest = (id: string) => {
    setContestIdState(id);
    setCadSubjectId('');
    setFilters({
      agenda: '',
      notes: '',
      history: '',
      scheduleSubject: '',
      scheduleStatus: '',
    });
    setHistoryPage(0);
    setTimerContext({});
    try {
      localStorage.setItem('ritmo-contest', id);
    } catch {}
  };

  const navigate = (nextPage: PageName, id?: string) => {
    if (nextPage === 'estudo' && id) {
      const item = itemById(id);
      setStudyId(id);
      setStudySubjectId(item?.disciplina_id || '');
      setStudyTopicId(item?.conteudo_id || '');
      if (item) setContestIdState(item.concurso_id);
    }
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  // Auth submit
  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      const formData = new FormData(e.currentTarget);
      const payload: any = Object.fromEntries(formData);
      if (!registering) delete payload.nome;
      await apiCall('auth/' + (registering ? 'cadastro' : 'login'), 'POST', payload);
      const me = await apiCall('me');
      setUser(me);
      await refreshData();
      if (registering) setPage('dashboard');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiCall('auth/logout', 'POST', {});
      setUser(null);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Delete resource
  const handleDelete = async (resource: string, id: string) => {
    const messages: Record<string, string> = {
      concursos:
        'Excluir este estudo e todas as disciplinas, conteúdos, atividades, anotações e sessões Pomodoro vinculadas?',
      disciplinas:
        'Excluir esta disciplina e todos os conteúdos, atividades, anotações e sessões Pomodoro vinculadas?',
      conteudos:
        'Excluir este conteúdo e todas as atividades, anotações e sessões Pomodoro vinculadas?',
      itens_cronograma: 'Excluir esta atividade e suas sessões Pomodoro vinculadas?',
      pomodoro: 'Excluir esta sessão do histórico Pomodoro?',
    };
    if (
      !window.confirm(
        (messages[resource] || 'Excluir este registro?') +
          ' Essa ação não pode ser desfeita.'
      )
    )
      return;
    try {
      await apiCall(`${resource}/${id}?cascade=true`, 'DELETE');
      await refreshData();
      showToast('Registro excluído.');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Pomodoro Actions
  const startFocus = async (context: {
    disciplina_id?: string | null;
    conteudo_id?: string | null;
    item_cronograma_id?: string | null;
  }) => {
    if (activeSession) {
      throw new Error(
        'Já existe uma sessão aberta. Pause, conclua ou cancele essa sessão antes de iniciar outra.'
      );
    }
    const result = await apiCall('pomodoro/iniciar', 'POST', {
      fase: phase,
      ...context,
      titulo:
        topicName(context.conteudo_id) ||
        subjectName(context.disciplina_id) ||
        'Foco livre',
    });
    setTimerContext({
      disciplina_id: result.disciplina_id,
      conteudo_id: result.conteudo_id,
      item_cronograma_id: result.item_cronograma_id,
    });
    setClockNotice('');
    await refreshData();
  };

  const handleTimerAction = async (
    action: 'iniciar' | 'pausar' | 'retomar' | 'concluir' | 'cancelar' | 'finalizar'
  ) => {
    try {
      if (action === 'iniciar') {
        const ctx = { ...timerContext };
        if (page === 'estudo') {
          const item = itemById(studyId);
          ctx.disciplina_id = item?.disciplina_id || studySubjectId;
          ctx.conteudo_id = item?.conteudo_id || studyTopicId || null;
          ctx.item_cronograma_id = item?.id || null;
        }
        await startFocus(ctx);
        return;
      }
      if (!activeSession) return;
      await apiCall(`pomodoro/${activeSession.id}/${action}`, 'POST', {});
      await refreshData();
      if (action === 'concluir') {
        let nextPhase: 'foco' | 'pausa_curta' | 'pausa_longa' = 'foco';
        if (activeSession.fase === 'foco') {
          const history = [...pomodoroSessions].sort((a, b) =>
            b.iniciada_em.localeCompare(a.iniciada_em)
          );
          let count = 1;
          for (const row of history) {
            if (row.fase === 'pausa_longa' && row.status === 'concluida') break;
            if (row.fase === 'foco' && row.status === 'concluida') count++;
          }
          nextPhase =
            count >= pomodoroSettings.ciclos_ate_pausa_longa
              ? 'pausa_longa'
              : 'pausa_curta';
        }
        setPhase(nextPhase);
        setClockNotice(
          'Ciclo registrado. Próximo: ' + phaseLabel[nextPhase].toLowerCase() + '.'
        );
      }
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Open Editor Modal
  const openEditor = (resource: string, id?: string, defaults: any = {}) => {
    if (
      ['disciplinas', 'disponibilidades'].includes(resource) &&
      !selectedCompetition
    ) {
      showToast('Selecione ou cadastre um estudo primeiro.');
      return;
    }
    const initialCourseId =
      defaults.concurso_id ||
      (effectiveContestId !== 'all' ? effectiveContestId : concursos[0]?.id || '');
    let initialSubId = defaults.disciplina_id || cadSubjectId || '';

    if (id) {
      const collection =
        resource === 'schedule'
          ? itensCronograma
          : resource === 'concursos'
          ? concursos
          : resource === 'disciplinas'
          ? disciplinas
          : resource === 'conteudos'
          ? conteudos
          : resource === 'anotacoes'
          ? anotacoes
          : disponibilidades;
      const existing: any = collection.find((r: any) => r.id === id);
      if (existing) {
        if (resource === 'schedule') {
          setModalCourseId(existing.concurso_id);
          setModalSubjectId(existing.disciplina_id || '');
        } else if (resource === 'anotacoes') {
          const sub = subject(existing.disciplina_id);
          setModalCourseId(sub?.concurso_id || initialCourseId);
          setModalSubjectId(existing.disciplina_id || '');
        }
      }
    } else {
      setModalCourseId(initialCourseId);
      setModalSubjectId(initialSubId);
    }

    setEditorError('');
    setEditorState({ resource, id, defaults });
  };

  const openScheduleModal = (targetDay = dayKey(), id?: string) => {
    if (
      !id &&
      !disponibilidades.some((r) => r.concurso_id === effectiveContestId)
    ) {
      showToast('Cadastre primeiro seus dias e horários disponíveis.');
      setPage('cronograma');
      return;
    }
    if (!concursos.length) {
      showToast('Cadastre um estudo para agendar seus estudos.');
      setPage('cadastro');
      return;
    }
    openEditor('schedule', id, { day: targetDay });
  };

  const handleEditorSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editorState) return;
    setEditorBusy(true);
    setEditorError('');
    try {
      const formData = new FormData(e.currentTarget);
      const data: any = Object.fromEntries(formData);
      const { resource, id, defaults } = editorState;
      let result: any;

      if (resource === 'schedule') {
        const start = new Date(data.inicio_previsto);
        const finish = new Date(data.fim_previsto);
        const seconds = (finish.getTime() - start.getTime()) / 1000;
        if (!Number.isFinite(seconds) || seconds < 60 || seconds > 86400) {
          throw new Error(
            'O fim deve ser posterior ao início. Use uma duração de 1 minuto a 24 horas.'
          );
        }
        const conflict = itensCronograma.find(
          (item) =>
            item.id !== id &&
            item.status !== 'cancelado' &&
            new Date(item.inicio_previsto) < finish &&
            start < endOf(item)
        );
        if (conflict) {
          throw new Error(
            'Já existe uma atividade nesse intervalo. Escolha outro horário.'
          );
        }
        const body = {
          concurso_id:
            data.concurso_id ||
            (id ? itemById(id)?.concurso_id : effectiveContestId),
          disciplina_id: data.disciplina_id || null,
          conteudo_id: data.conteudo_id || null,
          inicio_previsto: start.toISOString(),
          duracao_segundos: seconds,
        };
        if (id) {
          result = await apiCall('itens_cronograma/' + id, 'PATCH', body);
        } else {
          result = await apiCall('planejamento', 'POST', body);
        }
      } else if (resource === 'settings') {
        const body = Object.fromEntries(
          Object.entries(data).map(([k, v]) => [
            k,
            Number(v) * (k === 'ciclos_ate_pausa_longa' ? 1 : 60),
          ])
        );
        await apiCall('pomodoro/preferencias', 'PUT', body);
      } else {
        if (resource === 'disciplinas') {
          data.concurso_id = defaults?.concurso_id || effectiveContestId;
          data.peso = Number(data.peso);
        }
        if (resource === 'conteudos') {
          data.disciplina_id = id
            ? topic(id)?.disciplina_id
            : defaults?.disciplina_id || cadSubjectId;
        }
        if (resource === 'disponibilidades') {
          data.concurso_id = effectiveContestId;
          if (data.horario_fim <= data.horario_inicio) {
            throw new Error('O horário final deve ser posterior ao inicial.');
          }
          if (id) {
            data.dia_semana = Number(data.dia_semana);
          } else {
            const days = formData.getAll('dias_semana').map(Number);
            if (!days.length) {
              throw new Error('Selecione pelo menos um dia da semana.');
            }
            delete data.dias_semana;
            result = await apiCall('disponibilidades/lote', 'POST', {
              ...data,
              dias_semana: days,
            });
          }
        }
        if (resource === 'anotacoes') {
          delete data.concurso_id;
          data.disciplina_id = data.disciplina_id || null;
          data.conteudo_id = data.conteudo_id || null;
          if (!String(data.corpo || '').trim()) {
            throw new Error('Escreva o texto da anotação.');
          }
        }
        if (resource === 'concursos') {
          data.data_prova = data.data_prova || null;
        }
        if (!(resource === 'disponibilidades' && !id)) {
          result = await apiCall(
            resource + (id ? '/' + id : ''),
            id ? 'PATCH' : 'POST',
            data
          );
        }
      }

      setEditorState(null);
      if (resource === 'concursos' && !id && result?.id) {
        await refreshData(result.id);
        setCadSubjectId('');
        setPage('cadastro');
      } else {
        await refreshData();
      }
      showToast(
        resource === 'schedule'
          ? 'Atividade agendada. Ela já aparece na agenda e no resumo do dia.'
          : 'Salvo com sucesso.'
      );
    } catch (err: any) {
      setEditorError(err.message);
    } finally {
      setEditorBusy(false);
    }
  };

  // Render Badge & RowActions
  const renderBadge = (status: string) => (
    <span className={`badge status-${status}`}>{statusLabel[status] || status}</span>
  );

  const renderRowActions = (resource: string, id: string) => (
    <div className="row-actions">
      <button type="button" onClick={() => openEditor(resource, id)}>
        Editar
      </button>
      <button
        type="button"
        className="danger"
        onClick={() => handleDelete(resource, id)}
      >
        Excluir
      </button>
    </div>
  );

  const renderEmpty = (
    title: string,
    text: string,
    actionNode?: React.ReactNode
  ) => (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
      {actionNode}
    </div>
  );

  const renderLegalReferences = (refs?: LegalRef[]) => {
    if (!refs || !refs.length) return null;
    return (
      <div className="legal-references">
        {refs.map((ref, idx) => {
          let safe = false;
          try {
            if (ref.url) {
              const u = new URL(ref.url);
              safe = u.protocol === 'https:' && u.hostname === 'www.planalto.gov.br';
            }
          } catch {}
          return (
            <div key={idx} className="legal-reference">
              <strong>{ref.lei}</strong>
              {ref.artigos?.length ? (
                <span>Artigos para estudar: {ref.artigos.join(', ')}</span>
              ) : null}
              <small>
                {ref.origem === 'edital'
                  ? 'Referência identificada pela IA no edital'
                  : 'Sugestão de estudo da IA'}
                {ref.verificado
                  ? ' · Números dos artigos conferidos na fonte oficial'
                  : ' · Confira os dispositivos na fonte oficial'}
              </small>
              {safe && ref.url ? (
                <a href={ref.url} target="_blank" rel="noopener noreferrer">
                  Consultar lei no Planalto ↗
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  // Study Row
  const renderStudyRow = (item: ItemCronograma) => {
    const running =
      activeSession?.item_cronograma_id === item.id ? activeSession : null;
    return (
      <article key={item.id} className={`study-row status-${item.status}`}>
        <span className="study-time">
          {timeLabel(item.inicio_previsto)}
          <small>{timeLabel(endOf(item))}</small>
        </span>
        <div className="study-description">
          <button
            type="button"
            className="study-title"
            onClick={() => navigate('estudo', item.id)}
          >
            {subjectName(item.disciplina_id)}
            <span>
              {item.tipo === 'revisao' ? `↻ Revisão ${item.revisao_numero} · ` : ''}
              {topicName(item.conteudo_id) || 'Estudo da disciplina'}
            </span>
          </button>
          <small>
            {competition(item.concurso_id)?.nome || ''} ·{' '}
            {duration(item.duracao_segundos)}
          </small>
        </div>
        {running ? (
          <div className="study-actions study-running-actions">
            <button
              type="button"
              className="focus-button"
              onClick={async () => {
                if (running.status === 'pausada') {
                  await handleTimerAction('retomar');
                }
                navigate('estudo', item.id);
              }}
            >
              Continuar
            </button>
            <button
              type="button"
              className="row-btn danger"
              onClick={() => handleTimerAction('cancelar')}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <>
            {renderBadge(item.status)}
            <div className="study-actions">
              {item.status === 'pendente' && (
                <button
                  type="button"
                  className="focus-button"
                  title="Iniciar Pomodoro deste estudo"
                  onClick={async () => {
                    try {
                      setPhase('foco');
                      await startFocus({
                        item_cronograma_id: item.id,
                        disciplina_id: item.disciplina_id,
                        conteudo_id: item.conteudo_id,
                      });
                      navigate('estudo', item.id);
                    } catch (err: any) {
                      showToast(err.message);
                    }
                  }}
                >
                  Focar
                </button>
              )}
              {item.status !== 'concluido' && (
                <>
                  <button
                    type="button"
                    className="row-btn"
                    onClick={() => openScheduleModal(undefined, item.id)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="row-btn danger"
                    onClick={() => handleDelete('itens_cronograma', item.id)}
                  >
                    Excluir
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </article>
    );
  };

  // Timer Card
  const renderTimerCard = (
    compact = false,
    ctxOverride: {
      disciplina_id?: string | null;
      conteudo_id?: string | null;
      item_cronograma_id?: string | null;
    } = {}
  ) => {
    const chosen = activeSession || { ...timerContext, ...ctxOverride };
    const currentPhase = activeSession?.fase || phase;
    const planned =
      activeSession?.duracao_planejada_segundos ||
      (pomodoroSettings as any)[currentPhase + '_segundos'] ||
      1500;
    const remaining = activeSession
      ? Math.max(0, planned - sessionElapsed(activeSession, nowTick))
      : planned;
    const progressDeg = `${(1 - remaining / planned) * 360}deg`;
    const chosenSub = chosen.disciplina_id || '';
    const chosenTop = chosen.conteudo_id || '';
    const topicRows = chosenSub
      ? conteudos.filter((r) => r.disciplina_id === chosenSub)
      : filteredTopics;

    return (
      <section className={`focus-panel ${compact ? 'compact-focus' : ''}`}>
        <div className="focus-panel-heading">
          <strong>Pomodoro</strong>
          <button
            type="button"
            className="icon-button"
            title="Ajustar durações"
            aria-label="Ajustar durações do Pomodoro"
            onClick={() => openEditor('settings')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
        <div className="phase-tabs">
          {(['foco', 'pausa_curta', 'pausa_longa'] as const).map((val) => (
            <button
              key={val}
              type="button"
              className={currentPhase === val ? 'active' : ''}
              disabled={Boolean(activeSession)}
              onClick={() => {
                setPhase(val);
                setClockNotice('');
              }}
            >
              {phaseLabel[val]}
            </button>
          ))}
        </div>
        <div
          className="clock-ring"
          style={{ '--clock-progress': progressDeg } as React.CSSProperties}
        >
          <div>
            <strong>{stopwatch(remaining)}</strong>
            <span>
              {activeSession
                ? remaining === 0
                  ? 'Ciclo completo. Registre sua sessão.'
                  : activeSession.status === 'pausada'
                  ? 'Pausado. Retome quando quiser.'
                  : 'Uma coisa de cada vez.'
                : 'Pronto para começar?'}
            </span>
          </div>
        </div>
        {clockNotice ? <p className="clock-notice">{clockNotice}</p> : null}
        {activeSession ? (
          <div className="focus-context">
            <strong>{subjectName(activeSession.disciplina_id)}</strong>
            <span>
              {topicName(activeSession.conteudo_id) || activeSession.titulo}
            </span>
            {activeSession.item_cronograma_id && page !== 'estudo' && (
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  navigate('estudo', activeSession.item_cronograma_id!)
                }
              >
                Abrir este estudo →
              </button>
            )}
          </div>
        ) : page === 'estudo' ? null : (
          <div className="focus-selection">
            <label>
              Disciplina
              <select
                value={chosenSub}
                onChange={(e) =>
                  setTimerContext({
                    disciplina_id: e.target.value || null,
                    conteudo_id: null,
                  })
                }
              >
                <option value="">Foco livre</option>
                {filteredSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Conteúdo
              <select
                value={chosenTop}
                onChange={(e) => {
                  const t = topic(e.target.value);
                  setTimerContext({
                    disciplina_id: t ? t.disciplina_id : chosenSub || null,
                    conteudo_id: e.target.value || null,
                  });
                }}
              >
                <option value="">Sem conteúdo específico</option>
                {topicRows.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {page === 'estudo' ? null : (
          <div className="clock-actions">
            {activeSession ? (
              <>
                <button
                  type="button"
                  className="primary"
                  onClick={() =>
                    handleTimerAction(
                      activeSession.status === 'pausada' ? 'retomar' : 'pausar'
                    )
                  }
                >
                  {activeSession.status === 'pausada' ? '▷ Retomar' : 'Ⅱ Pausar'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={remaining > 0}
                  onClick={() => handleTimerAction('concluir')}
                >
                  Concluir ciclo
                </button>
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() => handleTimerAction('cancelar')}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                className="primary"
                onClick={() => handleTimerAction('iniciar')}
              >
                ▷ Iniciar {phaseLabel[currentPhase].toLowerCase()}
              </button>
            )}
          </div>
        )}
        <p className="focus-footnote">
          {pomodoroSettings.foco_segundos / 60} min de foco ·{' '}
          {pomodoroSettings.pausa_curta_segundos / 60} min de descanso
        </p>
      </section>
    );
  };

  // History Table
  const renderHistoryTable = (
    rows: PomodoroSession[],
    { compact = false } = {}
  ) => {
    let list = rows;
    const pages = Math.max(1, Math.ceil(rows.length / 20));
    const safePage = Math.min(historyPage, pages - 1);
    if (!compact) {
      list = rows.slice(safePage * 20, safePage * 20 + 20);
    }
    if (!list.length) {
      return renderEmpty(
        'Seu histórico começa com o primeiro foco.',
        'Inicie uma sessão em qualquer disciplina. O tempo e o conteúdo estudado aparecerão aqui.'
      );
    }
    if (compact) {
      return (
        <div className="history-mini">
          {list.map((s) => (
            <div key={s.id}>
              <span>
                <strong>{subjectName(s.disciplina_id)}</strong>
                <small>{topicName(s.conteudo_id) || phaseLabel[s.fase]}</small>
                <small>
                  {dateLabel(s.iniciada_em)} · {timeLabel(s.iniciada_em)}
                </small>
              </span>
              <span>
                <b>{stopwatch(sessionElapsed(s, nowTick))}</b>
                {renderBadge(s.status)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <>
        <div className="table-scroll">
          <table className="history-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Disciplina / conteúdo</th>
                <th>Estudo</th>
                <th>Tempo</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>
                    {dateLabel(s.iniciada_em)}
                    <small>{timeLabel(s.iniciada_em)}</small>
                  </td>
                  <td>
                    <strong>{subjectName(s.disciplina_id)}</strong>
                    <small>{topicName(s.conteudo_id) || phaseLabel[s.fase]}</small>
                  </td>
                  <td>
                    {competition(subject(s.disciplina_id)?.concurso_id)?.nome ||
                      'Foco livre'}
                  </td>
                  <td>
                    {stopwatch(sessionElapsed(s, nowTick))}
                    <small>{phaseLabel[s.fase]}</small>
                  </td>
                  <td>{renderBadge(s.status)}</td>
                  <td>
                    <button
                      type="button"
                      className="text-button danger"
                      onClick={() => handleDelete('pomodoro', s.id)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 20 && (
          <div className="pagination">
            <span>
              {safePage * 20 + 1}–{Math.min(rows.length, (safePage + 1) * 20)} de{' '}
              {rows.length} sessões
            </span>
            <button
              type="button"
              className="secondary"
              disabled={safePage === 0}
              onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </button>
            <button
              type="button"
              className="secondary"
              disabled={(safePage + 1) * 20 >= rows.length}
              onClick={() => setHistoryPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        )}
      </>
    );
  };

  // Views
  const renderDashboard = () => {
    const summary = dailySummary(filteredItems, day);
    const focused = filteredSessions
      .filter((r) => r.fase === 'foco' && dayKey(r.iniciada_em) === day)
      .reduce((sum, r) => sum + sessionElapsed(r, nowTick), 0);
    const overdue = filteredItems.filter(
      (r) => r.status === 'pendente' && dayKey(r.inicio_previsto) < day
    ).length;
    const preview = dailySummary(filteredItems, previewDay);
    const previewLabel =
      previewDay === shiftDay(dayKey(), 1)
        ? 'Amanhã'
        : previewDay === dayKey()
        ? 'Hoje'
        : dateOnly(previewDay);
    return (
      <>
        <div className="dashboard-summary-bar">
          <div className="day-navigation">
            <button
              type="button"
              className="icon-button"
              aria-label="Dia anterior"
              onClick={() => setDay(shiftDay(day, -1))}
            >
              ‹
            </button>
            <input
              type="date"
              aria-label="Dia do resumo"
              value={day}
              onChange={(e) => e.target.value && setDay(e.target.value)}
            />
            <button
              type="button"
              className="icon-button"
              aria-label="Próximo dia"
              onClick={() => setDay(shiftDay(day, 1))}
            >
              ›
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setDay(dayKey())}
            >
              Hoje
            </button>
          </div>

          <div className="metrics-inline">
            <div className="metric-item">
              <strong>{summary.pending.length}</strong>
              <span>pendentes</span>
            </div>
            <div className="metric-item">
              <strong>{summary.completed.length}</strong>
              <span>concluídos</span>
            </div>
            <div className="metric-item">
              <strong>{duration(summary.seconds)}</strong>
              <span>planejados</span>
            </div>
            <div className="metric-item">
              <strong>{duration(focused)}</strong>
              <span>de foco</span>
            </div>
          </div>
        </div>

        {overdue > 0 && (
          <button
            type="button"
            className="overdue-notice"
            onClick={() => {
              setFilters((f) => ({ ...f, scheduleStatus: 'pendente' }));
              setPage('cronograma');
            }}
          >
            Você tem {overdue} atividade(s) pendente(s) de dias anteriores.
            Abrir cronograma →
          </button>
        )}

        <section className="panel">
          <div className="panel-heading">
            <h2>{day === dayKey() ? 'Roteiro de hoje' : dateOnly(day)}</h2>
          </div>
          <div className="dashboard-day-scroll">
            {summary.pending.length
              ? summary.pending.map(renderStudyRow)
              : renderEmpty(
                  summary.completed.length
                    ? 'Atividades do dia concluídas.'
                    : 'Nenhuma atividade agendada para este dia.',
                  summary.completed.length
                    ? 'Você pode revisar uma matéria ou planejar o próximo dia.'
                    : 'Agende uma atividade ou consulte os próximos dias abaixo.'
                )}
          </div>
        </section>

        <section className="panel dashboard-preview">
          <div className="panel-heading">
            <h2>
              <span className="dashboard-preview-navigation">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Dia anterior da prévia"
                  onClick={() => setPreviewDay(shiftDay(previewDay, -1))}
                >
                  ‹
                </button>
                <span>{previewLabel}</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Próximo dia da prévia"
                  onClick={() => setPreviewDay(shiftDay(previewDay, 1))}
                >
                  ›
                </button>
              </span>
            </h2>
          </div>
          <div className="dashboard-day-scroll">
            {preview.items.filter((i) => i.status !== 'cancelado').length
              ? preview.items
                  .filter((i) => i.status !== 'cancelado')
                  .map(renderStudyRow)
              : renderEmpty(
                  'Nenhuma atividade agendada para este dia.',
                  'Use as setas para consultar outros dias ou agende uma atividade.'
                )}
          </div>
        </section>

        {summary.completed.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <h2>Concluídos no dia</h2>
              <span className="subtle">{summary.completed.length} estudos</span>
            </div>
            {summary.completed.map(renderStudyRow)}
          </section>
        )}
      </>
    );
  };

  // Edital Import Card
  const handleEditalUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editalBusy) return;
    setEditalError('');
    if (
      !selectedFile ||
      selectedFile.size > 30 * 1024 * 1024 ||
      !selectedFile.name.toLowerCase().endsWith('.pdf')
    ) {
      setEditalError('Selecione um PDF de até 30 MB.');
      return;
    }
    setEditalBusy(true);
    try {
      const response = await fetch(
        '/api/ia/edital?cargo=' + encodeURIComponent(cargoInput),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/pdf' },
          body: selectedFile,
          credentials: 'include',
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível analisar o edital.');
      }
      setEditalPreview(data);
      setEditalNome(data.nome || '');
    } catch (err: any) {
      setEditalError(err.message);
    } finally {
      setEditalBusy(false);
    }
  };

  const handleEditalConfirm = async () => {
    setEditalConfirmError('');
    if (!editalNome.trim()) {
      setEditalConfirmError('Informe o nome do estudo.');
      return;
    }
    try {
      const study = await apiCall('ia/edital/confirmar', 'POST', {
        token: editalPreview.token,
        nome: editalNome.trim(),
      });
      setEditalPreview(null);
      setImportingStudy(false);
      setSelectedFile(null);
      setCargoInput('');
      setCadSubjectId('');
      await refreshData(study.id);
      showToast('Estudo, disciplinas e conteúdos cadastrados com sucesso.');
    } catch (err: any) {
      setEditalConfirmError(err.message);
    }
  };

  const renderEditalImportCard = () => (
    <section
      className={`ai-import-card ${editalPreview ? 'has-preview' : ''}`}
      aria-labelledby="ai-import-title"
    >
      {!editalPreview ? (
        <>
          <div className="ai-import-copy">
            <h2 id="ai-import-title">Cadastre seu estudo pelo edital</h2>
            <p>
              Envie um PDF para extrair as disciplinas e os conteúdos. Revise a
              prévia antes de confirmar o cadastro.
            </p>
            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="secondary"
                onClick={() => openEditor('concursos')}
              >
                + Cadastrar manualmente
              </button>
            </div>
          </div>

          <form onSubmit={handleEditalUpload} className="ai-import-upload">
            <label>
              Cargo ou objetivo (opcional)
              <input
                name="cargo"
                type="text"
                maxLength={300}
                placeholder="Ex.: Técnico administrativo"
                value={cargoInput}
                disabled={editalBusy}
                onChange={(e) => setCargoInput(e.target.value)}
              />
            </label>
            <label
              className={`edital-file-picker ${selectedFile ? 'has-file' : ''}`}
            >
              <input
                type="file"
                name="arquivo"
                accept="application/pdf,.pdf"
                required
                disabled={editalBusy}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <span className="edital-file-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M8 13h8M8 17h5" />
                </svg>
              </span>
              <strong>
                {selectedFile ? selectedFile.name : 'Selecione seu edital'}
              </strong>
              <span>
                {selectedFile
                  ? `${(selectedFile.size / 1024 / 1024).toLocaleString(
                      'pt-BR',
                      { maximumFractionDigits: 2 }
                    )} MB · PDF`
                  : 'Arquivo PDF · até 30 MB'}
              </span>
              <span className="edital-file-action">
                {selectedFile ? 'Trocar arquivo' : 'Escolher arquivo'}
              </span>
            </label>
            <button type="submit" className="primary" disabled={editalBusy}>
              {editalBusy ? 'Analisando edital…' : 'Analisar com IA'}
            </button>
            {editalBusy && (
              <p className="form-help" role="status" aria-live="polite">
                Analisando o edital. Isso pode levar alguns minutos; aguarde a
                prévia.
              </p>
            )}
            <p className="inline-error" role="alert">
              {editalError}
            </p>
          </form>
        </>
      ) : (
        <div className="edital-preview">
          <div className="edital-result-heading">
            <span className="edital-result-badge">✓ Análise concluída</span>
            <h3>Confira as matérias e os assuntos encontrados</h3>
            <p>
              {editalPreview.disciplinas.length} matérias ·{' '}
              {editalPreview.disciplinas.reduce(
                (sum: number, s: any) => sum + s.conteudos.length,
                0
              )}{' '}
              assuntos
            </p>
            <p className="form-help">
              O estudo ainda não foi salvo. Confirme abaixo para cadastrar.
              Depois, você poderá adicionar suas próprias matérias e conteúdos.
            </p>
          </div>
          <label>
            Nome do estudo
            <input
              name="edital_nome"
              type="text"
              required
              maxLength={200}
              value={editalNome}
              onChange={(e) => setEditalNome(e.target.value)}
            />
          </label>
          <p>
            {editalPreview.banca || 'Banca não identificada'} · Prova:{' '}
            {dateOnly(editalPreview.data_prova)}
          </p>
          {editalPreview.observacoes && (
            <p className="form-help">{editalPreview.observacoes}</p>
          )}
          <div className="edital-subjects">
            {editalPreview.disciplinas.map((sub: any, idx: number) => (
              <details key={idx} open={idx === 0}>
                <summary>
                  {sub.nome} · {sub.conteudos.length} conteúdos · Peso{' '}
                  {sub.peso}
                </summary>
                <ul>
                  {sub.conteudos.map((c: any, cIdx: number) => (
                    <li key={cIdx}>
                      {c.titulo}
                      {c.descricao ? <p>{c.descricao}</p> : null}
                      {renderLegalReferences(
                        editalPreview.referencias?.[idx]?.[cIdx] || []
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
          <div className="detail-actions">
            <button
              type="button"
              className="primary"
              onClick={handleEditalConfirm}
            >
              Confirmar cadastro
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEditalPreview(null)}
            >
              Descartar prévia
            </button>
          </div>
          <p className="inline-error" role="alert">
            {editalConfirmError}
          </p>
        </div>
      )}
    </section>
  );

  // Registration (Cadastrar estudo) View
  const renderRegistration = () => {
    const course = selectedCompetition;
    const selectedSub = disciplinas.find(
      (r) => r.id === cadSubjectId && r.concurso_id === effectiveContestId
    );
    if (!concursos.length || importingStudy || editalPreview) {
      return (
        <>
          {concursos.length > 0 && (
            <button
              type="button"
              className="back-link"
              onClick={() => {
                setImportingStudy(false);
                setEditalPreview(null);
              }}
            >
              ← Meus estudos
            </button>
          )}
          {renderEditalImportCard()}
        </>
      );
    }

    return (
      <div className="registration-workspace">
        <div className="registration-list">
          <div className="registration-list-heading">
            <h2>Meus estudos</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Criar estudo com IA"
              onClick={() => {
                setImportingStudy(true);
                setCadSubjectId('');
              }}
            >
              +
            </button>
          </div>
          {concursos.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`competition-entry ${
                row.id === effectiveContestId ? 'active' : ''
              }`}
              onClick={() => setContest(row.id)}
            >
              <span>{row.nome}</span>
              <small>
                {row.banca || 'Banca a definir'} · {dateOnly(row.data_prova)}
              </small>
              <i>
                {disciplinas.filter((d) => d.concurso_id === row.id).length}{' '}
                disciplinas
              </i>
            </button>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setImportingStudy(true);
              setCadSubjectId('');
            }}
          >
            + Novo estudo com IA
          </button>
        </div>

        <section className="registration-detail">
          {!course ? (
            renderEmpty(
              'Sem estudo cadastrado',
              'Cadastre seu primeiro estudo. Depois, adicione as disciplinas e os conteúdos que você quer aprender.',
              <button
                type="button"
                className="primary"
                onClick={() => setImportingStudy(true)}
              >
                Criar estudo com IA
              </button>
            )
          ) : selectedSub ? (
            (() => {
              const rows = conteudos.filter(
                (r) => r.disciplina_id === selectedSub.id
              );
              return (
                <>
                  <button
                    type="button"
                    className="back-link"
                    onClick={() => setCadSubjectId('')}
                  >
                    ← Disciplinas de {course.nome}
                  </button>
                  <div className="resource-heading">
                    <div>
                      <h2>{selectedSub.nome}</h2>
                      <p>
                        Peso {selectedSub.peso} no edital · {rows.length}{' '}
                        conteúdos
                      </p>
                    </div>
                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        openEditor('conteudos', undefined, {
                          disciplina_id: selectedSub.id,
                        })
                      }
                    >
                      + Conteúdo
                    </button>
                  </div>
                  {selectedSub.descricao ? (
                    <p className="description-block">{selectedSub.descricao}</p>
                  ) : null}
                  {rows.length ? (
                    <div className="topic-list">
                      {rows.map((row) => (
                        <article key={row.id} className="topic-row">
                          <button
                            type="button"
                            className={`topic-status ${
                              row.status === 'concluido' ? 'checked' : ''
                            }`}
                            aria-label={`${
                              row.status === 'concluido' ? 'Reabrir' : 'Concluir'
                            } ${row.titulo}`}
                            onClick={async () => {
                              try {
                                await apiCall(`conteudos/${row.id}`, 'PATCH', {
                                  status:
                                    row.status === 'concluido'
                                      ? 'pendente'
                                      : 'concluido',
                                });
                                await refreshData();
                              } catch (err: any) {
                                showToast(err.message);
                              }
                            }}
                          >
                            {row.status === 'concluido' ? '✓' : '○'}
                          </button>
                          <div>
                            <strong>{row.titulo}</strong>
                            <p>{row.descricao || 'Sem descrição'}</p>
                            {renderLegalReferences(row.referencias_legais)}
                          </div>
                          {renderBadge(row.status)}
                          {renderRowActions('conteudos', row.id)}
                        </article>
                      ))}
                    </div>
                  ) : (
                    renderEmpty(
                      'O que cai nesta disciplina?',
                      'Use o botão + Conteúdo acima para adicionar os tópicos do edital. Eles ficarão disponíveis no agendamento e no estudo.'
                    )
                  )}
                </>
              );
            })()
          ) : (
            <>
              <div className="resource-heading">
                <div>
                  <h2>{course.nome}</h2>
                  <p>
                    {course.banca ? `${course.banca} · ` : ''}Prova: {dateOnly(course.data_prova)} ·{' '}
                    {filteredSubjects.length} disciplinas
                  </p>
                </div>
                {renderRowActions('concursos', course.id)}
              </div>
              <div className="subsection-heading">
                <h3>Disciplinas</h3>
                <div className="study-actions">
                  {itensCronograma.some((i) => i.concurso_id === course.id) && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => triggerReplan(course.id)}
                    >
                      Replanejar pendências com IA
                    </button>
                  )}
                  <button
                    type="button"
                    className="primary"
                    onClick={() =>
                      openEditor('disciplinas', undefined, {
                        concurso_id: course.id,
                      })
                    }
                  >
                    + Disciplina
                  </button>
                </div>
              </div>
              <div className="subject-cards">
                {filteredSubjects.length
                  ? filteredSubjects.map((row) => {
                      const cList = conteudos.filter(
                        (c) => c.disciplina_id === row.id
                      );
                      const done = cList.filter(
                        (c) => c.status === 'concluido'
                      ).length;
                      return (
                        <article key={row.id} className="subject-card">
                          <button
                            type="button"
                            className="subject-card-open"
                            onClick={() => setCadSubjectId(row.id)}
                          >
                            <h3>{row.nome}</h3>
                            <span className="subject-subtitle">
                              {cList.length} conteúdos · {done} concluídos
                            </span>
                            <span className="subject-weight">
                              Peso {row.peso}
                            </span>
                            <span className="subject-open-label">
                              Abrir conteúdos →
                            </span>
                          </button>
                          {renderRowActions('disciplinas', row.id)}
                        </article>
                      );
                    })
                  : renderEmpty(
                      'Adicione as disciplinas do edital.',
                      'Use o botão + Disciplina acima para começar. Depois, clique na disciplina para cadastrar seus conteúdos.'
                    )}
              </div>
            </>
          )}
        </section>
      </div>
    );
  };

  // Cronograma / Schedule Flow
  const getFlow = (courseId: string): ScheduleFlowState => {
    const existing = scheduleFlows[courseId];
    if (existing) return existing;
    const course = competition(courseId);
    const hasItems = itensCronograma.some((i) => i.concurso_id === courseId);
    return {
      step: hasItems ? 4 : 1,
      draft: {
        inicio: dayKey(),
        fim:
          course?.data_prova && course.data_prova > dayKey()
            ? shiftDay(course.data_prova.slice(0, 10), -1)
            : shiftDay(dayKey(), 90),
        minutos: 50,
      },
    };
  };

  const updateFlow = (
    courseId: string,
    patch: Partial<ScheduleFlowState>
  ) => {
    setScheduleFlows((prev) => ({
      ...prev,
      [courseId]: { ...getFlow(courseId), ...patch },
    }));
  };

  const triggerReplan = (courseId: string) => {
    setContest(courseId);
    const hasAvail = disponibilidades.some((r) => r.concurso_id === courseId);
    updateFlow(courseId, {
      step: hasAvail ? 2 : 1,
      reorganizar: true,
    });
    setSchedulePreview(null);
    setPage('cronograma');
  };

  const renderSchedule = () => {
    const course = selectedCompetition;
    if (!course) {
      return renderEmpty(
        'Sem estudo cadastrado',
        'Cadastre um estudo para começar a organizar o estudo.',
        <button
          type="button"
          className="primary"
          onClick={() => setPage('cadastro')}
        >
          Criar estudo com IA
        </button>
      );
    }

    const availability = disponibilidades
      .filter((r) => r.concurso_id === course.id)
      .sort(
        (a, b) =>
          a.dia_semana - b.dia_semana ||
          a.horario_inicio.localeCompare(b.horario_inicio)
      );

    const preview =
      schedulePreview?.concurso_id === course.id ? schedulePreview : null;
    const flow = getFlow(course.id);
    let currentStep = flow.step;
    if (!availability.length && currentStep !== 4) currentStep = 1;
    if (currentStep === 3 && !preview) currentStep = 2;

    const list = filteredItems
      .filter(
        (item) =>
          (!filters.scheduleSubject ||
            item.disciplina_id === filters.scheduleSubject) &&
          (!filters.scheduleStatus || item.status === filters.scheduleStatus)
      )
      .sort((a, b) => a.inicio_previsto.localeCompare(b.inicio_previsto));

    const groups = new Map<string, ItemCronograma[]>();
    for (const item of list) {
      const d = dayKey(item.inicio_previsto);
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d)!.push(item);
    }

    const labels = [
      ['Disponibilidade', 'Dias e horários'],
      ['Planejamento', 'Preferências e IA'],
      ['Revisão', 'Confira a prévia'],
      ['Agenda', 'Pronto para estudar'],
    ];

    return (
      <>
        <nav className="schedule-flow" aria-label="Etapas do cronograma">
          <ol>
            {labels.map(([label, desc], index) => {
              const step = index + 1;
              const allowed =
                step === 1 ||
                (step === 2 && availability.length > 0) ||
                (step === 3 && Boolean(preview)) ||
                (step === 4 && filteredItems.length > 0);
              return (
                <li
                  key={step}
                  className={
                    currentStep === step
                      ? 'current'
                      : currentStep > step
                      ? 'complete'
                      : ''
                  }
                >
                  <button
                    type="button"
                    disabled={!allowed || flow.busy}
                    onClick={() => updateFlow(course.id, { step })}
                  >
                    <span className="schedule-flow-number">
                      {currentStep > step ? '✓' : step}
                    </span>
                    <span>
                      <strong>{label}</strong>
                      <small>{desc}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="schedule-flow-content">
          {currentStep === 1 && (
            <section className="availability-panel schedule-step">
              <div className="panel-heading">
                <h2>Quando você pode estudar?</h2>
                <span className="subtle">
                  {availability.length} horários semanais
                </span>
              </div>
              <p className="form-help">
                Cadastre os dias da semana e os horários disponíveis. A IA usará
                essas janelas para montar seu cronograma.
              </p>
              {availability.map((row) => (
                <div key={row.id} className="availability-row">
                  <strong>
                    {
                      [
                        'Domingo',
                        'Segunda',
                        'Terça',
                        'Quarta',
                        'Quinta',
                        'Sexta',
                        'Sábado',
                      ][row.dia_semana]
                    }
                  </strong>
                  <span>
                    {row.horario_inicio.slice(0, 5)}–
                    {row.horario_fim.slice(0, 5)}
                  </span>
                  {renderRowActions('disponibilidades', row.id)}
                </div>
              ))}
              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="primary"
                  onClick={() => openEditor('disponibilidades')}
                >
                  +{' '}
                  {availability.length
                    ? 'Adicionar horário'
                    : 'Cadastrar dias e horários'}
                </button>
              </div>
              <div className="wizard-footer">
                <span className="form-help">
                  {availability.length
                    ? 'Disponibilidade salva. Vamos organizar os assuntos?'
                    : 'Adicione pelo menos um horário para continuar.'}
                </span>
                <button
                  type="button"
                  className="primary"
                  disabled={!availability.length}
                  onClick={() => updateFlow(course.id, { step: 2 })}
                >
                  Continuar →
                </button>
              </div>
            </section>
          )}

          {currentStep === 2 && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Organize com IA</h2>
              </div>
              <p className="form-help">
                Planeje até a véspera da prova. A IA prioriza as matérias e o
                sistema distribui o edital com revisões de 1, 7 e 30 dias,
                depois recorrentes, respeitando sua disponibilidade e 10 minutos
                entre blocos.
              </p>
              {flow.reorganizar && (
                <p className="replan-notice">
                  Replanejamento: as pendências atrasadas e futuras entrarão na
                  nova distribuição junto com os conteúdos adicionados.
                  Concluídas e execuções em andamento serão preservadas. A
                  mudança só será aplicada após confirmar a prévia.
                </p>
              )}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  updateFlow(course.id, { busy: true });
                  setAiScheduleError('');
                  setAiScheduleStatus(
                    'Organizando os assuntos e os horários. Aguarde a prévia…'
                  );
                  try {
                    const res = await apiCall('ia/cronograma', 'POST', {
                      concurso_id: course.id,
                      inicio: flow.draft.inicio,
                      fim: flow.draft.fim,
                      minutos: Number(flow.draft.minutos),
                      reorganizar: flow.reorganizar || false,
                    });
                    setSchedulePreview(res);
                    setAiScheduleStatus('');
                    updateFlow(course.id, { step: 3, busy: false });
                  } catch (err: any) {
                    setAiScheduleError(err.message);
                    setAiScheduleStatus('');
                    updateFlow(course.id, { busy: false });
                  }
                }}
              >
                <div className="settings-grid">
                  <label>
                    Começar em
                    <input
                      type="date"
                      required
                      value={flow.draft.inicio}
                      onChange={(e) =>
                        updateFlow(course.id, {
                          draft: { ...flow.draft, inicio: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    Véspera da prova ou prazo final
                    <input
                      type="date"
                      required
                      value={flow.draft.fim}
                      onChange={(e) =>
                        updateFlow(course.id, {
                          draft: { ...flow.draft, fim: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    Minutos por atividade
                    <input
                      type="number"
                      required
                      min={25}
                      max={120}
                      step={1}
                      value={flow.draft.minutos}
                      onChange={(e) =>
                        updateFlow(course.id, {
                          draft: {
                            ...flow.draft,
                            minutos: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                </div>
                <div className="wizard-footer">
                  <button
                    type="button"
                    className="secondary"
                    disabled={flow.busy}
                    onClick={() => updateFlow(course.id, { step: 1 })}
                  >
                    ← Voltar
                  </button>
                  <button
                    type="submit"
                    className="primary"
                    disabled={flow.busy}
                  >
                    Gerar prévia com IA →
                  </button>
                </div>
                {aiScheduleStatus && (
                  <p className="form-help" role="status">
                    {aiScheduleStatus}
                  </p>
                )}
                <p className="inline-error" role="alert">
                  {aiScheduleError}
                </p>
              </form>
            </section>
          )}

          {currentStep === 3 && preview && (
            <section className="panel">
              <div className="panel-heading">
                <h2>Revise antes de adicionar à agenda</h2>
              </div>
              <p className="form-help">
                {preview.reorganizar
                  ? `Replanejamento: ${
                      preview.substituir?.length || 0
                    } pendências serão substituídas, incluindo ${
                      preview.atrasadas || 0
                    } atrasadas. `
                  : ''}
                {preview.atividades.length} atividades propostas até{' '}
                {dateOnly(preview.periodo?.fim || '')}.{' '}
                {preview.resumo
                  ? `${preview.resumo.assuntos_novos} blocos de estudo · ${preview.resumo.revisoes} revisões · ${preview.resumo.horas_planejadas} horas.`
                  : ''}{' '}
                {preview.restantes
                  ? `Atenção: ${preview.restantes} assuntos não couberam nos horários disponíveis.`
                  : 'Todos os assuntos têm estudo inicial previsto ou já registrado.'}{' '}
                Nenhuma atividade foi salva ainda.
              </p>
              <div className="schedule-preview-list">
                {preview.atividades.map((row: any, i: number) => (
                  <div key={i} className="schedule-preview-row">
                    <span>
                      {dateOnly(dayKey(row.inicio_previsto))}
                      <small>
                        {timeLabel(row.inicio_previsto)}–{timeLabel(endOf(row))}
                      </small>
                    </span>
                    <div>
                      <strong>{row.disciplina}</strong>
                      <p>
                        {row.tipo === 'revisao' && (
                          <span className="review-label">
                            ↻ Revisão {row.revisao_numero}
                          </span>
                        )}{' '}
                        {row.titulo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="detail-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={async () => {
                    setConfirmAiError('');
                    try {
                      const res = await apiCall(
                        'ia/cronograma/confirmar',
                        'POST',
                        { token: preview.token }
                      );
                      setSchedulePreview(null);
                      updateFlow(course.id, { step: 4, reorganizar: false });
                      await refreshData();
                      showToast(
                        `${res.quantidade} atividades adicionadas à agenda.`
                      );
                    } catch (err: any) {
                      setConfirmAiError(err.message);
                    }
                  }}
                >
                  {preview.reorganizar
                    ? 'Confirmar replanejamento'
                    : 'Adicionar à agenda'}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setSchedulePreview(null);
                    updateFlow(course.id, { step: 2 });
                  }}
                >
                  ← Ajustar planejamento
                </button>
              </div>
              <p className="inline-error" role="alert">
                {confirmAiError}
              </p>
            </section>
          )}

          {currentStep === 4 && (
            <>
              <div className="wizard-finished">
                <span>✓ Cronograma na agenda</span>
                <div className="study-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => updateFlow(course.id, { step: 1 })}
                  >
                    Planejar mais atividades
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => triggerReplan(course.id)}
                  >
                    Replanejar pendências com IA
                  </button>
                </div>
              </div>

              <div className="filter-bar">
                <label>
                  Disciplina
                  <select
                    value={filters.scheduleSubject}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        scheduleSubject: e.target.value,
                      }))
                    }
                  >
                    <option value="">Todas as disciplinas</option>
                    {filteredSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Situação
                  <select
                    value={filters.scheduleStatus}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        scheduleStatus: e.target.value,
                      }))
                    }
                  >
                    <option value="">Todas</option>
                    <option value="pendente">Pendentes</option>
                    <option value="concluido">Concluídos</option>
                    <option value="cancelado">Cancelados</option>
                  </select>
                </label>
                {availability.length > 0 && (
                  <button
                    type="button"
                    className="primary"
                    onClick={() => openScheduleModal(dayKey())}
                  >
                    + Agendar atividade
                  </button>
                )}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setPage('agenda')}
                >
                  Ver na agenda →
                </button>
              </div>

              {groups.size > 0 ? (
                [...groups.entries()].map(([d, rows]) => (
                  <section key={d} className="panel">
                    <div className="panel-heading">
                      <h2>
                        {new Intl.DateTimeFormat('pt-BR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                        }).format(parseDay(d))}
                      </h2>
                      {availability.length > 0 && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => openScheduleModal(d)}
                        >
                          + Neste dia
                        </button>
                      )}
                    </div>
                    {rows.map(renderStudyRow)}
                  </section>
                ))
              ) : (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Atividades agendadas</h2>
                  </div>
                  {renderEmpty(
                    'Seu cronograma aparecerá aqui.',
                    availability.length
                      ? 'Peça à IA para montar o cronograma e revise a prévia antes de adicionar à agenda.'
                      : 'Comece cadastrando os dias e horários em que você pode estudar no passo 1.'
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </>
    );
  };

  // Notes View
  const renderNotesView = () => {
    const rows = anotacoes.filter(
      (r) =>
        !r.disciplina_id ||
        effectiveContestId === 'all' ||
        subject(r.disciplina_id)?.concurso_id === effectiveContestId
    );
    const selected = filters.notes;
    const disc = subject(selected);

    if (selected && (disc || selected === 'free')) {
      const notes = rows
        .filter((n) =>
          selected === 'free' ? !n.disciplina_id : n.disciplina_id === selected
        )
        .sort(
          (a, b) =>
            b.criado_em.localeCompare(a.criado_em) || a.id.localeCompare(b.id)
        );
      return (
        <>
          <button
            type="button"
            className="back-link"
            onClick={() => setFilters((f) => ({ ...f, notes: '' }))}
          >
            ← Todas as disciplinas
          </button>
          <div className="resource-heading">
            <div>
              <h2>{disc?.nome || 'Anotações livres'}</h2>
              <p>{notes.length} anotações</p>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() =>
                openEditor(
                  'anotacoes',
                  undefined,
                  disc ? { disciplina_id: disc.id } : {}
                )
              }
            >
              + Nova anotação
            </button>
          </div>
          {notes.length ? (
            <div className="notes-lines">
              {notes.map((note) => (
                <article key={note.id} className="note-card">
                  <div className="note-card-context">
                    {note.disciplina_id
                      ? subjectName(note.disciplina_id)
                      : 'Anotação livre'}
                  </div>
                  <h3>{topicName(note.conteudo_id) || note.titulo}</h3>
                  {note.conteudo_id &&
                    note.titulo !== topicName(note.conteudo_id) && (
                      <p className="note-custom-title">{note.titulo}</p>
                    )}
                  <div className="note-body">{note.corpo}</div>
                  <div className="note-card-footer">
                    <time dateTime={note.criado_em}>{stamp(note.criado_em)}</time>
                    {renderRowActions('anotacoes', note.id)}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            renderEmpty(
              'Nenhuma anotação nesta disciplina.',
              'Escreva durante o estudo ou use o botão Nova anotação acima.'
            )
          )}
        </>
      );
    }

    const groups = filteredSubjects
      .map((d) => ({
        id: d.id,
        nome: d.nome,
        notes: rows.filter((n) => n.disciplina_id === d.id),
      }))
      .filter((g) => g.notes.length > 0);
    const free = rows.filter((n) => !n.disciplina_id);
    if (free.length) {
      groups.push({ id: 'free', nome: 'Anotações livres', notes: free });
    }

    return (
      <>
        <div className="filter-bar">
          <span className="filter-count">
            {groups.length} grupos · {rows.length} anotações
          </span>
          <button
            type="button"
            className="primary"
            onClick={() => openEditor('anotacoes')}
          >
            + Nova anotação
          </button>
        </div>
        <div className="subject-cards">
          {groups.length
            ? groups.map((g) => (
                <article key={g.id} className="subject-card">
                  <button
                    type="button"
                    className="subject-card-open"
                    onClick={() => setFilters((f) => ({ ...f, notes: g.id }))}
                  >
                    <h3>{g.nome}</h3>
                    <span className="subject-subtitle">
                      {g.notes.length} anotações
                      {g.id !== 'free'
                        ? ` · ${
                            new Set(
                              g.notes.map((n) => n.conteudo_id).filter(Boolean)
                            ).size
                          } conteúdos`
                        : ''}
                    </span>
                    <span className="subject-open-label">
                      Abrir anotações →
                    </span>
                  </button>
                </article>
              ))
            : renderEmpty(
                'Suas anotações aparecerão por disciplina.',
                'Use o botão Nova anotação acima ou escreva durante o estudo.'
              )}
        </div>
      </>
    );
  };

  // Study Detail View
  const renderStudyView = () => {
    const item = itemById(studyId);
    const disc = subject(studySubjectId);
    if (!disc) {
      return renderEmpty(
        'Estudo não encontrado.',
        'Ele pode ter sido removido ou não pertencer à sua conta.',
        <button
          type="button"
          className="secondary"
          onClick={() => setPage('dashboard')}
        >
          Voltar ao dashboard
        </button>
      );
    }
    const selTopic = topic(studyTopicId);
    const rows = anotacoes.filter(
      (r) =>
        r.disciplina_id === disc.id &&
        (!r.conteudo_id || r.conteudo_id === studyTopicId)
    );
    const draftKey = `${disc.id}:${studyTopicId || 'livre'}`;
    const draftBody = noteDrafts[draftKey] || '';
    const currentExecution =
      activeSession &&
      (item
        ? activeSession.item_cronograma_id === item.id
        : activeSession.disciplina_id === disc.id)
        ? activeSession
        : null;
    const context = {
      disciplina_id: disc.id,
      conteudo_id: studyTopicId || null,
      item_cronograma_id:
        item && item.conteudo_id === (studyTopicId || null) ? item.id : null,
    };

    const submitStudyNote = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (noteBusy) return;
      const body = draftBody.trim();
      if (!body) {
        setNoteError('Escreva sua anotação.');
        return;
      }
      setNoteBusy(true);
      setNoteError('');
      try {
        await apiCall('anotacoes', 'POST', {
          titulo: (
            topicName(studyTopicId) || 'Anotação de ' + subjectName(disc.id)
          ).slice(0, 200),
          corpo: body,
          disciplina_id: disc.id,
          conteudo_id: studyTopicId || null,
        });
        setNoteDrafts((d) => ({ ...d, [draftKey]: '' }));
        await refreshData();
        showToast('Anotação salva neste estudo.');
      } catch (err: any) {
        setNoteError(err.message);
      } finally {
        setNoteBusy(false);
      }
    };

    return (
      <>
        <div className="study-breadcrumb">
          <button
            type="button"
            className="text-button"
            onClick={() => setPage('dashboard')}
          >
            ← Dashboard
          </button>
          <span>
            {competition(disc.concurso_id)?.nome || ''} / {disc.nome}
          </span>
        </div>

        <div className="study-detail-layout">
          <div>
            <section className="panel">
              <div className="study-detail-heading">
                <div>
                  <span className="study-discipline-context">
                    {disc.nome}
                    {item
                      ? ` · ${dateOnly(dayKey(item.inicio_previsto))} · ${timeLabel(
                          item.inicio_previsto
                        )}–${timeLabel(endOf(item))}`
                      : ''}
                  </span>
                  <h2>{selTopic?.titulo || disc.nome}</h2>
                  {selTopic?.descricao ? (
                    <p>{selTopic.descricao}</p>
                  ) : !selTopic && disc.descricao ? (
                    <p>{disc.descricao}</p>
                  ) : null}
                  {renderLegalReferences(selTopic?.referencias_legais)}
                </div>
                {item ? (
                  renderBadge(item.status)
                ) : (
                  <span className="badge">Peso {disc.peso}</span>
                )}
              </div>

              <div className="detail-actions">
                {currentExecution ? (
                  <>
                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        handleTimerAction(
                          currentExecution.status === 'pausada'
                            ? 'retomar'
                            : 'pausar'
                        )
                      }
                    >
                      {currentExecution.status === 'pausada'
                        ? 'Retomar'
                        : 'Pausar'}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={async () => {
                        await handleTimerAction('finalizar');
                        setPage('dashboard');
                        showToast(
                          'Atividade finalizada e tempo de estudo registrado.'
                        );
                      }}
                    >
                      Finalizar
                    </button>
                    <button
                      type="button"
                      className="text-button danger"
                      onClick={async () => {
                        await handleTimerAction('cancelar');
                        setPage('dashboard');
                        showToast(
                          'Execução cancelada. Você pode iniciar a atividade novamente.'
                        );
                      }}
                    >
                      Cancelar
                    </button>
                  </>
                ) : !item || item.status === 'pendente' ? (
                  <button
                    type="button"
                    className="primary"
                    onClick={async () => {
                      try {
                        setPhase('foco');
                        await startFocus({
                          disciplina_id: item?.disciplina_id || studySubjectId,
                          conteudo_id:
                            item?.conteudo_id || studyTopicId || null,
                          item_cronograma_id: item?.id || null,
                        });
                      } catch (err: any) {
                        showToast(err.message);
                      }
                    }}
                  >
                    Iniciar
                  </button>
                ) : null}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Comentários e anotações</h2>
                  <p className="panel-subtitle">
                    {selTopic?.titulo || 'Anotações da disciplina'}
                  </p>
                </div>
              </div>
              <div
                className="study-chat"
                role="log"
                aria-label="Anotações deste estudo"
              >
                {rows.length ? (
                  [...rows]
                    .sort(
                      (a, b) =>
                        a.criado_em.localeCompare(b.criado_em) ||
                        a.id.localeCompare(b.id)
                    )
                    .map((note) => (
                      <article key={note.id} className="study-chat-message">
                        <div className="study-chat-body">{note.corpo}</div>
                        <div className="study-chat-meta">
                          <time dateTime={note.criado_em}>
                            {stamp(note.criado_em)}
                          </time>
                          {renderRowActions('anotacoes', note.id)}
                        </div>
                      </article>
                    ))
                ) : (
                  <p className="study-chat-empty">
                    Registre aqui suas ideias, dúvidas e o que aprendeu.
                  </p>
                )}
              </div>
              <form onSubmit={submitStudyNote} className="study-chat-compose">
                <div className="study-chat-input">
                  <textarea
                    name="corpo"
                    rows={2}
                    required
                    maxLength={30000}
                    aria-label="Nova anotação"
                    placeholder="Escreva uma anotação…"
                    value={draftBody}
                    onChange={(e) =>
                      setNoteDrafts((d) => ({
                        ...d,
                        [draftKey]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitStudyNote();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    className="primary"
                    disabled={noteBusy}
                  >
                    Enviar
                  </button>
                </div>
                <span className="subtle">
                  Enter para enviar · Shift + Enter para uma nova linha
                </span>
                <p className="inline-error" role="alert">
                  {noteError}
                </p>
              </form>
            </section>
          </div>

          <div>
            {renderTimerCard(true, context)}
            <section className="panel">
              <div className="panel-heading">
                <h2>Foco nesta disciplina</h2>
              </div>
              {renderHistoryTable(
                pomodoroSessions
                  .filter((r) => r.disciplina_id === disc.id)
                  .slice(0, 3),
                { compact: true }
              )}
            </section>
          </div>
        </div>
      </>
    );
  };

  // Agenda View
  const renderAgenda = () => {
    const list = filteredItems.filter(
      (i) => !filters.agenda || i.disciplina_id === filters.agenda
    );
    const dates = weekDays(agendaAnchor);
    const title =
      agendaMode === 'pipeline'
        ? 'Todas as atividades'
        : agendaMode === 'mes'
        ? new Intl.DateTimeFormat('pt-BR', {
            month: 'long',
            year: 'numeric',
          }).format(parseDay(agendaAnchor))
        : `${dateOnly(dates[0])} — ${dateOnly(dates[6])}`;

    const visualStatus = (item: ItemCronograma) =>
      item.status === 'pendente' && endOf(item).getTime() < Date.now()
        ? 'vencido'
        : item.status;

    const eventTitle = (item: ItemCronograma) =>
      `${item.tipo === 'revisao' ? '↻ Revisão · ' : ''}${subjectName(
        item.disciplina_id
      )}${item.conteudo_id ? ' · ' + topicName(item.conteudo_id) : ''}`;

    const relevantConcursos =
      effectiveContestId === 'all'
        ? concursos
        : concursos.filter((c) => c.id === effectiveContestId);

    const examsForDay = (d: string) =>
      relevantConcursos.filter((c) => c.data_prova?.slice(0, 10) === d);

    const stepPeriod = (dir: number) => {
      if (agendaMode === 'semana') {
        setAgendaAnchor(shiftDay(agendaAnchor, 7 * dir));
      } else {
        const dt = parseDay(agendaAnchor);
        dt.setDate(1);
        dt.setMonth(dt.getMonth() + dir);
        setAgendaAnchor(dayKey(dt));
      }
    };

    return (
      <section className="agenda-panel">
        <div className="agenda-toolbar">
          <div className="agenda-date-navigation">
            <button
              type="button"
              className="secondary"
              onClick={() => setAgendaAnchor(dayKey())}
            >
              Hoje
            </button>
            {agendaMode !== 'pipeline' && (
              <>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Período anterior"
                  onClick={() => stepPeriod(-1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Próximo período"
                  onClick={() => stepPeriod(1)}
                >
                  ›
                </button>
              </>
            )}
            <h2>{title}</h2>
          </div>

          <div className="view-switch">
            {(
              [
                ['mes', 'Mês'],
                ['semana', 'Semana'],
                ['pipeline', 'Pipeline'],
              ] as const
            ).map(([m, lbl]) => (
              <button
                key={m}
                type="button"
                className={agendaMode === m ? 'active' : ''}
                onClick={() => setAgendaMode(m)}
              >
                {lbl}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="primary"
            onClick={() => openScheduleModal(agendaAnchor)}
          >
            + Agendar atividade
          </button>
        </div>

        <div className="agenda-filters">
          <label>
            Disciplina
            <select
              value={filters.agenda}
              onChange={(e) =>
                setFilters((f) => ({ ...f, agenda: e.target.value }))
              }
            >
              <option value="">Todas as disciplinas</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </label>
          <span className="subtle">
            {Intl.DateTimeFormat().resolvedOptions().timeZone} · {list.length}{' '}
            atividades agendadas
          </span>
          {selectedCompetition?.data_prova && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setAgendaAnchor(selectedCompetition.data_prova!.slice(0, 10));
                setAgendaMode('mes');
              }}
            >
              Ir à data da prova →
            </button>
          )}
        </div>

        {agendaMode === 'pipeline' ? (
          <div className="pipeline">
            {(['pendente', 'concluido', 'cancelado'] as const).map((st) => {
              const colList = list
                .filter((i) => i.status === st)
                .sort((a, b) =>
                  a.inicio_previsto.localeCompare(b.inicio_previsto)
                );
              return (
                <section key={st} className="pipeline-column">
                  <h3>
                    {renderBadge(st)}
                    <span>{colList.length}</span>
                  </h3>
                  {colList.length ? (
                    colList.map((item) => (
                      <article
                        key={item.id}
                        className={`pipeline-card status-${visualStatus(item)}`}
                      >
                        <button
                          type="button"
                          className="event-title"
                          onClick={() => navigate('estudo', item.id)}
                        >
                          {eventTitle(item)}
                        </button>
                        <p>
                          {dateOnly(dayKey(item.inicio_previsto))} ·{' '}
                          {timeLabel(item.inicio_previsto)}
                        </p>
                        <div className="row-actions">
                          {item.status !== 'concluido' && (
                            <button
                              type="button"
                              onClick={() => openScheduleModal(undefined, item.id)}
                            >
                              Editar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const nextSt =
                                  st === 'concluido' ? 'pendente' : 'concluido';
                                await apiCall(
                                  `itens_cronograma/${item.id}`,
                                  'PATCH',
                                  { status: nextSt }
                                );
                                await refreshData();
                                showToast(
                                  nextSt === 'concluido'
                                    ? 'Atividade do dia concluída.'
                                    : 'Agendamento atualizado.'
                                );
                              } catch (err: any) {
                                showToast(err.message);
                              }
                            }}
                          >
                            {st === 'concluido' ? 'Reabrir' : 'Concluir'}
                          </button>
                          {item.status !== 'concluido' && (
                            <button
                              type="button"
                              className="danger"
                              onClick={() =>
                                handleDelete('itens_cronograma', item.id)
                              }
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="column-empty">
                      Nenhuma atividade nesta etapa.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        ) : agendaMode === 'semana' ? (
          <div className="week-scroll">
            <div className="week-grid">
              <div className="week-head">
                <span className="week-time-label">Hora</span>
                {weekDays(agendaAnchor).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`week-heading ${d === dayKey() ? 'today' : ''}`}
                    title="Agendar atividade neste dia"
                    onClick={() => openScheduleModal(d)}
                  >
                    <small>
                      {new Intl.DateTimeFormat('pt-BR', {
                        weekday: 'short',
                      }).format(parseDay(d))}
                    </small>
                    <strong>{parseDay(d).getDate()}</strong>
                    {examsForDay(d).length > 0 && (
                      <span className="exam-dot" title="Dia da prova">
                        ●
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="week-body">
                <div className="time-axis">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <span key={hour} style={{ top: `${hour * 48}px` }}>
                      {String(hour).padStart(2, '0')}:00
                    </span>
                  ))}
                </div>
                {weekDays(agendaAnchor).map((d) => (
                  <div
                    key={d}
                    className={`week-day ${d === dayKey() ? 'today' : ''}`}
                  >
                    {daySegments(list, d).map((ev, idx) => (
                      <button
                        key={`${ev.item.id}-${idx}`}
                        type="button"
                        className={`week-event status-${visualStatus(ev.item)}`}
                        style={{
                          top: `${ev.startMinute * 0.8}px`,
                          height: `${Math.max(
                            22,
                            (ev.endMinute - ev.startMinute) * 0.8
                          )}px`,
                          left: `${(ev.lane / ev.lanes) * 100}%`,
                          width: `${100 / ev.lanes}%`,
                        }}
                        title={`${eventTitle(ev.item)} · ${timeLabel(
                          ev.item.inicio_previsto
                        )}`}
                        onClick={() => navigate('estudo', ev.item.id)}
                      >
                        <b>{timeLabel(ev.item.inicio_previsto)}</b>
                        <span>{subjectName(ev.item.disciplina_id)}</span>
                        <small>{topicName(ev.item.conteudo_id)}</small>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="month-calendar">
            <div className="month-weekdays">
              {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="month-grid">
              {monthDays(agendaAnchor).map((d) => {
                const currentMonth = parseDay(agendaAnchor).getMonth();
                const events = daySegments(list, d);
                return (
                  <div
                    key={d}
                    className={`month-day ${
                      parseDay(d).getMonth() !== currentMonth ? 'outside' : ''
                    } ${d === dayKey() ? 'today' : ''}`}
                  >
                    <div className="month-day-head">
                      <span>{parseDay(d).getDate()}</span>
                      <button
                        type="button"
                        aria-label={`Agendar atividade em ${dateOnly(d)}`}
                        onClick={() => openScheduleModal(d)}
                      >
                        +
                      </button>
                    </div>
                    {examsForDay(d).map((c) => (
                      <span
                        key={c.id}
                        className="exam-label"
                        title={c.nome}
                      >
                        Prova · {c.nome}
                      </span>
                    ))}
                    {events.slice(0, 3).map((ev, idx) => (
                      <button
                        key={`${ev.item.id}-${idx}`}
                        type="button"
                        className={`month-event status-${visualStatus(ev.item)}`}
                        title={eventTitle(ev.item)}
                        onClick={() => navigate('estudo', ev.item.id)}
                      >
                        <span>{timeLabel(ev.item.inicio_previsto)}</span>{' '}
                        {ev.item.tipo === 'revisao' ? '↻ ' : ''}
                        {subjectName(ev.item.disciplina_id)}
                      </button>
                    ))}
                    {events.length > 3 && (
                      <button
                        type="button"
                        className="more-events"
                        onClick={() => {
                          setAgendaMode('semana');
                          setAgendaAnchor(d);
                        }}
                      >
                        + {events.length - 3} estudos
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  };

  // Settings View
  const renderSettingsView = () => (
    <div className="preferences-layout">
      <section className="panel">
        <div className="panel-heading">
          <h2>Aparência</h2>
        </div>
        <p className="form-help">
          Escolha o tema do aplicativo neste dispositivo.
        </p>
        <div className="theme-options">
          <button
            type="button"
            className="secondary"
            aria-pressed={theme === 'light'}
            onClick={() => applyTheme('light')}
          >
            ☀ Claro
          </button>
          <button
            type="button"
            className="secondary"
            aria-pressed={theme === 'dark'}
            onClick={() => applyTheme('dark')}
          >
            ☾ Escuro
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Pomodoro</h2>
        </div>
        <p className="form-help">Defina os tempos dos próximos ciclos.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPrefError('');
            try {
              const fd = new FormData(e.currentTarget);
              const body = Object.fromEntries(
                [...fd.entries()].map(([k, v]) => [
                  k,
                  Number(v) * (k === 'ciclos_ate_pausa_longa' ? 1 : 60),
                ])
              );
              await apiCall('pomodoro/preferencias', 'PUT', body);
              await refreshData();
              showToast('Configurações salvas.');
            } catch (err: any) {
              setPrefError(err.message);
            }
          }}
        >
          <div className="settings-grid">
            <label>
              Foco (minutos)
              <input
                name="foco_segundos"
                type="number"
                required
                min={1}
                max={180}
                step={1}
                defaultValue={pomodoroSettings.foco_segundos / 60}
              />
            </label>
            <label>
              Pausa curta (minutos)
              <input
                name="pausa_curta_segundos"
                type="number"
                required
                min={1}
                max={60}
                step={1}
                defaultValue={pomodoroSettings.pausa_curta_segundos / 60}
              />
            </label>
            <label>
              Pausa longa (minutos)
              <input
                name="pausa_longa_segundos"
                type="number"
                required
                min={1}
                max={120}
                step={1}
                defaultValue={pomodoroSettings.pausa_longa_segundos / 60}
              />
            </label>
            <label>
              Ciclos até a pausa longa
              <input
                name="ciclos_ate_pausa_longa"
                type="number"
                required
                min={1}
                max={12}
                step={1}
                defaultValue={pomodoroSettings.ciclos_ate_pausa_longa}
              />
            </label>
          </div>
          <button type="submit" className="primary">
            Salvar configurações
          </button>
          <p className="inline-error" role="alert">
            {prefError}
          </p>
        </form>
      </section>
    </div>
  );

  // First Run
  const renderFirstRun = () => (
    <section className="first-study">
      <h2>Sem estudo cadastrado</h2>
      <p>
        Envie seu edital para extrair as matérias e os assuntos, ou cadastre seu
        estudo manualmente para organizar seu cronograma.
      </p>
      <button
        type="button"
        className="primary"
        onClick={() => setPage('cadastro')}
      >
        Cadastrar primeiro estudo
      </button>
    </section>
  );

  // Render Modal Editor
  const renderModal = () => {
    if (!editorState) return null;
    const { resource, id, defaults } = editorState;
    const row: any = id
      ? (resource === 'schedule'
          ? itensCronograma
          : resource === 'concursos'
          ? concursos
          : resource === 'disciplinas'
          ? disciplinas
          : resource === 'conteudos'
          ? conteudos
          : resource === 'anotacoes'
          ? anotacoes
          : disponibilidades
        ).find((r: any) => r.id === id)
      : defaults || {};

    let title = '';
    if (resource === 'concursos')
      title = id ? 'Editar estudo' : 'Cadastrar estudo';
    if (resource === 'disciplinas')
      title = id ? 'Editar disciplina' : 'Adicionar disciplina';
    if (resource === 'conteudos')
      title = id ? 'Editar conteúdo' : 'Adicionar conteúdo';
    if (resource === 'anotacoes')
      title = id ? 'Editar anotação' : 'Nova anotação';
    if (resource === 'disponibilidades')
      title = id ? 'Editar horário disponível' : 'Adicionar horário disponível';
    if (resource === 'settings') title = 'Ajustar Pomodoro';
    if (resource === 'schedule')
      title = id ? 'Editar atividade agendada' : 'Agendar atividade';

    const subOptions = disciplinas.filter(
      (d) => !modalCourseId || d.concurso_id === modalCourseId
    );
    const topOptions = conteudos.filter(
      (c) => !modalSubjectId || c.disciplina_id === modalSubjectId
    );

    const defaultStart = row?.inicio_previsto
      ? localInput(row.inicio_previsto)
      : `${defaults?.day || dayKey()}T19:00`;
    const defaultFinish = row?.inicio_previsto
      ? localInput(endOf(row))
      : `${defaults?.day || dayKey()}T19:50`;

    return (
      <div
        className="modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) setEditorState(null);
        }}
      >
        <div className="modal-box" role="dialog" aria-modal="true">
          <form onSubmit={handleEditorSubmit}>
            <div className="dialog-top">
              <h2>{title}</h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setEditorState(null)}
              >
                ×
              </button>
            </div>

            {resource === 'concursos' && (
              <>
                <label>
                  Nome do estudo
                  <input
                    name="nome"
                    type="text"
                    required
                    maxLength={200}
                    placeholder="Ex.: Tribunal Regional — Técnico"
                    defaultValue={row?.nome || ''}
                  />
                </label>
                <label>
                  Banca (opcional)
                  <input
                    name="banca"
                    type="text"
                    maxLength={200}
                    defaultValue={row?.banca || ''}
                  />
                </label>
                <label>
                  Data da prova (opcional)
                  <input
                    name="data_prova"
                    type="date"
                    defaultValue={row?.data_prova?.slice(0, 10) || ''}
                  />
                </label>
                <label>
                  Fuso dos horários disponíveis
                  <select
                    name="fuso_horario"
                    defaultValue={row?.fuso_horario || 'America/Sao_Paulo'}
                  >
                    {[
                      'America/Sao_Paulo',
                      'America/Manaus',
                      'America/Rio_Branco',
                      'America/Belem',
                      'America/Noronha',
                    ].map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {resource === 'disciplinas' && (
              <>
                <label>
                  Nome da disciplina
                  <input
                    name="nome"
                    type="text"
                    required
                    maxLength={200}
                    defaultValue={row?.nome || ''}
                  />
                </label>
                <label>
                  Peso no edital
                  <input
                    name="peso"
                    type="number"
                    required
                    min={1}
                    max={100}
                    step={1}
                    defaultValue={row?.peso || 1}
                  />
                </label>
                <label>
                  Descrição (opcional)
                  <textarea
                    name="descricao"
                    maxLength={5000}
                    defaultValue={row?.descricao || ''}
                  />
                </label>
              </>
            )}

            {resource === 'conteudos' && (
              <>
                <label>
                  Título do conteúdo
                  <input
                    name="titulo"
                    type="text"
                    required
                    maxLength={200}
                    defaultValue={row?.titulo || ''}
                  />
                </label>
                <label>
                  Descrição / material de estudo
                  <textarea
                    name="descricao"
                    maxLength={5000}
                    defaultValue={row?.descricao || ''}
                  />
                </label>
                {id && (
                  <label>
                    Situação
                    <select
                      name="status"
                      defaultValue={row?.status || 'pendente'}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_estudo">Em estudo</option>
                      <option value="concluido">Concluído</option>
                    </select>
                  </label>
                )}
              </>
            )}

            {resource === 'anotacoes' && (
              <>
                <label>
                  Estudo
                  <select
                    name="concurso_id"
                    value={modalCourseId}
                    onChange={(e) => {
                      setModalCourseId(e.target.value);
                      setModalSubjectId('');
                    }}
                  >
                    <option value="">Anotação livre</option>
                    {concursos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Disciplina
                  <select
                    name="disciplina_id"
                    value={modalSubjectId}
                    onChange={(e) => setModalSubjectId(e.target.value)}
                  >
                    <option value="">Opcional</option>
                    {subOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Conteúdo
                  <select
                    name="conteudo_id"
                    defaultValue={row?.conteudo_id || ''}
                  >
                    <option value="">Opcional</option>
                    {topOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titulo}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Título
                  <input
                    name="titulo"
                    type="text"
                    required
                    maxLength={200}
                    defaultValue={row?.titulo || ''}
                  />
                </label>
                <label>
                  Sua anotação
                  <textarea
                    name="corpo"
                    maxLength={30000}
                    required
                    defaultValue={row?.corpo || ''}
                  />
                </label>
              </>
            )}

            {resource === 'disponibilidades' && (
              <>
                {id ? (
                  <label>
                    Dia da semana
                    <select
                      name="dia_semana"
                      defaultValue={String(row?.dia_semana ?? 1)}
                    >
                      {[
                        'Domingo',
                        'Segunda-feira',
                        'Terça-feira',
                        'Quarta-feira',
                        'Quinta-feira',
                        'Sexta-feira',
                        'Sábado',
                      ].map((dName, idx) => (
                        <option key={idx} value={String(idx)}>
                          {dName}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <fieldset className="availability-days">
                    <legend>Dias da semana</legend>
                    <p className="form-help">
                      Selecione os dias que terão o mesmo horário.
                    </p>
                    <div>
                      {[
                        'Domingo',
                        'Segunda-feira',
                        'Terça-feira',
                        'Quarta-feira',
                        'Quinta-feira',
                        'Sexta-feira',
                        'Sábado',
                      ].map((dName, idx) => (
                        <label key={idx}>
                          <input
                            type="checkbox"
                            name="dias_semana"
                            value={idx}
                          />
                          {dName}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
                <label>
                  Das
                  <input
                    name="horario_inicio"
                    type="time"
                    required
                    defaultValue={row?.horario_inicio?.slice(0, 5) || '19:00'}
                  />
                </label>
                <label>
                  Até
                  <input
                    name="horario_fim"
                    type="time"
                    required
                    defaultValue={row?.horario_fim?.slice(0, 5) || '21:00'}
                  />
                </label>
              </>
            )}

            {resource === 'settings' && (
              <div className="settings-grid">
                <label>
                  Foco (min)
                  <input
                    name="foco_segundos"
                    type="number"
                    required
                    min={1}
                    max={180}
                    defaultValue={pomodoroSettings.foco_segundos / 60}
                  />
                </label>
                <label>
                  Pausa curta (min)
                  <input
                    name="pausa_curta_segundos"
                    type="number"
                    required
                    min={1}
                    max={60}
                    defaultValue={pomodoroSettings.pausa_curta_segundos / 60}
                  />
                </label>
                <label>
                  Pausa longa (min)
                  <input
                    name="pausa_longa_segundos"
                    type="number"
                    required
                    min={1}
                    max={120}
                    defaultValue={pomodoroSettings.pausa_longa_segundos / 60}
                  />
                </label>
                <label>
                  Focos até pausa longa
                  <input
                    name="ciclos_ate_pausa_longa"
                    type="number"
                    required
                    min={1}
                    max={12}
                    defaultValue={pomodoroSettings.ciclos_ate_pausa_longa}
                  />
                </label>
              </div>
            )}

            {resource === 'schedule' && (
              <>
                <label>
                  Estudo
                  <select
                    name="concurso_id"
                    required
                    disabled={Boolean(id)}
                    value={modalCourseId}
                    onChange={(e) => {
                      setModalCourseId(e.target.value);
                      setModalSubjectId('');
                    }}
                  >
                    <option value="">Selecione</option>
                    {concursos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Disciplina
                  <select
                    name="disciplina_id"
                    required
                    value={modalSubjectId}
                    onChange={(e) => setModalSubjectId(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {subOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Conteúdo
                  <select
                    name="conteudo_id"
                    defaultValue={row?.conteudo_id || ''}
                  >
                    <option value="">
                      Estudar a disciplina sem conteúdo específico
                    </option>
                    {topOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titulo}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="settings-grid">
                  <label>
                    Início do estudo
                    <input
                      name="inicio_previsto"
                      type="datetime-local"
                      required
                      defaultValue={defaultStart}
                    />
                  </label>
                  <label>
                    Fim do estudo
                    <input
                      name="fim_previsto"
                      type="datetime-local"
                      required
                      defaultValue={defaultFinish}
                    />
                  </label>
                </div>
              </>
            )}

            <p id="form-error" role="alert">
              {editorError}
            </p>
            <button type="submit" className="primary" disabled={editorBusy}>
              {resource === 'schedule' ? 'Salvar agendamento' : 'Salvar'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  if (authChecking) {
    return null;
  }

  // Auth Screen
  if (!user) {
    return (
      <>
        {toastMsg && (
          <div id="toast" role="status" aria-live="polite">
            {toastMsg}
          </div>
        )}
        <div id="auth" className="auth">
          <button
            type="button"
            className="theme-toggle"
            aria-label="Alternar tema"
            title="Alternar tema"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>

          <div className="auth-story">
            <a className="brand" href="http://localhost:3001">
              revi<span>sumo</span>
              <span className="brand-dot">.</span>
            </a>
            <div className="auth-story-main">
              <h1>
                Organize seu edital.
                <br />
                Estude no seu <em>ritmo.</em>
              </h1>
              <p>
                Planejamento, revisões e foco reunidos em um só lugar.
              </p>
            </div>
            <div className="story-foot">Revisumo</div>
          </div>

          <div className="auth-form">
            <h2 id="auth-title">
              {registering ? 'Criar conta' : 'Entrar'}
            </h2>
            <p id="auth-sub">
              {registering
                ? 'Preencha seus dados para começar.'
                : 'Acesse seu espaço de estudos.'}
            </p>
            <form id="auth-form" onSubmit={handleAuthSubmit}>
              {registering && (
                <label>
                  Seu nome
                  <input
                    name="nome"
                    maxLength={120}
                    autoComplete="name"
                    required
                  />
                </label>
              )}
              <label>
                E-mail
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="voce@exemplo.com"
                />
              </label>
              <label>
                Senha
                <input
                  name="senha"
                  type="password"
                  autoComplete={registering ? 'new-password' : 'current-password'}
                  required
                  minLength={8}
                  maxLength={128}
                  placeholder="Pelo menos 8 caracteres"
                />
              </label>
              <button className="primary" id="auth-submit" disabled={authBusy}>
                {registering ? 'Criar conta' : 'Entrar'}
              </button>
              <p id="auth-error" role="alert">
                {authError}
              </p>
            </form>
            <button
              type="button"
              className="text-button"
              id="toggle-auth"
              onClick={() => {
                setRegistering((r) => !r);
                setAuthError('');
              }}
            >
              {registering ? 'Já tenho conta' : 'Criar uma conta'}
            </button>
          </div>
        </div>
      </>
    );
  }

  const pageTitle = pageTitles[page];

  const allAllowed = ['dashboard', 'agenda', 'anotacoes'].includes(page);
  const showContestContext =
    !['cadastro', 'estudo', 'configuracoes'].includes(page) &&
    concursos.length > 0;

  const navItems: Array<{ id: PageName; label: string; icon: React.ReactNode }> = [
    {
      id: 'dashboard',
      label: 'Hoje',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
    {
      id: 'cadastro',
      label: 'Estudos',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      id: 'cronograma',
      label: 'Cronograma',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
    },
    {
      id: 'anotacoes',
      label: 'Anotações',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      ),
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {toastMsg && (
        <div id="toast" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}

      <div id="workspace" data-page={page}>
        <aside>
          <a className="brand" href="http://localhost:3001">
            revi<span>sumo</span>
            <span className="brand-dot">.</span>
          </a>
          <nav aria-label="Navegação principal">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  (page === 'estudo' ? 'dashboard' : page) === item.id
                    ? 'selected'
                    : ''
                }
                onClick={() => setPage(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="aside-footer">
            <span className="profile">
              <b id="avatar">{user.nome[0]?.toUpperCase() || 'E'}</b>
              <span id="username">{user.nome}</span>
            </span>
            <button
              type="button"
              id="logout"
              className="logout-icon"
              onClick={handleLogout}
            >
              Sair
            </button>
          </div>
        </aside>

        <main>
          <header className="top-bar">
            <div className="top-bar-title">
              <h1 id="page-title">{pageTitle}</h1>
              {page === 'dashboard' && (
                <span className="top-bar-date">
                  {new Intl.DateTimeFormat('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  }).format(new Date())}
                </span>
              )}
            </div>

            <div className="top-bar-controls">
              {showContestContext && (
                <div id="contest-context" className="study-switcher">
                  <select
                    aria-label="Estudo em foco"
                    value={effectiveContestId}
                    onChange={(e) => setContest(e.target.value)}
                  >
                    {allAllowed && <option value="all">Todos os estudos</option>}
                    {concursos.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                className="theme-toggle"
                aria-label="Alternar tema"
                title="Alternar tema"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? '☀' : '☾'}
              </button>
            </div>
          </header>

          {activeSession && page !== 'estudo' && (
            <div className="active-focus-banner">
              <span>
                ●{' '}
                {activeSession.status === 'pausada'
                  ? 'Foco pausado'
                  : 'Foco em andamento'}{' '}
                · {subjectName(activeSession.disciplina_id)}
                <b>
                  {stopwatch(
                    Math.max(
                      0,
                      activeSession.duracao_planejada_segundos -
                        sessionElapsed(activeSession, nowTick)
                    )
                  )}
                </b>
              </span>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  if (activeSession.item_cronograma_id) {
                    navigate('estudo', activeSession.item_cronograma_id);
                  } else if (activeSession.disciplina_id) {
                    setStudyId('');
                    setStudySubjectId(activeSession.disciplina_id);
                    setStudyTopicId(activeSession.conteudo_id || '');
                    setPage('estudo');
                  }
                }}
              >
                Abrir sessão →
              </button>
            </div>
          )}

          <div id="page">
            {!concursos.length && !['cadastro', 'configuracoes'].includes(page)
              ? renderFirstRun()
              : page === 'dashboard'
              ? renderDashboard()
              : page === 'cadastro'
              ? renderRegistration()
              : page === 'cronograma'
              ? renderSchedule()
              : page === 'anotacoes'
              ? renderNotesView()
              : page === 'agenda'
              ? renderAgenda()
              : page === 'configuracoes'
              ? renderSettingsView()
              : renderStudyView()}
          </div>
        </main>
      </div>

      {renderModal()}
    </>
  );
};

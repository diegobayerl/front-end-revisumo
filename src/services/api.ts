import {
  User,
  Estudo,
  Disciplina,
  Conteudo,
  Disponibilidade,
  Atividade,
  PomodoroSession,
  PomodoroPrefs,
  Anotacao,
  EditalPreview,
  ScheduleAIPreview,
} from '../types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api/${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    let errorMsg = data?.error;
    if (!errorMsg) {
      if ([500, 502, 503, 504].includes(response.status)) {
        errorMsg = 'Não foi possível conectar ao servidor. Tente novamente em instantes.';
      } else {
        errorMsg = response.statusText || 'Erro na requisição';
      }
    }
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  auth: {
    me: () => request<User>('me'),
    login: (credentials: { email: string; senha: string }) =>
      request<{ ok: boolean }>('auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    cadastro: (payload: { nome: string; email: string; senha: string }) =>
      request<{ ok: boolean }>('auth/cadastro', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    logout: () =>
      request<{ ok: boolean }>('auth/logout', {
        method: 'POST',
      }),
  },

  estudos: {
    list: () => request<Estudo[]>('estudos'),
    create: (data: Partial<Estudo>) =>
      request<Estudo>('estudos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Estudo>) =>
      request<Estudo>(`estudos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`estudos/${id}`, { method: 'DELETE' }),
  },

  disciplinas: {
    list: (concursoId?: string) =>
      request<Disciplina[]>(concursoId ? `disciplinas?concurso_id=${concursoId}` : 'disciplinas'),
    create: (data: Partial<Disciplina>) =>
      request<Disciplina>('disciplinas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Disciplina>) =>
      request<Disciplina>(`disciplinas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`disciplinas/${id}`, { method: 'DELETE' }),
  },

  conteudos: {
    list: (disciplinaId?: string) =>
      request<Conteudo[]>(disciplinaId ? `conteudos?disciplina_id=${disciplinaId}` : 'conteudos'),
    create: (data: Partial<Conteudo>) =>
      request<Conteudo>('conteudos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Conteudo>) =>
      request<Conteudo>(`conteudos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`conteudos/${id}`, { method: 'DELETE' }),
  },

  disponibilidades: {
    list: (concursoId?: string) =>
      request<Disponibilidade[]>(
        concursoId ? `disponibilidades?concurso_id=${concursoId}` : 'disponibilidades'
      ),
    create: (data: Partial<Disponibilidade>) =>
      request<Disponibilidade>('disponibilidades', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`disponibilidades/${id}`, { method: 'DELETE' }),
  },

  atividades: {
    list: (concursoId?: string) =>
      request<Atividade[]>(concursoId ? `itens_cronograma?concurso_id=${concursoId}` : 'itens_cronograma'),
    create: (data: Partial<Atividade>) =>
      request<Atividade>('itens_cronograma', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Atividade>) =>
      request<Atividade>(`itens_cronograma/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`itens_cronograma/${id}`, { method: 'DELETE' }),
  },

  planejamento: {
    quickSchedule: (payload: {
      concurso_id: string;
      disciplina_id?: string | null;
      nova_disciplina?: { nome: string; peso: number; descricao?: string };
      conteudo_id?: string | null;
      novo_conteudo?: { titulo: string; descricao?: string };
      inicio_previsto: string;
      duracao_segundos: number;
    }) =>
      request<Atividade>('planejamento', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  ia: {
    uploadEdital: async (file: File, cargo: string) => {
      const response = await fetch(`/api/ia/edital?cargo=${encodeURIComponent(cargo)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
        },
        body: file,
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao analisar o edital com IA.');
      }
      return data as EditalPreview;
    },
    confirmarEdital: (edital: EditalPreview) =>
      request<Estudo>('ia/edital/confirmar', {
        method: 'POST',
        body: JSON.stringify(edital),
      }),
    cronogramaPrevia: (payload: {
      concurso_id: string;
      inicio: string;
      fim: string;
      duracao_minutos: number;
    }) =>
      request<ScheduleAIPreview>('ia/cronograma/previa', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    cronogramaConfirmar: (payload: {
      concurso_id: string;
      inicio: string;
      fim: string;
      duracao_minutos: number;
      atividades: any[];
    }) =>
      request<{ criados: number }>('ia/cronograma/confirmar', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  pomodoro: {
    getActive: () => request<PomodoroSession | null>('pomodoro/ativa'),
    start: (payload: {
      item_cronograma_id?: string | null;
      disciplina_id?: string | null;
      conteudo_id?: string | null;
      fase?: 'foco' | 'pausa_curta' | 'pausa_longa';
      duracao_segundos?: number;
    }) =>
      request<PomodoroSession>('pomodoro/iniciar', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    pause: () => request<PomodoroSession>('pomodoro/pausar', { method: 'POST' }),
    resume: () => request<PomodoroSession>('pomodoro/retomar', { method: 'POST' }),
    finish: () => request<PomodoroSession>('pomodoro/concluir', { method: 'POST' }),
    cancel: () => request<PomodoroSession>('pomodoro/cancelar', { method: 'POST' }),
    getHistory: (offset = 0) =>
      request<PomodoroSession[]>(`pomodoro/historico?offset=${offset}`),
    getPrefs: () => request<PomodoroPrefs>('pomodoro/preferencias'),
    updatePrefs: (prefs: Partial<PomodoroPrefs>) =>
      request<PomodoroPrefs>('pomodoro/preferencias', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      }),
  },

  anotacoes: {
    list: (concursoId?: string) =>
      request<Anotacao[]>(concursoId ? `anotacoes?concurso_id=${concursoId}` : 'anotacoes'),
    create: (data: Partial<Anotacao>) =>
      request<Anotacao>('anotacoes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Anotacao>) =>
      request<Anotacao>(`anotacoes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`anotacoes/${id}`, { method: 'DELETE' }),
  },
};

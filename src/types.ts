export interface User {
  id: string;
  nome: string;
  email: string;
}

export interface Estudo {
  id: string;
  usuario_id?: string;
  nome: string;
  banca?: string;
  data_prova?: string | null;
  fuso_horario?: string;
  criado_em?: string;
}

export interface Disciplina {
  id: string;
  concurso_id: string;
  nome: string;
  peso: number;
  descricao?: string;
}

export interface Conteudo {
  id: string;
  disciplina_id: string;
  titulo: string;
  descricao?: string;
  referencias_legais?: Array<{
    lei: string;
    artigos: string[];
    origem: 'edital' | 'sugestao';
  }>;
}

export interface Disponibilidade {
  id: string;
  concurso_id: string;
  dia_semana: number; // 0 = Domingo, 1 = Segunda, etc.
  horario_inicio: string; // HH:MM
  horario_fim: string; // HH:MM
}

export interface Atividade {
  id: string;
  concurso_id: string;
  cronograma_id?: string;
  disciplina_id: string;
  conteudo_id?: string | null;
  inicio_previsto: string;
  duracao_segundos: number;
  status: 'pendente' | 'concluido' | 'cancelado';
}

export interface PomodoroSession {
  id: string;
  item_cronograma_id?: string | null;
  disciplina_id?: string | null;
  conteudo_id?: string | null;
  titulo: string;
  fase: 'foco' | 'pausa_curta' | 'pausa_longa';
  status: 'em_andamento' | 'pausado' | 'concluido' | 'cancelado';
  iniciada_em: string;
  retomada_em?: string;
  tempo_acumulado_segundos: number;
  duracao_planejada_segundos: number;
}

export interface PomodoroPrefs {
  duracao_foco_segundos: number;
  duracao_pausa_curta_segundos: number;
  duracao_pausa_longa_segundos: number;
  ciclos_para_pausa_longa: number;
}

export interface Anotacao {
  id: string;
  concurso_id: string;
  disciplina_id?: string | null;
  conteudo_id?: string | null;
  titulo: string;
  texto: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface EditalPreview {
  nome: string;
  banca: string;
  data_prova: string | null;
  observacoes: string;
  disciplinas: Array<{
    nome: string;
    peso: number;
    conteudos: Array<{
      titulo: string;
      descricao: string;
      referencias?: Array<{
        lei: string;
        artigos: string[];
        origem: 'edital' | 'sugestao';
      }>;
    }>;
  }>;
}

export interface ScheduleAIPreview {
  estudo_id: string;
  resumo: {
    total_blocos: number;
    total_estudos_iniciais: number;
    total_revisoes: number;
    conteudos_nao_atendidos: number;
    revisoes_nao_atendidas: number;
  };
  atividades: Array<{
    disciplina_id: string;
    conteudo_id: string;
    disciplina_nome?: string;
    conteudo_titulo?: string;
    tipo: 'estudo_inicial' | 'revisao_1' | 'revisao_7' | 'revisao_30' | 'revisao_recorrente' | 'reforco_final';
    inicio_previsto: string;
    duracao_segundos: number;
  }>;
  nao_atendidos: Array<{
    conteudo_id: string;
    disciplina_nome: string;
    conteudo_titulo: string;
  }>;
}

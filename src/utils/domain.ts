export function dayKey(value: string | number | Date = new Date()): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function parseDay(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function shiftDay(value: string, amount: number): string {
  const date = parseDay(value);
  date.setDate(date.getDate() + amount);
  return dayKey(date);
}

export function weekDays(value: string): string[] {
  const date = parseDay(value);
  const first = shiftDay(value, -((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => shiftDay(first, index));
}

export function monthDays(value: string): string[] {
  const date = parseDay(value);
  date.setDate(1);
  const first = weekDays(dayKey(date))[0];
  return Array.from({ length: 42 }, (_, index) => shiftDay(first, index));
}

export function endOf(item: { inicio_previsto: string; duracao_segundos: number }): Date {
  return new Date(new Date(item.inicio_previsto).getTime() + item.duracao_segundos * 1000);
}

export function scheduledForDay<T extends { id: string; inicio_previsto: string }>(
  items: T[],
  day: string
): T[] {
  return items
    .filter((item) => dayKey(item.inicio_previsto) === day)
    .sort(
      (a, b) =>
        a.inicio_previsto.localeCompare(b.inicio_previsto) || a.id.localeCompare(b.id)
    );
}

export function dailySummary<
  T extends { id: string; inicio_previsto: string; duracao_segundos: number; status: string }
>(items: T[], day: string) {
  const all = scheduledForDay(items, day);
  const scheduled = all.filter((item) => item.status !== 'cancelado');
  return {
    items: all,
    pending: scheduled.filter((item) => item.status === 'pendente'),
    completed: scheduled.filter((item) => item.status === 'concluido'),
    seconds: scheduled.reduce((sum, item) => sum + item.duracao_segundos, 0),
  };
}

export function sessionElapsed(
  session: {
    status: string;
    retomada_em?: string | null;
    iniciada_em: string;
    duracao_planejada_segundos: number;
    tempo_acumulado_segundos: number;
  },
  now = Date.now()
): number {
  const current =
    session.status === 'em_andamento'
      ? Math.max(
          0,
          Math.floor(
            (now - new Date(session.retomada_em || session.iniciada_em).getTime()) / 1000
          )
        )
      : 0;
  return Math.min(
    session.duracao_planejada_segundos,
    session.tempo_acumulado_segundos + current
  );
}

export interface DaySegment<T> {
  item: T;
  startMinute: number;
  endMinute: number;
  lane: number;
  lanes: number;
}

export function daySegments<T extends { inicio_previsto: string; duracao_segundos: number }>(
  items: T[],
  day: string
): DaySegment<T>[] {
  const date = parseDay(day);
  date.setHours(0, 0, 0, 0);
  const start = date.getTime();
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const finish = next.getTime();

  const minute = (value: number) =>
    value <= start
      ? 0
      : value >= finish
      ? 1440
      : new Date(value).getHours() * 60 +
        new Date(value).getMinutes() +
        new Date(value).getSeconds() / 60;

  const segments = items
    .map((item) => {
      const from = Math.max(start, new Date(item.inicio_previsto).getTime());
      const to = Math.min(finish, endOf(item).getTime());
      return from < to
        ? { item, startMinute: minute(from), endMinute: minute(to), lane: 0, lanes: 1 }
        : null;
    })
    .filter((seg): seg is DaySegment<T> => Boolean(seg))
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);

  let group: DaySegment<T>[] = [];
  let maximum = -1;
  const result: DaySegment<T>[] = [];

  function flush() {
    const lanes: number[] = [];
    for (const event of group) {
      let lane = lanes.findIndex((end) => end <= event.startMinute);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = event.endMinute;
      event.lane = lane;
    }
    result.push(...group.map((event) => ({ ...event, lanes: lanes.length || 1 })));
    group = [];
  }

  for (const event of segments) {
    if (group.length && event.startMinute >= maximum) {
      flush();
      maximum = -1;
    }
    group.push(event);
    maximum = Math.max(maximum, event.endMinute);
  }
  flush();
  return result;
}

export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value));

export const timeLabel = (value: string | Date) =>
  new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export const stamp = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value)
  );

export const dateOnly = (value?: string | null) =>
  value ? value.slice(0, 10).split('-').reverse().join('/') : 'A definir';

export function duration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ' ' + (minutes % 60) + 'min' : ''}`
    : `${minutes} min`;
}

export function stopwatch(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export const statusLabel: Record<string, string> = {
  pendente: 'Pendente',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  em_estudo: 'Em estudo',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const phaseLabel: Record<string, string> = {
  foco: 'Foco',
  pausa_curta: 'Pausa curta',
  pausa_longa: 'Pausa longa',
};

export function localInput(value: string | Date): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
}

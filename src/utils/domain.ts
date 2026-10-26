import type { Atividade, PomodoroSession } from '../types.ts';

export function dayKey(value: Date | string = new Date()): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

export function scheduledForDay(items: Atividade[], day: string): Atividade[] {
  return items
    .filter((item) => dayKey(item.inicio_previsto) === day)
    .sort((a, b) => a.inicio_previsto.localeCompare(b.inicio_previsto) || a.id.localeCompare(b.id));
}

export function dailySummary(items: Atividade[], day: string) {
  const all = scheduledForDay(items, day);
  const scheduled = all.filter((item) => item.status !== 'cancelado');
  return {
    items: all,
    pending: scheduled.filter((item) => item.status === 'pendente'),
    completed: scheduled.filter((item) => item.status === 'concluido'),
    seconds: scheduled.reduce((sum, item) => sum + item.duracao_segundos, 0),
  };
}

export function sessionElapsed(session: PomodoroSession, now = Date.now()): number {
  const current =
    session.status === 'em_andamento'
      ? Math.max(0, Math.floor((now - new Date(session.retomada_em || session.iniciada_em).getTime()) / 1000))
      : 0;
  return Math.min(session.duracao_planejada_segundos, session.tempo_acumulado_segundos + current);
}

export interface DaySegment {
  item: Atividade;
  startMinute: number;
  endMinute: number;
  lane: number;
  lanes: number;
}

export function daySegments(items: Atividade[], day: string): DaySegment[] {
  const date = parseDay(day);
  date.setHours(0, 0, 0, 0);
  const start = date.getTime();
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  const finish = next.getTime();

  const minute = (val: number) =>
    val <= start ? 0 : val >= finish ? 1440 : new Date(val).getHours() * 60 + new Date(val).getMinutes() + new Date(val).getSeconds() / 60;

  const rawSegments = items
    .map((item) => {
      const from = Math.max(start, new Date(item.inicio_previsto).getTime());
      const to = Math.min(finish, endOf(item).getTime());
      return from < to ? { item, startMinute: minute(from), endMinute: minute(to), lane: 0, lanes: 1 } : null;
    })
    .filter((s): s is DaySegment => s !== null)
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);

  let group: DaySegment[] = [];
  let maximum = -1;
  const result: DaySegment[] = [];

  function flush() {
    const lanes: number[] = [];
    for (const event of group) {
      let lane = lanes.findIndex((end) => end <= event.startMinute);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = event.endMinute;
      event.lane = lane;
    }
    result.push(...group.map((event) => ({ ...event, lanes: lanes.length })));
    group = [];
  }

  for (const event of rawSegments) {
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

export function formatSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`.trim();
  }
  return `${minutes} min`;
}

export function formatTimeHM(isoDate: string): string {
  const d = new Date(isoDate);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

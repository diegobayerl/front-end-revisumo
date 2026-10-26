import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as domain from '../lib/domain.js';

const start = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
const item = (id, day, hour, status = 'pendente', minutes = 50) => ({
  id,
  inicio_previsto: start(day, hour),
  duracao_segundos: minutes * 60,
  status,
});

test('Dashboard mostra somente os estudos do dia e separa pendentes de concluídos', () => {
  const rows = [
    item('hoje', 22, 10),
    item('concluido', 22, 13, 'concluido'),
    item('amanha', 23, 10),
    item('ontem', 21, 10),
    item('cancelado', 22, 15, 'cancelado'),
  ];
  const summary = domain.dailySummary(rows, '2026-10-22');
  assert.deepEqual(summary.pending.map((row) => row.id), ['hoje']);
  assert.deepEqual(summary.completed.map((row) => row.id), ['concluido']);
  assert.equal(summary.seconds, 6000);
});

test('Agenda gera mês e semana sem deslocar as datas e divide estudos na meia-noite', () => {
  const days = domain.monthDays('2026-10-22');
  assert.equal(days.length, 42);
  assert.equal(days[0], '2026-09-28');
  assert.deepEqual(domain.weekDays('2026-10-22'), [
    '2026-10-19',
    '2026-10-20',
    '2026-10-21',
    '2026-10-22',
    '2026-10-23',
    '2026-10-24',
    '2026-10-25',
  ]);
  const night = { id: 'noturno', inicio_previsto: start(22, 23, 30), duracao_segundos: 7200, status: 'pendente' };
  assert.equal(domain.daySegments([night], '2026-10-22')[0].endMinute, 1440);
  assert.equal(domain.daySegments([night], '2026-10-23')[0].startMinute, 0);
  assert.equal(domain.daySegments([night], '2026-10-23')[0].endMinute, 90);
  assert.equal(domain.daySegments([night], '2026-10-24').length, 0);
});

test('Eventos sobrepostos ficam lado a lado na agenda semanal', () => {
  const rows = [
    item('primeiro', 22, 10, 'pendente', 120),
    item('segundo', 22, 11, 'pendente', 120),
    item('depois', 22, 13, 'pendente', 60),
  ];
  const segments = domain.daySegments(rows, '2026-10-22');
  assert.equal(segments[0].lanes, 2);
  assert.equal(segments[1].lanes, 2);
  assert.notEqual(segments[0].lane, segments[1].lane);
  assert.equal(segments[2].lanes, 1);
});

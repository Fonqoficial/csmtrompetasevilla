// src/lib/tracks.ts
// Agrupa las filas de `tracks` (un movimiento por fila) en obras.
// Título esperado: "Obra - I. Movimiento". Si no hay guion pero sí número romano
// ("Sonata in D major I. Allegro"), también se separa. Sin ninguno, es una obra de un solo movimiento.

export interface TrackRow {
  id: string;
  title: string;
  composer: string;
  audio_key: string | null;
  score_key: string | null;
  created_at: string;
}

export interface Movement {
  id: string;
  mov: string;
  title: string;
}

export interface Work {
  work: string;
  composer: string;
  scoreId: string | null; // id de una pista de la obra que tenga partitura
  movements: Movement[];
}

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 } as const;

// Quita caracteres invisibles (algunos títulos traen espacios de ancho cero).
const clean = (s: string) => s.replace(/[​-‍﻿]/g, '').replace(/\s+/g, ' ').trim();

export function splitTitle(raw: string): { work: string; mov: string } {
  const t = clean(raw);
  const parts = t.split(/\s+-\s+/);
  if (parts.length > 1) return { work: parts[0], mov: parts.slice(1).join(' - ') };
  const m = t.match(/^(.*?)\s+((?:IX|X|VIII|VII|VI|IV|V|III|II|I)\.\s.*)$/);
  if (m) return { work: m[1], mov: m[2] };
  return { work: t, mov: '' };
}

function movementNumber(mov: string): number {
  const m = mov.match(/^(IX|X|VIII|VII|VI|IV|V|III|II|I)\./);
  return m ? ROMAN[m[1] as keyof typeof ROMAN] : 0;
}

export function groupTracks(rows: TrackRow[]): Work[] {
  const groups = new Map<string, Work & { order: Map<string, number> }>();

  rows.forEach((row, i) => {
    if (!row.audio_key) return; // sin archivo no hay nada que reproducir
    const { work, mov } = splitTitle(row.title);
    const composer = clean(row.composer);
    const key = `${composer}|${work}`;
    let g = groups.get(key);
    if (!g) {
      g = { work, composer, scoreId: null, movements: [], order: new Map() };
      groups.set(key, g);
    }
    if (row.score_key && !g.scoreId) g.scoreId = row.id;
    g.movements.push({ id: row.id, mov, title: row.title });
    g.order.set(row.id, movementNumber(mov) || 100 + i);
  });

  return [...groups.values()]
    .map(({ order, ...g }) => ({
      ...g,
      movements: g.movements.sort((a, b) => order.get(a.id)! - order.get(b.id)!),
    }))
    .sort((a, b) => a.composer.localeCompare(b.composer, 'es') || a.work.localeCompare(b.work, 'es'));
}

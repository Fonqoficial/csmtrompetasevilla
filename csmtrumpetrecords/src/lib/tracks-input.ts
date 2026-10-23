// src/lib/tracks-input.ts
// Validación de los datos que llegan del panel de administración.
import { OBJECT_KEY_RE } from './r2';

export interface TrackFields {
  title?: string;
  composer?: string;
  category?: string | null;
  source_credit?: string | null;
  is_published?: boolean;
  audio_key?: string;
  score_key?: string | null;
}

type Result = { fields: TrackFields; error?: undefined } | { fields?: undefined; error: string };

const text = (v: unknown, max: number): string | null =>
  typeof v === 'string' ? v.replace(/[​-‍﻿]/g, '').trim().slice(0, max) : null;

/**
 * Convierte el cuerpo JSON en campos válidos de `tracks`.
 * - create: exige título, compositor y audio.
 * - cualquier otro campo se ignora (no se puede tocar id, created_at, etc.).
 */
export function parseTrackFields(body: Record<string, unknown>, mode: 'create' | 'update'): Result {
  const f: TrackFields = {};

  if ('title' in body) {
    const v = text(body.title, 200);
    if (!v) return { error: 'El título es obligatorio.' };
    f.title = v;
  }
  if ('composer' in body) {
    const v = text(body.composer, 120);
    if (!v) return { error: 'El compositor es obligatorio.' };
    f.composer = v;
  }
  if ('category' in body) f.category = text(body.category, 60) || null;
  if ('source_credit' in body) f.source_credit = text(body.source_credit, 300) || null;
  if ('is_published' in body) {
    if (typeof body.is_published !== 'boolean') return { error: 'is_published debe ser verdadero o falso.' };
    f.is_published = body.is_published;
  }
  if ('audio_key' in body) {
    if (typeof body.audio_key !== 'string' || !OBJECT_KEY_RE.test(body.audio_key)) {
      return { error: 'Clave de audio no válida.' };
    }
    f.audio_key = body.audio_key;
  }
  if ('score_key' in body) {
    if (body.score_key !== null && (typeof body.score_key !== 'string' || !OBJECT_KEY_RE.test(body.score_key))) {
      return { error: 'Clave de partitura no válida.' };
    }
    f.score_key = body.score_key as string | null;
  }

  if (mode === 'create' && (!f.title || !f.composer || !f.audio_key)) {
    return { error: 'Faltan título, compositor o archivo de audio.' };
  }
  if (mode === 'update' && Object.keys(f).length === 0) {
    return { error: 'No hay cambios que guardar.' };
  }
  return { fields: f };
}

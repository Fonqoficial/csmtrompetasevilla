// src/pages/api/tracks/[id].ts
//   PATCH  /api/tracks/<id>  -> edita datos, publica/oculta, cambia o quita la partitura/audio
//   DELETE /api/tracks/<id>  -> borra la pista y sus archivos de R2
// Solo administradores. Se usa el cliente con el token del usuario, así que RLS se aplica también.
import type { APIRoute } from 'astro';
import { json, readJson, requireAdmin } from '../../../lib/auth';
import { deleteR2Objects } from '../../../lib/r2';
import { parseTrackFields } from '../../../lib/tracks-input';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const id = params.id ?? '';
  if (!UUID.test(id)) return json({ error: 'Identificador no válido.' }, 400);

  const body = await readJson(request);
  if (!body) return json({ error: 'Petición no válida.' }, 400);

  const parsed = parseTrackFields(body, 'update');
  if (!parsed.fields) return json({ error: parsed.error }, 400);
  const fields = parsed.fields;

  const { data: before, error: readError } = await locals.supabase
    .from('tracks')
    .select('id, audio_key, score_key')
    .eq('id', id)
    .maybeSingle();
  if (readError || !before) return json({ error: 'Pista no encontrada.' }, 404);

  const { data: after, error } = await locals.supabase
    .from('tracks')
    .update(fields)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error || !after) {
    console.error('[tracks:update]', error?.message);
    return json({ error: 'No se pudo guardar los cambios.' }, 500);
  }

  // Si se ha sustituido o quitado un archivo, el anterior ya no hace falta.
  const stale: string[] = [];
  if ('audio_key' in fields && before.audio_key && before.audio_key !== fields.audio_key) stale.push(before.audio_key);
  if ('score_key' in fields && before.score_key && before.score_key !== fields.score_key) stale.push(before.score_key);
  await deleteR2Objects(stale);

  return json({ ok: true });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const id = params.id ?? '';
  if (!UUID.test(id)) return json({ error: 'Identificador no válido.' }, 400);

  const { data: track, error: readError } = await locals.supabase
    .from('tracks')
    .select('id, audio_key, score_key')
    .eq('id', id)
    .maybeSingle();
  if (readError || !track) return json({ error: 'Pista no encontrada.' }, 404);

  // Primero la fila (si falla, no se pierde ningún archivo); después los objetos de R2.
  const { data: deleted, error } = await locals.supabase.from('tracks').delete().eq('id', id).select('id');
  if (error || !deleted || deleted.length === 0) {
    console.error('[tracks:delete]', error?.message);
    return json({ error: 'No se pudo borrar la pista.' }, 500);
  }

  await deleteR2Objects([track.audio_key, track.score_key]);
  return json({ ok: true });
};

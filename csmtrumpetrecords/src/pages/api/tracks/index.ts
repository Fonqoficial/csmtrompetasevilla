// src/pages/api/tracks/index.ts
// POST /api/tracks -> crea una pista (solo administradores; RLS lo vuelve a comprobar).
import type { APIRoute } from 'astro';
import { json, readJson, requireAdmin } from '../../../lib/auth';
import { parseTrackFields } from '../../../lib/tracks-input';

export const POST: APIRoute = async ({ request, locals }) => {
  const denied = requireAdmin(locals);
  if (denied) return denied;

  const body = await readJson(request);
  if (!body) return json({ error: 'Petición no válida.' }, 400);

  const parsed = parseTrackFields(body, 'create');
  if (!parsed.fields) return json({ error: parsed.error }, 400);

  const { data, error } = await locals.supabase
    .from('tracks')
    .insert({ is_published: true, ...parsed.fields })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[tracks:create]', error?.message);
    return json({ error: 'No se pudo guardar la pista.' }, 500);
  }
  return json({ id: data.id }, 201);
};

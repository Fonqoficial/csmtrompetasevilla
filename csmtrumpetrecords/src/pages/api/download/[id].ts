// src/pages/api/download/[id].ts
// Entrega audio y partituras desde el bucket PRIVADO de R2.
//   /api/download/<id>                  -> audio para reproducir (inline)
//   /api/download/<id>?dl=1             -> audio como descarga (.mp3)
//   /api/download/<id>?type=score       -> partitura PDF como descarga
import type { APIRoute } from 'astro';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from '../../../lib/r2';
import { json } from '../../../lib/auth';

export const GET: APIRoute = async ({ url, params, locals }) => {
  // 1. Sesión (RF6 / RF7). El middleware ya la exige; esto es una segunda barrera.
  const { user, supabase } = locals;
  if (!user) {
    return json({ error: 'No autorizado' }, 401);
  }

  const trackId = params.id;
  if (!trackId) {
    return json({ error: 'ID de pista no proporcionado' }, 400);
  }

  const type = url.searchParams.get('type') === 'score' ? 'score' : 'audio';
  const asDownload = type === 'score' || url.searchParams.get('dl') === '1';

  // 2. Leer la pista con el token del usuario: RLS decide si puede verla
  //    (publicada para todos; ocultas solo para administradores).
  const { data: track, error } = await supabase
    .from('tracks')
    .select('id, title, audio_key, score_key')
    .eq('id', trackId)
    .maybeSingle();

  if (error || !track) {
    return json({ error: 'Pista no encontrada' }, 404);
  }

  const objectKey = type === 'score' ? track.score_key : track.audio_key;
  if (!objectKey) {
    return json({ error: 'Archivo no disponible' }, 404);
  }

  try {
    // 3. Enlace firmado temporal.
    //    Reproducción: 2 h (para poder saltar por la pista). Descarga: 5 min.
    const expiresIn = asDownload ? 300 : 7200;
    const ext = type === 'score' ? 'pdf' : 'mp3';
    const cleanName = String(track.title).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'pista';

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      ...(asDownload && {
        ResponseContentDisposition: `attachment; filename="${cleanName}.${ext}"`,
      }),
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });

    // new Response (no Response.redirect): este último tiene las cabeceras
    // inmutables y el middleware falla al añadir X-Robots-Tag.
    return new Response(null, {
      status: 302,
      headers: {
        Location: signedUrl,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('[download] Error firmando el enlace:', err);
    return json({ error: 'Error generando enlace firmado' }, 500);
  }
};

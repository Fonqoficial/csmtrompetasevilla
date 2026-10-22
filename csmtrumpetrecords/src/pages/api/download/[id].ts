// src/pages/api/download/[id].ts
import type { APIRoute } from 'astro';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from '../../../lib/r2';

export const GET: APIRoute = async ({ request, params, locals }) => {
  // 1. Verificar autenticación (RF6 / RF7). El middleware ya lo exige, esto es una segunda barrera.
  const { user, supabase } = locals;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  const trackId = params.id;
  const urlParams = new URL(request.url);
  const type = urlParams.searchParams.get('type') || 'audio'; // 'audio' o 'score'

  if (!trackId) {
    return new Response(JSON.stringify({ error: 'ID de pista no proporcionado' }), { status: 400 });
  }

  // 2. Obtener la información de la pista desde Supabase
  const { data: track, error } = await supabase
    .from('tracks')
    .select('*')
    .eq('id', trackId)
    .single();

  if (error || !track) {
    return new Response(JSON.stringify({ error: 'Pista no encontrada' }), { status: 404 });
  }

  const objectKey = type === 'score' ? track.score_key : track.audio_key;
  if (!objectKey) {
    return new Response(JSON.stringify({ error: 'Archivo no disponible' }), { status: 404 });
  }

  try {
    // 3. Generar enlace firmado temporal
    // Para streaming de audio: 2 horas (7200s) para soportar saltos en la reproducción
    // Para descargas: pocos minutos (300s) con nombre limpio
    const expiresIn = type === 'score' ? 300 : 7200; 

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      ...(type === 'score' && {
        ResponseContentDisposition: `attachment; filename="${track.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
      }),
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });

    // Redirigimos directamente al enlace firmado generado
    return Response.redirect(signedUrl, 302);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Error generando enlace firmado' }), { status: 500 });
  }
};
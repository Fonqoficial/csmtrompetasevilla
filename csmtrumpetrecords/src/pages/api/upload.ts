// src/pages/api/upload-url.ts
import type { APIRoute } from 'astro';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from '../../lib/r2';
import { getAuthenticatedUser, getUserProfile } from '../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  // 1. Validar sesión y rol de administrador
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  const profile = await getUserProfile(user.id);
  if (!profile || profile.role !== 'administrador') {
    return new Response(JSON.stringify({ error: 'Acceso denegado: Se requiere rol de administrador' }), { status: 403 });
  }

  try {
    const { filename, fileType } = await request.json();
    if (!filename || !fileType) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros' }), { status: 400 });
    }

    const uniqueKey = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: fileType,
    });

    // Generar enlace firmado de subida válido por 5 minutos
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });

    return new Response(JSON.stringify({ uploadUrl, objectKey: uniqueKey }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error al generar URL de subida' }), { status: 500 });
  }
};
// src/pages/api/upload-url.ts
import type { APIRoute } from 'astro';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from '../../lib/r2';
import { json } from '../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Sesión y rol de administrador (resueltos por el middleware con el token del usuario)
  if (!locals.user) {
    return json({ error: 'No autorizado' }, 401);
  }
  if (locals.profile?.role !== 'administrador') {
    return json({ error: 'Acceso denegado: Se requiere rol de administrador' }, 403);
  }

  try {
    const { filename, fileType } = await request.json();
    if (!filename || !fileType) {
      return json({ error: 'Faltan parámetros' }, 400);
    }

    const uniqueKey = `${Date.now()}-${String(filename).replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: fileType,
    });

    // Enlace firmado de subida válido por 5 minutos
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });

    return json({ uploadUrl, objectKey: uniqueKey });
  } catch (err: any) {
    return json({ error: err.message || 'Error al generar URL de subida' }, 500);
  }
};

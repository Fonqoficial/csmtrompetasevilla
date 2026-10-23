// src/lib/r2.ts
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Quita espacios, saltos de línea y comillas sobrantes que se cuelan al pegar
// valores en Vercel (una comilla o un salto de línea en la clave rompe la firma).
const env = (v: unknown) => String(v ?? '').trim().replace(/^["']|["']$/g, '').trim();

const ACCOUNT_ID = env(import.meta.env.R2_ACCOUNT_ID);
const ACCESS_KEY_ID = env(import.meta.env.R2_ACCESS_KEY_ID);
const SECRET_ACCESS_KEY = env(import.meta.env.R2_SECRET_ACCESS_KEY);

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.warn('Faltan credenciales de Cloudflare R2 en las variables de entorno.');
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
  // Las versiones recientes del SDK añaden por defecto parámetros de checksum
  // (x-amz-checksum-mode, etc.) a las URLs firmadas. R2 no los necesita y es
  // una causa conocida de errores de firma, así que solo se usan si son obligatorios.
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

export const R2_BUCKET_NAME = env(import.meta.env.R2_BUCKET_NAME);

/** Claves que genera upload-url.ts: marca de tiempo + nombre limpio. */
export const OBJECT_KEY_RE = /^\d{10,}-[A-Za-z0-9._-]{1,200}$/;

/** Borra objetos de R2. No lanza: si falla, lo registra (la fila de la base de datos ya está resuelta). */
export async function deleteR2Objects(keys: Array<string | null | undefined>): Promise<void> {
  for (const key of new Set(keys.filter((k): k is string => !!k))) {
    try {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    } catch (err) {
      console.error('[r2] No se pudo borrar el objeto', key, err);
    }
  }
}

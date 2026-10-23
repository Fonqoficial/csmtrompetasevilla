// src/lib/auth.ts
// La sesión y el perfil los resuelve el middleware (src/middleware.ts) y quedan en
// Astro.locals / context.locals. Aquí solo hay utilidades pequeñas.

/** Solo permite redirecciones internas (evita open redirect con "//evil.com"). */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }
  return value;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Devuelve una respuesta 401/403 si quien llama no es administrador; null si puede continuar. */
export function requireAdmin(locals: App.Locals): Response | null {
  if (!locals.user) return json({ error: 'No autorizado' }, 401);
  if (locals.profile?.role !== 'administrador') {
    return json({ error: 'Acceso denegado: se requiere rol de administrador' }, 403);
  }
  return null;
}

/** Lee un cuerpo JSON. Exige Content-Type: application/json (los formularios entre sitios no pueden enviarlo). */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return null;
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

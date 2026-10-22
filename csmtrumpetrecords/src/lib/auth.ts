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

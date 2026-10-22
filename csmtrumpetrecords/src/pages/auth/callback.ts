// src/pages/auth/callback.ts
// Recibe el "code" de Google y del enlace de confirmación por correo,
// lo canjea por una sesión en el SERVIDOR y deja las cookies escritas.
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase';
import { safeNext } from '../../lib/auth';

export const GET: APIRoute = async ({ request, cookies, url, redirect }) => {
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));

  if (!code) {
    return redirect('/login?error=callback');
  }

  const supabase = createSupabaseServerClient(request, cookies);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback]', error.message);
    return redirect('/login?error=callback');
  }

  return redirect(next);
};

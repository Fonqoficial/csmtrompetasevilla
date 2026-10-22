// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase';

// Rutas accesibles sin sesión (spec, sección 3).
const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/creditos',
  '/privacidad',
  '/condiciones',
  '/auth/',
  '/api/auth/',
];
const PUBLIC_FILES = /^\/(favicon\.(ico|svg)|icon[-.].*|manifest\.webmanifest|sw\.js|robots\.txt)$/;

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, url, redirect, locals } = context;
  const path = url.pathname;

  // Un cliente NUEVO por petición. getUser() valida el token contra Supabase
  // y, si ha caducado, lo renueva con el refresh token y reescribe las cookies.
  const supabase = createSupabaseServerClient(request, cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  locals.supabase = supabase;
  locals.user = user;
  locals.profile = null;

  if (user) {
    // Con el token del usuario, así que las políticas RLS se aplican como a él.
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error) console.error('[middleware] Error leyendo el perfil:', error.message);
    locals.profile = data ?? null;
  }

  const isPublic =
    PUBLIC_FILES.test(path) || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p));

  if (!user && !isPublic) {
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return redirect(`/login?next=${encodeURIComponent(path + url.search)}`);
  }

  // Quien ya tiene sesión no necesita ver login ni registro.
  if (user && (path === '/login' || path === '/register')) {
    return redirect('/');
  }

  // Panel de administración: comprobación de rol en el servidor.
  if ((path === '/admin' || path.startsWith('/admin/')) && locals.profile?.role !== 'administrador') {
    return redirect('/');
  }

  const response = await next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
});

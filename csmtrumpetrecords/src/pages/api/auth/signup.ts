import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password, display_text } = await request.json();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_text } }
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    if (data.session) {
      cookies.set('sb-access-token', data.session.access_token, {
        path: '/',
        maxAge: 60 * 60,
        sameSite: 'lax',
        secure: import.meta.env.PROD,
      });
      cookies.set('sb-refresh-token', data.session.refresh_token, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
        secure: import.meta.env.PROD,
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), { status: 500 });
  }
};
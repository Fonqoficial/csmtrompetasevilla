import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { json } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, url }) => {
  try {
    const { email, password, display_text } = await request.json();

    if (!email || !password || !display_text?.trim()) {
      return json({ error: 'Rellena nombre, correo y contraseña' }, 400);
    }

    const supabase = createSupabaseServerClient(request, cookies);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_text: display_text.trim() },
        // El enlace del correo de confirmación vuelve a esta ruta del servidor.
        emailRedirectTo: `${url.origin}/auth/callback`,
      },
    });

    if (error) {
      return json({ error: error.message }, 400);
    }

    // Con "Confirm email" activado no hay sesión hasta verificar el correo (RF1).
    return json({ success: true, needsConfirmation: !data.session });
  } catch {
    return json({ error: 'Error interno' }, 500);
  }
};

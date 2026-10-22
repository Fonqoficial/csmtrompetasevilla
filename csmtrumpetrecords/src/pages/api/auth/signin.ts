import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase';
import { json } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ error: 'Faltan credenciales' }, 400);
    }

    // El cliente escribe él mismo las cookies de sesión (formato que luego lee el middleware).
    const supabase = createSupabaseServerClient(request, cookies);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.code === 'email_not_confirmed') {
        return json({ error: 'Debes verificar tu correo antes de entrar. Revisa tu bandeja de entrada.' }, 400);
      }
      // Mensaje genérico: no revela si el correo existe (RF12).
      return json({ error: 'Correo o contraseña incorrectos' }, 400);
    }

    return json({ success: true });
  } catch {
    return json({ error: 'Error interno' }, 500);
  }
};

// src/lib/supabase-browser.ts
// Cliente de Supabase PARA EL NAVEGADOR (solo para iniciar el flujo de Google y
// para el panel de administración). Guarda la sesión en las mismas cookies que
// lee el servidor, así que ambos lados ven la misma sesión.
import { createBrowserClient } from '@supabase/ssr';

export const supabaseBrowser = createBrowserClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

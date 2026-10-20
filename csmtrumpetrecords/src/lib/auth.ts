// src/lib/auth.ts
import type { AstroGlobal } from 'astro';
import { supabase } from './supabase';
import type { UserRole } from '../types';

/**
 * Obtiene el usuario autenticado actual a partir de las cookies de la petición en Astro SSR.
 */
export async function getAuthenticatedUser(request: Request) {
  // Extraer las cookies de la petición
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  // Creamos un cliente temporal o pasamos el token de sesión si está en cookies.
  // Con Supabase en Astro SSR, podemos validar la sesión mediante el token de acceso.
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, ...v] = c.split('=');
      return [key, decodeURIComponent(v.join('='))];
    })
  );

  // Buscamos la cookie de sesión de Supabase (por defecto suele empezar por sb-<project-id>-auth-token)
  // O podemos validar el token directamente si guardamos el access_token.
  const accessTokenKey = Object.keys(cookies).find(k => k.endsWith('-auth-token') || k.includes('supabase'));
  if (!accessTokenKey) return null;

  try {
    const sessionData = JSON.parse(cookies[accessTokenKey]);
    const token = Array.isArray(sessionData) ? sessionData[0] : sessionData?.access_token;
    
    if (!token) return null;

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    return user;
  } catch (e) {
    return null;
  }
}

/**
 * Obtiene el rol y perfil del usuario en la base de datos.
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Comprueba si el usuario tiene rol de administrador.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return profile?.role === 'administrador';
}
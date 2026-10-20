export type UserRole = 'alumno' | 'profesor' | 'administrador';

export interface Profile {
  id: string;
  display_text: string;
  role: UserRole;
  created_at: string;
}

export interface Track {
  id: string;
  title: string;
  composer: string;
  audio_url?: string; // Para mantener compatibilidad si hace falta
  audio_key?: string; // Clave de objeto en R2
  score_key?: string; // Clave de la partitura en R2
  is_published: boolean;
  source_credit?: string;
  created_at?: string;
}
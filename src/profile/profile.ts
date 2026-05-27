import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  displayName?: string;
  createdAt: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  created_at: string;
};

export function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProfile(data as ProfileRow) : null;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

/** @jest-environment node */
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Fresh client per user so sessions don't collide.
function freshClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signUpUser(email: string) {
  const client = freshClient();
  const { data, error } = await client.auth.signUp({ email, password: 'Password123!' });
  if (error) throw error;
  return { client, userId: data.user!.id };
}

describe('profiles RLS', () => {
  it('a user cannot read another user’s profile', async () => {
    // Unique emails per run (UUID, not a millisecond timestamp that can collide).
    const a = await signUpUser(`a_${randomUUID()}@example.com`);
    const b = await signUpUser(`b_${randomUUID()}@example.com`);

    // User A reads their own profile: present (and the read itself succeeds).
    const own = await a.client.from('profiles').select('id').eq('id', a.userId).maybeSingle();
    expect(own.error).toBeNull();
    expect(own.data?.id).toBe(a.userId);

    // User A tries to read User B's profile: RLS hides it (no row).
    const other = await a.client.from('profiles').select('id').eq('id', b.userId).maybeSingle();
    expect(other.data).toBeNull();
  });
});

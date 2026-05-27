/** @jest-environment node */
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
    const a = await signUpUser(`a_${Date.now()}@example.com`);
    const b = await signUpUser(`b_${Date.now()}@example.com`);

    // User A reads their own profile: present.
    const own = await a.client.from('profiles').select('id').eq('id', a.userId).maybeSingle();
    expect(own.data?.id).toBe(a.userId);

    // User A tries to read User B's profile: RLS hides it (no row).
    const other = await a.client.from('profiles').select('id').eq('id', b.userId).maybeSingle();
    expect(other.data).toBeNull();
  });
});

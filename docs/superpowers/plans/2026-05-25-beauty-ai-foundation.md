# Beauty AI — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Beauty AI mobile app skeleton: a user can sign in (email OTP + Apple Sign-In on iOS), the app routes between authenticated and unauthenticated states, and each user gets a row-level-security-protected `profiles` row in Supabase.

**Architecture:** Expo (React Native) app using Expo Router for file-based routing with `Stack.Protected` guards. A Supabase backend provides Auth, Postgres, and (later) Storage/Edge Functions. The supabase-js client persists sessions via AsyncStorage. A `SessionProvider` React context exposes the current session to the route tree. All app secrets stay out of the bundle; only the public anon key and URL are shipped.

**Tech Stack:** Expo SDK 56 + Expo Router, TypeScript, `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `expo-apple-authentication`, Jest + `@testing-library/react-native`, Supabase CLI (local Postgres for tests).

---

## PLAN CORRECTION (recorded after Task 1 scaffold)

The SDK 56 default template scaffolds into a **`src/` layout**. Two consequences for every later task:

- **Routes live under `src/app/`, not `app/`.** Wherever this plan says `app/_layout.tsx`, `app/(auth)/sign-in.tsx`, `app/(app)/index.tsx`, etc., read it as `src/app/...`. Library code also lives under `src/` (`src/lib`, `src/auth`, `src/profile`).
- **The `@/* → ./src/*` path alias already exists** in the template's `tsconfig.json` (it also maps `@/assets/*`). Task 2's "set the alias" step is therefore a **verify-only** step — do not overwrite the template tsconfig.
- Template demo routes present after scaffold: `src/app/index.tsx`, `src/app/explore.tsx`, `src/app/_layout.tsx`. Task 7 replaces `_layout.tsx` and removes the demo screens (`index.tsx`, `explore.tsx`); there is no `(tabs)` group or `+not-found.tsx` file to delete.

---

## Platform constraint (read first)

The developer machine is **Windows 11**. iOS cannot be built or run locally on Windows.

- **Android + web:** develop and test locally (Android emulator / `expo start --web`).
- **Email OTP auth:** works in **Expo Go** on Android and web — no native build needed.
- **Apple Sign-In:** requires a **development build** (not Expo Go) and an Apple Developer account; build it via **EAS Build (cloud)** and test on a physical iPhone or TestFlight. Tasks 9 implements the code; actually exercising it is deferred to when EAS/iOS access is available. This does NOT block the rest of the plan.

## File structure (created by this plan)

```
beauty-ai/
  src/
    app/                        # Expo Router routes (template uses src/app)
      _layout.tsx               # Root layout: SessionProvider + protected Stack
      (auth)/
        _layout.tsx             # Public stack
        sign-in.tsx             # Email OTP + Apple Sign-In screen
      (app)/
        _layout.tsx             # Authenticated stack
        index.tsx               # Home screen (shows profile, sign out)
    lib/
      supabase.ts               # Supabase client (AsyncStorage + auto-refresh)
    auth/
      session.tsx               # SessionProvider + useSession()
      email.ts                  # Pure email-normalize/validate helpers
      email.test.ts
      AppleSignInButton.tsx     # Apple Sign-In button (iOS)
    profile/
      profile.ts                # Profile type + getProfile/updateDisplayName
      profile.test.ts
  supabase/
    config.toml                 # Created by `supabase init`
    migrations/
      0001_profiles.sql         # profiles table + RLS + signup trigger
  tests/
    integration/
      rls.test.ts               # Two-user RLS isolation test (local stack)
  .env.example
  .env                          # gitignored; real local values
  app.json (or app.config.ts)   # Expo config (Apple Sign-In plugin)
  tsconfig.json                 # @/* -> ./src/*
  jest.config.js
```

Library/business code lives in `src/` (alias `@/*`). Route files live in `app/`. Files that change together live together (auth code under `src/auth`, profile code under `src/profile`).

---

## Task 1: Scaffold the Expo app into the existing repo

The repo already contains `.git/` and `docs/`. Scaffold into a temp dir, then merge so git history and the specs survive.

**Files:**
- Create: entire Expo template (package.json, app/, etc.)

- [ ] **Step 1: Scaffold into a sibling temp directory**

Run (PowerShell, from `C:\Users\Genti`):
```powershell
npx create-expo-app@latest beauty-ai-tmp --template default@sdk-56
```
Expected: a new `C:\Users\Genti\beauty-ai-tmp` containing a runnable Expo Router app.

- [ ] **Step 2: Merge generated files into the project, preserving .git and docs**

Run (PowerShell):
```powershell
robocopy "C:\Users\Genti\beauty-ai-tmp" "C:\Users\Genti\beauty-ai" /E /XD .git
Remove-Item -Recurse -Force "C:\Users\Genti\beauty-ai-tmp"
```
Expected: `C:\Users\Genti\beauty-ai` now has `package.json`, `app/`, etc., alongside the existing `docs/` and `.git/`.

- [ ] **Step 3: Verify the app boots (web is fastest to check on Windows)**

Run (from `C:\Users\Genti\beauty-ai`):
```powershell
npm install
npx expo start --web
```
Expected: Metro bundles and a default Expo Router screen opens in the browser. Stop it with Ctrl+C once confirmed.

- [ ] **Step 4: Commit the scaffold**

```bash
git add -A
git commit -m "chore: scaffold Expo Router app (SDK 56)"
```

---

## Task 2: Configure TypeScript path alias and install dependencies

**Files:**
- Modify: `tsconfig.json`
- Modify: `package.json` (via expo install — do not hand-edit versions)

- [ ] **Step 1: Verify the `@/*` path alias (already provided by the template)**

The SDK 56 template's `tsconfig.json` already contains `"@/*": ["./src/*"]` (and `"@/assets/*": ["./assets/*"]`). Do NOT overwrite it. Just confirm by reading `tsconfig.json` that `@/*` maps to `./src/*`. No change needed.

- [ ] **Step 2: Install runtime dependencies (expo install picks SDK-compatible versions)**

Run:
```powershell
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill expo-apple-authentication
```
Expected: all four added to `package.json` with versions Expo selected for SDK 56.

- [ ] **Step 3: Install dev/test dependencies**

Run:
```powershell
npx expo install --dev jest jest-expo @testing-library/react-native @types/jest
```
Expected: testing deps added.

- [ ] **Step 4: Add the Jest config and test script**

Create `jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/react-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@supabase/.*|react-native-url-polyfill))',
  ],
};
```

Add to `package.json` `"scripts"`:
```json
"test": "jest"
```

- [ ] **Step 5: Verify the test runner starts (no tests yet is fine)**

Run:
```powershell
npm test -- --passWithNoTests
```
Expected: Jest runs and reports "No tests found, exiting with code 0" (passWithNoTests) — confirms the harness works.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add path alias, supabase + test dependencies"
```

---

## Task 3: Create the Supabase local stack and the profiles migration

**Files:**
- Create: `supabase/config.toml` (via CLI)
- Create: `supabase/migrations/0001_profiles.sql`

Prereq: Docker Desktop running (Supabase CLI local stack needs it). Supabase CLI invoked via `npx supabase`.

- [ ] **Step 1: Initialize Supabase locally**

Run (from project root):
```powershell
npx supabase init
npx supabase start
```
Expected: `supabase/config.toml` is created; `start` prints local credentials including `API URL` and `anon key`. Copy these for Task 4.

- [ ] **Step 2: Create the migration file**

Create `supabase/migrations/0001_profiles.sql`:
```sql
-- profiles: one row per authenticated user, created automatically on signup.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read only their own profile.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- A user can update only their own profile.
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Create a profile row automatically when a new auth user is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Note: there is deliberately **no INSERT policy** for clients — profile rows are created only by the `security definer` trigger, never by the app.

- [ ] **Step 3: Apply the migration to the local stack**

Run:
```powershell
npx supabase db reset
```
Expected: the local DB is rebuilt and the migration applies with no errors ("Applying migration 0001_profiles.sql...").

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: profiles table with RLS and signup trigger"
```

---

## Task 4: Supabase client module and environment config

**Files:**
- Create: `.env.example`
- Create: `.env` (gitignored)
- Create: `src/lib/supabase.ts`
- Modify: `.gitignore` (ensure `.env` is ignored)

- [ ] **Step 1: Add env files**

Create `.env.example`:
```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
```

Create `.env` with the real values printed by `supabase start` in Task 3 (the local API URL and anon key).

Ensure `.gitignore` contains a line `.env` (append it if missing). `.env.example` IS committed; `.env` is NOT.

- [ ] **Step 2: Create the Supabase client**

Create `src/lib/supabase.ts`:
```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the session only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

- [ ] **Step 3: Verify it type-checks**

Run:
```powershell
npx tsc --noEmit
```
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add -A .env.example .gitignore src/lib/supabase.ts
git commit -m "feat: supabase client with AsyncStorage session persistence"
```

---

## Task 5: Pure email helpers (TDD)

Small, fully testable unit before any UI uses it. Keeps validation logic out of components.

**Files:**
- Create: `src/auth/email.ts`
- Test: `src/auth/email.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/auth/email.test.ts`:
```ts
import { normalizeEmail, isValidEmail } from './email';

describe('normalizeEmail', () => {
  it('trims whitespace and lowercases', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });
});

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });
  it('rejects an address with no @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });
  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```powershell
npm test -- src/auth/email.test.ts
```
Expected: FAIL — "Cannot find module './email'".

- [ ] **Step 3: Implement**

Create `src/auth/email.ts`:
```ts
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmail(input: string): boolean {
  const email = normalizeEmail(input);
  // Simple, deliberately conservative check: one @, non-empty local and domain
  // with a dot in the domain.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```powershell
npm test -- src/auth/email.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/auth/email.ts src/auth/email.test.ts
git commit -m "feat: email normalize/validate helpers"
```

---

## Task 6: Session context (SessionProvider + useSession)

Wraps the supabase auth session in a React context so route layouts can guard on it.

**Files:**
- Create: `src/auth/session.tsx`

- [ ] **Step 1: Implement the provider**

Create `src/auth/session.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type SessionContextValue = {
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue>({
  session: null,
  isLoading: true,
  signOut: async () => {},
});

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SessionContext.Provider value={{ session, isLoading, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
```

- [ ] **Step 2: Verify it type-checks**

Run:
```powershell
npx tsc --noEmit
```
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/auth/session.tsx
git commit -m "feat: session context backed by supabase auth"
```

---

## Task 7: Root layout with protected routing

**Files:**
- Replace: `app/_layout.tsx`
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(app)/_layout.tsx`

- [ ] **Step 1: Root layout — wrap in SessionProvider and guard route groups**

Replace `app/_layout.tsx` with:
```tsx
import { Stack } from 'expo-router';
import { Text } from 'react-native';
import { SessionProvider, useSession } from '@/auth/session';

function RootNavigator() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return <Text>Loading…</Text>;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}
```

- [ ] **Step 2: Group layouts**

Create `app/(auth)/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `app/(app)/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';

export default function AppLayout() {
  return <Stack />;
}
```

- [ ] **Step 3: Remove leftover template routes that conflict**

Delete any default template screens that would collide (e.g. a default `app/(tabs)` group or `app/index.tsx` from the scaffold). Run:
```powershell
Remove-Item -Recurse -Force "app/(tabs)" -ErrorAction SilentlyContinue
Remove-Item -Force "app/index.tsx" -ErrorAction SilentlyContinue
Remove-Item -Force "app/+not-found.tsx" -ErrorAction SilentlyContinue
```
(Keep `app/_layout.tsx` — you just replaced it.)

- [ ] **Step 4: Verify type-check (screens added in Tasks 8/10 will resolve the route names)**

Run:
```powershell
npx tsc --noEmit
```
Expected: no type errors. (Route-name type warnings may appear until Tasks 8 and 10 add `sign-in` and `index`; resolve them by completing those tasks.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: protected routing between (auth) and (app) groups"
```

---

## Task 8: Sign-in screen — email OTP flow

Uses the 6-digit OTP code flow (not deep-link magic links) — simpler and more reliable on mobile.

**Supabase config note:** in the local `supabase/config.toml` (and later in the hosted project), the email OTP template must send the token code (`{{ .Token }}`), not only a magic link. For local dev, codes appear in the Inbucket mailbox at the URL printed by `supabase start`.

**Files:**
- Create: `app/(auth)/sign-in.tsx`

- [ ] **Step 1: Implement the screen**

Create `app/(auth)/sign-in.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { normalizeEmail, isValidEmail } from '@/auth/email';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    const clean = normalizeEmail(email);
    if (!isValidEmail(clean)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: clean });
    setBusy(false);
    if (error) {
      Alert.alert('Could not send code', error.message);
      return;
    }
    setStage('code');
  };

  const verifyCode = async () => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    if (error) {
      Alert.alert('Invalid code', error.message);
    }
    // On success, onAuthStateChange flips the session and routing redirects.
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Beauty AI</Text>

      {stage === 'email' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Button title={busy ? 'Sending…' : 'Send code'} onPress={sendCode} disabled={busy} />
        </>
      ) : (
        <>
          <Text>Enter the 6-digit code sent to {normalizeEmail(email)}</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <Button title={busy ? 'Verifying…' : 'Verify'} onPress={verifyCode} disabled={busy} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  spacer: { height: 16 },
});
```

- [ ] **Step 2: Verify on Android/web (Expo Go) end-to-end**

Run:
```powershell
npx expo start
```
Then: open on Android emulator or web → enter your email → "Send code" → read the code from the Inbucket mailbox (URL from `supabase start`) → enter it → confirm the app redirects to the (app) home screen (built in Task 10). If Task 10 isn't done yet, confirm the session flips (no error alert) and revisit after Task 10.

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/sign-in.tsx"
git commit -m "feat: email OTP sign-in screen"
```

---

## Task 9: Apple Sign-In button (iOS)

Implements the code now; testing requires an iOS dev build (see platform constraint).

**Files:**
- Create: `src/auth/AppleSignInButton.tsx`
- Modify: `app.json` (add the Apple authentication plugin + iOS flag)

- [ ] **Step 1: Enable the config plugin**

In `app.json`, under `expo`, add `expo-apple-authentication` to `plugins` and set the iOS capability:
```json
{
  "expo": {
    "ios": {
      "usesAppleSignIn": true
    },
    "plugins": [
      "expo-router",
      "expo-apple-authentication"
    ]
  }
}
```
(Merge into the existing `expo` block; keep any plugins already listed, e.g. `expo-router`.)

- [ ] **Step 2: Implement the button**

Create `src/auth/AppleSignInButton.tsx`:
```tsx
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

export function AppleSignInButton() {
  if (Platform.OS !== 'ios') return null;

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={8}
      style={{ width: '100%', height: 48 }}
      onPress={async () => {
        try {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });

          if (!credential.identityToken) {
            throw new Error('No identityToken returned from Apple.');
          }

          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
          });
          if (error) throw error;

          // Apple returns the full name only on first sign-in; persist it.
          if (credential.fullName?.givenName || credential.fullName?.familyName) {
            const fullName = [credential.fullName.givenName, credential.fullName.familyName]
              .filter(Boolean)
              .join(' ');
            await supabase.auth.updateUser({ data: { full_name: fullName } });
          }
        } catch (e: any) {
          if (e?.code === 'ERR_REQUEST_CANCELED') return; // user dismissed
          // Surface other errors during development.
          console.error('Apple sign-in failed', e);
        }
      }}
    />
  );
}
```

- [ ] **Step 3: Wire the button into the sign-in screen**

In `app/(auth)/sign-in.tsx`, add the import below the existing imports:
```tsx
import { AppleSignInButton } from '@/auth/AppleSignInButton';
```
And render it just before the closing `</View>` of the component's return (after the OTP block):
```tsx
      <View style={styles.spacer} />
      <AppleSignInButton />
    </View>
```

- [ ] **Step 4: Verify type-check and Android/web still run**

Run:
```powershell
npx tsc --noEmit
```
Expected: no type errors. On Android/web the button renders nothing (guarded by `Platform.OS`), so the sign-in screen still works.

- [ ] **Step 5: Commit**

```bash
git add src/auth/AppleSignInButton.tsx app.json "app/(auth)/sign-in.tsx"
git commit -m "feat: Apple Sign-In button (iOS)"
```

> Note for later: testing Apple Sign-In requires `eas build --profile development --platform ios`, the `apple` provider enabled in the hosted Supabase project, and a configured Apple Services ID. Out of scope to *run* now; the code path is complete.

---

## Task 10: Profile data layer (TDD) + home screen

**Files:**
- Create: `src/profile/profile.ts`
- Test: `src/profile/profile.test.ts`
- Create: `app/(app)/index.tsx`

- [ ] **Step 1: Write the failing test for the profile mapper**

The data layer's pure part is mapping a DB row to a `Profile`. Create `src/profile/profile.test.ts`:
```ts
import { rowToProfile } from './profile';

describe('rowToProfile', () => {
  it('maps a full row', () => {
    const row = { id: 'u1', display_name: 'Ada', created_at: '2026-05-25T00:00:00Z' };
    expect(rowToProfile(row)).toEqual({
      id: 'u1',
      displayName: 'Ada',
      createdAt: '2026-05-25T00:00:00Z',
    });
  });

  it('maps a null display_name to undefined', () => {
    const row = { id: 'u1', display_name: null, created_at: '2026-05-25T00:00:00Z' };
    expect(rowToProfile(row).displayName).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```powershell
npm test -- src/profile/profile.test.ts
```
Expected: FAIL — "Cannot find module './profile'".

- [ ] **Step 3: Implement the profile module**

Create `src/profile/profile.ts`:
```ts
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
    .single();
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```powershell
npm test -- src/profile/profile.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Build the home screen**

Create `app/(app)/index.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useSession } from '@/auth/session';
import { getProfile, type Profile } from '@/profile/profile';

export default function Home() {
  const { session, signOut } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (session?.user.id) {
      getProfile(session.user.id).then(setProfile).catch(() => setProfile(null));
    }
  }, [session?.user.id]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome{profile?.displayName ? `, ${profile.displayName}` : ''}</Text>
      <Text style={styles.subtle}>{session?.user.email}</Text>
      <View style={styles.spacer} />
      <Button title="Sign out" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  subtle: { color: '#666', marginTop: 4 },
  spacer: { height: 24 },
});
```

- [ ] **Step 6: Manual end-to-end verification**

Run:
```powershell
npx expo start
```
On Android/web: sign in with email OTP (Task 8) → confirm you land on the Home screen and see your email → tap "Sign out" → confirm you return to the sign-in screen.

- [ ] **Step 7: Commit**

```bash
git add src/profile app/(app)/index.tsx
git commit -m "feat: profile data layer and authenticated home screen"
```

---

## Task 11: RLS isolation integration test

Proves a signed-in user cannot read another user's profile. Runs against the local Supabase stack (must be `supabase start`-ed).

**Files:**
- Create: `tests/integration/rls.test.ts`

- [ ] **Step 1: Write the test**

Create `tests/integration/rls.test.ts`:
```ts
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
```

Note: for sign-up to work without email confirmation locally, set `enable_confirmations = false` under `[auth.email]` in `supabase/config.toml`, then `npx supabase stop && npx supabase start`. This relaxed setting is local-only; the hosted project keeps confirmations on.

- [ ] **Step 2: Run the integration test**

Jest (Node) does not auto-load `.env`, so set the vars in the shell first. Ensure `supabase start` is running, then run (replace the anon key with the one `supabase start` printed):
```powershell
$env:EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"
$env:EXPO_PUBLIC_SUPABASE_ANON_KEY = "<anon key from supabase start>"
npm test -- tests/integration/rls.test.ts
```
Expected: PASS — own profile readable, other user's profile returns null.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/rls.test.ts supabase/config.toml
git commit -m "test: RLS isolation between users on profiles"
```

---

## Task 12: Full verification pass

- [ ] **Step 1: Type-check the whole project**

Run:
```powershell
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 2: Run the full test suite**

Run:
```powershell
npm test
```
Expected: all suites pass (email, profile, rls).

- [ ] **Step 3: Manual smoke test**

Run `npx expo start`, then on Android or web:
1. App opens on the sign-in screen (unauthenticated).
2. Email OTP sign-in succeeds → Home screen shows email.
3. Sign out → returns to sign-in screen.

- [ ] **Step 4: Final commit / tag the milestone**

```bash
git add -A
git commit -m "chore: foundation milestone complete" --allow-empty
```

---

## Done criteria

- A new user signing in via email OTP automatically has a `profiles` row (signup trigger).
- Routing redirects unauthenticated users to sign-in and authenticated users to Home.
- RLS prevents cross-user profile reads (proven by an automated test).
- Apple Sign-In code path is implemented (iOS testing deferred to an EAS dev build).
- All tests pass and the project type-checks.

## Explicitly out of scope (later plans)

Camera/capture, biometric consent, encrypted photo storage, the analysis pipeline, reports, history/progress charts, recommendations, and the compliance/data-rights surface. Those are Plans 2–6.

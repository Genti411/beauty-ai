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

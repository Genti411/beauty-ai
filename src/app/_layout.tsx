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

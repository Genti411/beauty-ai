import { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { normalizeEmail, isValidEmail } from '@/auth/email';
import { AppleSignInButton } from '@/auth/AppleSignInButton';

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
      <View style={styles.spacer} />
      <AppleSignInButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  spacer: { height: 16 },
});

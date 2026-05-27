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

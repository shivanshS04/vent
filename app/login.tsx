import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useWarmUpBrowser } from "@/hooks/useWarmUpBrowser";
import { useAuth, useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const { isLoaded, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/(tabs)");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading while checking auth state
  if (!isLoaded || isSignedIn) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      const { createdSessionId, setActive } = await startOAuthFlow();

      if (createdSessionId) {
        setActive!({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.errors?.[0]?.message || "Failed to sign in with Google"
      );
      console.error("OAuth error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Welcome to Vent
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Sign in to continue to your account
        </ThemedText>

        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.googleButtonPressed,
            loading && styles.googleButtonDisabled,
          ]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <ThemedText style={styles.googleButtonText}>
                Continue with Google
              </ThemedText>
            </>
          )}
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: "center",
    opacity: 0.7,
  },
  googleButton: {
    width: "100%",
    backgroundColor: "#4285F4",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  googleButtonPressed: {
    opacity: 0.8,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

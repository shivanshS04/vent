import { useAuth } from "@clerk/clerk-expo";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export function AuthProtect({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const currentRoute = segments[0];
    const isLoginPage = currentRoute === "login";

    if (!isSignedIn && !isLoginPage) {
      // Redirect to login if not signed in and not already on login page
      router.replace("/login");
    } else if (isSignedIn && isLoginPage) {
      // Redirect to tabs if signed in and on login page
      router.replace("/(tabs)");
    }
  }, [isSignedIn, isLoaded, segments]);

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

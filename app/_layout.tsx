import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { AuthProtect } from "@/components/auth-protect";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { tokenCache } from "@/utils/cache";
import { ClerkProvider } from "@clerk/clerk-expo";

export const unstable_settings = {
  anchor: "(tabs)",
};

const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProtect>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
          </Stack>
        </AuthProtect>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ClerkProvider>
  );
}

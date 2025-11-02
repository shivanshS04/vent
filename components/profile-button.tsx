import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export function ProfileButton() {
  const { user, signOut, isLoaded } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out");
    }
  };

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (!user) return null;

  const firstName =
    user.firstName ||
    user.emailAddresses[0]?.emailAddress.split("@")[0] ||
    "User";
  const avatarInitials = firstName.substring(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => setShowMenu(!showMenu)}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>{avatarInitials}</ThemedText>
        </View>
        <ThemedText style={styles.name} numberOfLines={1}>
          {firstName}
        </ThemedText>
      </TouchableOpacity>

      {showMenu && (
        <>
          <ThemedView style={[styles.menu, isDark && styles.menuDark]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleLogout();
              }}
              activeOpacity={0.5}
            >
              <ThemedText style={styles.menuItemText}>Logout</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 25,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 100,
  },
  menu: {
    position: "absolute",
    top: 50,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  menuDark: {
    backgroundColor: "#1F2937",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  menuItem: {
    padding: 12,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#EF4444",
  },
  overlay: {
    ...Platform.select({
      web: {
        position: "fixed" as any,
      },
      default: {
        position: "absolute",
      },
    }),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileScreen() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch {
      Alert.alert("Error", "Failed to sign out");
    }
  };

  if (!isLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!user) return null;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatarBox}>
          <View style={styles.avatarModern}>
            <ThemedText style={styles.avatarText}>
              {(
                user.firstName ||
                user.primaryEmailAddress?.emailAddress[0] ||
                "U"
              ).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={styles.name}>
            {user.firstName ||
              user.primaryEmailAddress?.emailAddress.split("@")[0] ||
              "User"}
          </ThemedText>
          <ThemedText style={styles.email}>
            {user.primaryEmailAddress?.emailAddress}
          </ThemedText>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    minWidth: 280,
    maxWidth: 340,
  },
  avatarBox: {
    alignItems: "center",
    marginBottom: 18,
  },
  avatarModern: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#4285F4",
  },
  avatarText: {
    color: "#4285F4",
    fontSize: 36,
    fontWeight: "700",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
    color: "#222",
  },
  email: {
    fontSize: 15,
    color: "#666",
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 28,
    marginTop: 10,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

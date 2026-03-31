import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/useAuth";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AdminShell from "@/components/layout/AdminShell";

export default function AdminLayout() {
  const { session, loading } = useAuth();

  // Show spinner while auth state resolves — prevents flash of protected content
  // or premature redirect during signOut transition
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // Not authenticated — send to login.
  // This fires after signOut when onAuthStateChange sets session to null.
  if (!session) {
    return <Redirect href="/login" />;
  }

  // Authenticated — render the full desktop shell with sidebar
  return (
    <AdminShell>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#080812" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="tournament/[id]" />
        <Stack.Screen name="match/[id]" />
      </Stack>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#080812",
  },
});
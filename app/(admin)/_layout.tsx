import { Stack, Redirect } from "expo-router";
import { useAuth } from "@/lib/useAuth";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AdminShell from "@/components/layout/AdminShell";

export default function AdminLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <AdminShell>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#080812" }, animation: "fade" }}>
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="tournament/[id]" />
        <Stack.Screen name="match/[id]" />
      </Stack>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#080812" },
});
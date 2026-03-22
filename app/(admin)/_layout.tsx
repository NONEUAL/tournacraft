import { Stack, Redirect } from "expo-router";
import { useAuth } from "@/lib/useAuth";
import { View, ActivityIndicator } from "react-native";

export default function AdminLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-secondary">
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: "#1E1E2E" },
      headerTintColor: "#ffffff",
      headerTitleStyle: { fontWeight: "bold" },
    }}>
      <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Stack.Screen name="tournament/[id]" options={{ title: "Tournament" }} />
      <Stack.Screen name="match/[id]" options={{ title: "Match Controller" }} />
    </Stack>
  );
}
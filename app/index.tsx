import { Redirect } from "expo-router";
import { useAuth } from "@/lib/useAuth";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-secondary">
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(admin)/dashboard" />;
  }

  return <Redirect href="/login" />;
}
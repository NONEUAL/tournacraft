import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/lib/useAuth";

export default function Dashboard() {
  const { session, signOut } = useAuth();

  return (
    <View className="flex-1 bg-secondary items-center justify-center p-6">
      <Text className="text-white text-2xl font-bold mb-2">
        Dashboard
      </Text>
      <Text className="text-gray-400 mb-8">
        Logged in as: {session?.user?.email}
      </Text>
      <Text className="text-accent text-base mb-8">
        ✓ Supabase connected
      </Text>
      <TouchableOpacity
        className="bg-danger rounded-xl px-6 py-3"
        onPress={signOut}
      >
        <Text className="text-white font-bold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
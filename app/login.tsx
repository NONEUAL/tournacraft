import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/useAuth";

export default function LoginScreen() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert("Login Failed", error.message);
    } else {
      router.replace("/(admin)/dashboard");
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-secondary"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 items-center justify-center px-8">

        {/* Logo / Title */}
        <View className="mb-10 items-center">
          <Text className="text-4xl font-bold text-white mb-2">
            🏆 TourneyOS
          </Text>
          <Text className="text-gray-400 text-base">
            Admin Control Room
          </Text>
        </View>

        {/* Form */}
        <View className="w-full max-w-sm">
          <Text className="text-gray-400 text-sm mb-1">Email</Text>
          <TextInput
            className="bg-surface text-white rounded-xl px-4 py-3 mb-4 text-base border border-gray-700"
            placeholder="you@yourevent.ph"
            placeholderTextColor="#6b7280"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text className="text-gray-400 text-sm mb-1">Password</Text>
          <TextInput
            className="bg-surface text-white rounded-xl px-4 py-3 mb-6 text-base border border-gray-700"
            placeholder="••••••••"
            placeholderTextColor="#6b7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            className="bg-primary rounded-xl py-4 items-center"
            onPress={handleLogin}
            disabled={loading}
          >
            <Text className="text-white font-bold text-base">
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/useAuth";

export default function LoginScreen() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { signIn, session, loading: authLoading } = useAuth();
  const router = useRouter();

  // ── THE FIX ───────────────────────────────────────────────────────────
  // Watch session state. When it becomes truthy (after signIn succeeds and
  // onAuthStateChange fires), redirect. This is decoupled from handleLogin
  // so there's no race condition between navigation and auth state.
  useEffect(() => {
    if (!authLoading && session) {
      router.replace("/(admin)/dashboard");
    }
  }, [session, authLoading]);
  // ──────────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    const { error } = await signIn(trimmedEmail, password);
    setLoading(false);
    if (error) {
      Alert.alert("Sign In Failed", error.message);
    }
    // No navigation here — useEffect above handles it when session updates.
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.root}
    >
      <View style={styles.card}>

        {/* ── Brand ── */}
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>TC</Text>
          </View>
          <View>
            <Text style={styles.appName}>Tournacraft</Text>
            <Text style={styles.appTagline}>Admin Console</Text>
          </View>
        </View>

        {/* ── Heading ── */}
        <View style={styles.heading}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to manage your tournaments</Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Feather name="mail" size={14} color="#374151" style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#1F2937"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                style={styles.input}
                editable={!loading}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Feather name="lock" size={14} color="#374151" style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#1F2937"
                secureTextEntry={!showPass}
                autoComplete="current-password"
                textContentType="password"
                style={[styles.input, { flex: 1 }]}
                editable={!loading}
                onSubmitEditing={handleLogin}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={() => setShowPass(v => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name={showPass ? "eye-off" : "eye"} size={14} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Text style={styles.submitText}>Sign In</Text>
                  <Feather name="arrow-right" size={15} color="#fff" />
                </>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Tournacraft · Tournament Management System</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#080812",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#0C0C1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#13132A",
    padding: 36,
    gap: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.4,
    shadowRadius: 48,
    elevation: 20,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  logoMarkText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  appName: {
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  appTagline: {
    color: "#1F2937",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 1,
  },
  heading: {
    gap: 4,
  },
  title: {
    color: "#F1F5F9",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: "#374151",
    fontSize: 13,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 7,
  },
  label: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111123",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#1A1A3A",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  inputIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    color: "#D1D5DB",
    fontSize: 14,
    outlineStyle: "none",
  } as any,
  eyeBtn: {
    padding: 2,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    color: "#1F2937",
    fontSize: 11,
    textAlign: "center",
    letterSpacing: 0.3,
  },
});
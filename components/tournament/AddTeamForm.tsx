import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

interface Props {
  tournamentId: string;
  existingCount: number;
  onCreated: () => void;
}

export default function AddTeamForm({ tournamentId, existingCount, onCreated }: Props) {
  const [name,    setName]    = useState("");
  const [seed,    setSeed]    = useState(String(existingCount + 1));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert("Required", "Please enter a team name."); return; }

    setLoading(true);
    const seedNum = parseInt(seed, 10);

    const { error } = await supabase.from("teams").insert({
      tournament_id: tournamentId,
      name:          trimmed,
      seed:          isNaN(seedNum) ? null : seedNum,
    });

    setLoading(false);
    if (error) { Alert.alert("Error", error.message); return; }

    setName("");
    setSeed(String(existingCount + 2));
    onCreated();
  };

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>New Team</Text>

      <View style={styles.row}>
        {/* Seed */}
        <View style={styles.seedField}>
          <Text style={styles.fieldLabel}>SEED</Text>
          <TextInput
            value={seed}
            onChangeText={setSeed}
            keyboardType="numeric"
            style={styles.seedInput}
            placeholder="—"
            placeholderTextColor="#2D3748"
            selectTextOnFocus
          />
        </View>

        {/* Name */}
        <View style={styles.nameField}>
          <Text style={styles.fieldLabel}>TEAM NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Team Alpha"
            placeholderTextColor="#2D3748"
            style={styles.nameInput}
            autoFocus
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading}
        style={styles.submitBtn}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Feather name="check" size={13} color="#fff" />
            <Text style={styles.submitText}>Add Team</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    margin: 12,
    padding: 14,
    backgroundColor: "#0A0A1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A3A",
    gap: 12,
  },
  formTitle: {
    color: "#4B5563",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  seedField: {
    width: 60,
    gap: 5,
  },
  nameField: {
    flex: 1,
    gap: 5,
  },
  fieldLabel: {
    color: "#2D3748",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  seedInput: {
    backgroundColor: "#111123",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1A1A3A",
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: "center",
    outlineStyle: "none",
  } as any,
  nameInput: {
    backgroundColor: "#111123",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1A1A3A",
    color: "#D1D5DB",
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    outlineStyle: "none",
  } as any,
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#6C63FF",
    borderRadius: 8,
    paddingVertical: 9,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  submitText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
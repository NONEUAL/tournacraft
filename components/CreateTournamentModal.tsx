import {
  View, Text, TextInput, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { GameType, StageFormat } from "../lib/types";

const GAME_TYPES: { value: GameType; label: string; icon: string }[] = [
  { value: "mlbb",       label: "Mobile Legends",  icon: "⚔️"  },
  { value: "cod",        label: "Call of Duty",     icon: "🎯"  },
  { value: "basketball", label: "Basketball",       icon: "🏀"  },
  { value: "tekken",     label: "Tekken 8",         icon: "👊"  },
  { value: "valorant",   label: "Valorant",         icon: "🔫"  },
];

const FORMATS: { value: StageFormat; label: string; desc: string }[] = [
  { value: "single_elim", label: "Single Elimination", desc: "One loss = out" },
  { value: "double_elim", label: "Double Elimination", desc: "Two losses = out" },
  { value: "group",       label: "Group Stage",        desc: "Round robin groups" },
  { value: "round_robin", label: "Round Robin",        desc: "Everyone plays everyone" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTournamentModal({ visible, onClose, onCreated }: Props) {
  const [name,     setName]     = useState("");
  const [gameType, setGameType] = useState<GameType>("mlbb");
  const [format,   setFormat]   = useState<StageFormat>("single_elim");
  const [loading,  setLoading]  = useState(false);
 
  const reset = () => {
    setName("");
    setGameType("mlbb");
    setFormat("single_elim");
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Missing name", "Please enter a tournament name.");
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("tournaments").insert({
      name:          name.trim(),
      game_type:     gameType,
      stat_template: getStatTemplate(gameType),
      status:        "setup",
      created_by:    user?.id,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    reset();
    onCreated();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{
        flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "flex-end",
      }}>
        <View style={{
          backgroundColor: "#0F0F1E",
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderWidth: 0.5, borderColor: "#2A2A4A",
          padding: 24, maxHeight: "90%",
        }}>
          {/* Handle */}
          <View style={{
            width: 40, height: 4, borderRadius: 2,
            backgroundColor: "#374151", alignSelf: "center", marginBottom: 20,
          }} />

          <Text style={{ color: "#F1F5F9", fontSize: 18, fontWeight: "700", marginBottom: 20 }}>
            New Tournament
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Name */}
            <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 6, fontWeight: "600" }}>
              TOURNAMENT NAME
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. MLBB Manila Cup 2026"
              placeholderTextColor="#374151"
              style={{
                backgroundColor: "#16162A",
                borderRadius: 12, borderWidth: 0.5, borderColor: "#2A2A4A",
                color: "#F1F5F9", fontSize: 15,
                paddingHorizontal: 16, paddingVertical: 14,
                marginBottom: 20,
              }}
            />

            {/* Game type */}
            <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 10, fontWeight: "600" }}>
              GAME TYPE
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {GAME_TYPES.map(g => (
                <TouchableOpacity
                  key={g.value}
                  onPress={() => setGameType(g.value)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 6,
                    paddingHorizontal: 14, paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: gameType === g.value ? "#1E3A5F" : "#16162A",
                    borderWidth: 0.5,
                    borderColor: gameType === g.value ? "#60A5FA" : "#2A2A4A",
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{g.icon}</Text>
                  <Text style={{
                    color: gameType === g.value ? "#60A5FA" : "#94A3B8",
                    fontSize: 13, fontWeight: "500",
                  }}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Format */}
            <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 10, fontWeight: "600" }}>
              BRACKET FORMAT
            </Text>
            {FORMATS.map(f => (
              <TouchableOpacity
                key={f.value}
                onPress={() => setFormat(f.value)}
                style={{
                  flexDirection: "row", alignItems: "center",
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderRadius: 12, marginBottom: 8,
                  backgroundColor: format === f.value ? "#1E3A5F" : "#16162A",
                  borderWidth: 0.5,
                  borderColor: format === f.value ? "#60A5FA" : "#2A2A4A",
                }}
              >
                {/* Radio dot */}
                <View style={{
                  width: 18, height: 18, borderRadius: 9,
                  borderWidth: 2,
                  borderColor: format === f.value ? "#60A5FA" : "#374151",
                  alignItems: "center", justifyContent: "center",
                  marginRight: 12,
                }}>
                  {format === f.value && (
                    <View style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: "#60A5FA",
                    }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: format === f.value ? "#F1F5F9" : "#94A3B8",
                    fontSize: 14, fontWeight: "500",
                  }}>
                    {f.label}
                  </Text>
                  <Text style={{ color: "#4B5563", fontSize: 12, marginTop: 2 }}>
                    {f.desc}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <View style={{ height: 20 }} />

            {/* Buttons */}
            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              style={{
                backgroundColor: "#6C63FF",
                borderRadius: 14, paddingVertical: 16,
                alignItems: "center", marginBottom: 12,
              }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                    Create Tournament
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { reset(); onClose(); }}
              style={{
                borderRadius: 14, paddingVertical: 14,
                alignItems: "center",
                borderWidth: 0.5, borderColor: "#2A2A4A",
              }}
            >
              <Text style={{ color: "#64748B", fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function getStatTemplate(game: GameType): Record<string, unknown> {
  const templates: Record<GameType, Record<string, unknown>> = {
    mlbb:       { stats: ["kills", "deaths", "assists"] },
    cod:        { stats: ["kills", "deaths", "objectives"] },
    basketball: { stats: ["points", "rebounds", "assists", "fouls"] },
    tekken:     { stats: ["rounds_won"] },
    valorant:   { stats: ["kills", "deaths", "assists", "spike_plants"] },
  };
  return templates[game] ?? templates.mlbb;
}
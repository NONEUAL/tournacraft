import { TouchableOpacity, View, Text } from "react-native";
import { Tournament } from "../lib/types";

const GAME_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  mlbb:       { icon: "⚔️",  color: "#60A5FA", bg: "#1E3A5F" },
  cod:        { icon: "🎯",  color: "#F87171", bg: "#5F1E1E" },
  basketball: { icon: "🏀",  color: "#FB923C", bg: "#5F3A1E" },
  tekken:     { icon: "👊",  color: "#A78BFA", bg: "#3A1E5F" },
  valorant:   { icon: "🔫",  color: "#4ADE80", bg: "#1E5F3A" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  setup:     { label: "Setup",     color: "#94A3B8", bg: "#1E293B" },
  active:    { label: "Live",      color: "#4ADE80", bg: "#14532D" },
  completed: { label: "Done",      color: "#60A5FA", bg: "#1E3A5F" },
  archived:  { label: "Archived",  color: "#6B7280", bg: "#1F2937" },
};

interface Props {
  tournament: Tournament;
  teamCount?: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function TournamentCard({ tournament, teamCount = 0, onPress, onLongPress }: Props) {
  const game   = GAME_CONFIG[tournament.game_type]   ?? GAME_CONFIG.mlbb;
  const status = STATUS_CONFIG[tournament.status]    ?? STATUS_CONFIG.setup;
  const date   = new Date(tournament.created_at).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: "#16162A",
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: "#2A2A4A",
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Top row */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        {/* Game icon */}
        <View style={{
          width: 44, height: 44, borderRadius: 12,
          backgroundColor: game.bg,
          alignItems: "center", justifyContent: "center",
          marginRight: 12,
        }}>
          <Text style={{ fontSize: 20 }}>{game.icon}</Text>
        </View>

        {/* Name + game */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#F1F5F9", fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
            {tournament.name}
          </Text>
          <Text style={{ color: game.color, fontSize: 12, marginTop: 2 }}>
            {tournament.game_type.toUpperCase()}
          </Text>
        </View>

        {/* Status chip */}
        <View style={{
          paddingHorizontal: 10, paddingVertical: 4,
          borderRadius: 20, backgroundColor: status.bg,
        }}>
          <Text style={{ color: status.color, fontSize: 11, fontWeight: "600" }}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Bottom row */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingTop: 12,
        borderTopWidth: 0.5, borderTopColor: "#2A2A4A",
      }}>
        <Text style={{ color: "#64748B", fontSize: 12 }}>
          👥 {teamCount} {teamCount === 1 ? "team" : "teams"}
        </Text>
        <Text style={{ color: "#374151", fontSize: 12, marginHorizontal: 8 }}>·</Text>
        <Text style={{ color: "#64748B", fontSize: 12 }}>
          📅 {date}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: "#4B5563", fontSize: 18 }}>›</Text>
      </View>
    </TouchableOpacity>
  );
}
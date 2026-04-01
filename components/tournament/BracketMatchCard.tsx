import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BracketMatch } from "@/lib/bracketUtils";

interface Props {
  match: BracketMatch;
  onPopOut: (match: BracketMatch) => void;
}

const STATUS_COLORS = {
  pending:   { border: "#1A1A3A", bg: "#0A0A1E" },
  live:      { border: "#16A34A", bg: "#052e16" },
  completed: { border: "#1A1A3A", bg: "#0A0A1E" },
  bye:       { border: "#111123", bg: "#080812" },
};

export default function BracketMatchCard({ match, onPopOut }: Props) {
  const colors  = STATUS_COLORS[match.status] ?? STATUS_COLORS.pending;
  const isLive  = match.status === "live";
  const isDone  = match.status === "completed";
  const isBye   = match.status === "bye";

  const teamAWon = isDone && match.winner_id === match.team_a_id;
  const teamBWon = isDone && match.winner_id === match.team_b_id;

  const teamAName = match.team_a?.name ?? (match.team_a_id ? "TBD" : "BYE");
  const teamBName = match.team_b?.name ?? (match.team_b_id ? "TBD" : "BYE");

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.bg }]}>
      {/* Live pulse indicator */}
      {isLive && (
        <View style={styles.liveDot} />
      )}

      {/* Match number label */}
      <View style={styles.matchNumRow}>
        <Text style={styles.matchNum}>M{match.match_number}</Text>
        {!isBye && (
          <TouchableOpacity
            onPress={() => onPopOut(match)}
            style={styles.popOutBtn}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="external-link" size={10} color="#374151" />
          </TouchableOpacity>
        )}
      </View>

      {/* Team A row */}
      <View style={[
        styles.teamRow,
        styles.teamRowTop,
        teamAWon && styles.teamRowWinner,
        teamBWon && styles.teamRowLoser,
      ]}>
        <Text
          style={[styles.teamName, teamAWon && styles.teamNameWinner]}
          numberOfLines={1}
        >
          {teamAName}
        </Text>
        {(isLive || isDone) && match.team_a_id && (
          <Text style={[styles.score, teamAWon && styles.scoreWinner]}>
            {match.team_a_score}
          </Text>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Team B row */}
      <View style={[
        styles.teamRow,
        styles.teamRowBottom,
        teamBWon && styles.teamRowWinner,
        teamAWon && styles.teamRowLoser,
      ]}>
        <Text
          style={[styles.teamName, teamBWon && styles.teamNameWinner]}
          numberOfLines={1}
        >
          {teamBName}
        </Text>
        {(isLive || isDone) && match.team_b_id && (
          <Text style={[styles.score, teamBWon && styles.scoreWinner]}>
            {match.team_b_score}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  liveDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    zIndex: 2,
  },
  matchNumRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 4,
  },
  matchNum: {
    color: "#2D3748",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  popOutBtn: {
    padding: 2,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  teamRowTop: {},
  teamRowBottom: {},
  teamRowWinner: {
    backgroundColor: "rgba(34,197,94,0.06)",
  },
  teamRowLoser: {
    opacity: 0.45,
  },
  teamName: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  teamNameWinner: {
    color: "#F1F5F9",
    fontWeight: "700",
  },
  score: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
    minWidth: 20,
    textAlign: "right",
    fontVariant: ["tabular-nums"] as any,
  },
  scoreWinner: {
    color: "#22C55E",
  },
  divider: {
    height: 1,
    backgroundColor: "#111123",
    marginHorizontal: 10,
  },
});
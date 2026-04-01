import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { BracketMatch } from "@/lib/bracketUtils";
import { Team } from "@/lib/types";

interface Props {
  match:     BracketMatch;
  gameType:  string;
  onClose:   () => void;
  onUpdated: () => void;
}

// ── Score step helper ─────────────────────────────────────────────────────
// Returns the increment/decrement step and max per game type
const GAME_SCORE_CONFIG: Record<string, { step: number; max: number; label: string }> = {
  basketball: { step: 1, max: 200, label: "PTS" },
  mlbb:       { step: 1, max: 10,  label: "WIN" },
  cod:        { step: 1, max: 10,  label: "WIN" },
  valorant:   { step: 1, max: 13,  label: "RND" },
  tekken:     { step: 1, max: 10,  label: "RND" },
};

export default function MatchControllerModal({ match, gameType, onClose, onUpdated }: Props) {
  const [scoreA,    setScoreA]    = useState(match.team_a_score ?? 0);
  const [scoreB,    setScoreB]    = useState(match.team_b_score ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [status,    setStatus]    = useState(match.status);

  const cfg      = GAME_SCORE_CONFIG[gameType] ?? GAME_SCORE_CONFIG.mlbb;
  const teamA    = match.team_a;
  const teamB    = match.team_b;
  const isLive   = status === "live";
  const isDone   = status === "completed";

  // Determine winner from current scores
  const leadingTeam: Team | null =
    scoreA > scoreB ? teamA :
    scoreB > scoreA ? teamB :
    null;

  // ── Start match (set status → live) ───────────────────────────────────
  const handleStart = async () => {
    const { error } = await supabase
      .from("matches")
      .update({ status: "live", team_a_score: 0, team_b_score: 0 })
      .eq("id", match.id);
    if (error) { Alert.alert("Error", error.message); return; }
    setStatus("live");
    setScoreA(0);
    setScoreB(0);
  };

  // ── Update scores in real-time ────────────────────────────────────────
  const pushScores = async (a: number, b: number) => {
    await supabase
      .from("matches")
      .update({ team_a_score: a, team_b_score: b })
      .eq("id", match.id);
  };

  const adjustScore = (team: "a" | "b", delta: number) => {
    if (isDone) return;
    if (team === "a") {
      const next = Math.max(0, Math.min(cfg.max, scoreA + delta));
      setScoreA(next);
      pushScores(next, scoreB);
    } else {
      const next = Math.max(0, Math.min(cfg.max, scoreB + delta));
      setScoreB(next);
      pushScores(scoreA, next);
    }
  };

  // ── Submit final result ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (scoreA === scoreB) {
      Alert.alert("Tie", "Scores are tied. Please resolve before submitting.");
      return;
    }

    const winnerId = scoreA > scoreB ? match.team_a_id : match.team_b_id;
    const winnerName = (scoreA > scoreB ? teamA : teamB)?.name ?? "Unknown";

    Alert.alert(
      "Confirm Result",
      `Declare "${winnerName}" as the winner?\n\n${teamA?.name ?? "?"} ${scoreA} — ${scoreB} ${teamB?.name ?? "?"}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            setSubmitting(true);
            try {
              const { error } = await supabase.rpc("submit_match_result", {
                p_match_id:    match.id,
                p_winner_id:   winnerId,
                p_score_a:     scoreA,
                p_score_b:     scoreB,
              });
              if (error) throw error;
              onUpdated();
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Failed to submit result.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.matchLabel}>Match {match.match_number}</Text>
              <Text style={styles.gameLabel}>{gameType.toUpperCase()} · {cfg.label}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* ── Score board ── */}
          <View style={styles.scoreboard}>

            {/* Team A */}
            <View style={[styles.teamPanel, scoreA > scoreB && isLive && styles.teamPanelLeading]}>
              <Text style={styles.teamPanelName} numberOfLines={2}>
                {teamA?.name ?? "TBD"}
              </Text>

              <View style={styles.scoreControls}>
                <TouchableOpacity
                  onPress={() => adjustScore("a", -cfg.step)}
                  disabled={!isLive || scoreA <= 0}
                  style={[styles.scoreBtn, styles.scoreBtnMinus]}
                >
                  <Feather name="minus" size={16} color={(!isLive || scoreA <= 0) ? "#1F2937" : "#94A3B8"} />
                </TouchableOpacity>

                <Text style={[styles.scoreNum, scoreA > scoreB && styles.scoreNumLeading]}>
                  {scoreA}
                </Text>

                <TouchableOpacity
                  onPress={() => adjustScore("a", cfg.step)}
                  disabled={!isLive || scoreA >= cfg.max}
                  style={[styles.scoreBtn, styles.scoreBtnPlus]}
                >
                  <Feather name="plus" size={16} color={(!isLive || scoreA >= cfg.max) ? "#1F2937" : "#94A3B8"} />
                </TouchableOpacity>
              </View>

              {scoreA > scoreB && isLive && (
                <View style={styles.leadingBadge}>
                  <Text style={styles.leadingBadgeText}>Leading</Text>
                </View>
              )}
            </View>

            {/* VS divider */}
            <View style={styles.vsDivider}>
              <Text style={styles.vsText}>VS</Text>
              {isLive && <View style={styles.livePulse} />}
            </View>

            {/* Team B */}
            <View style={[styles.teamPanel, scoreB > scoreA && isLive && styles.teamPanelLeading]}>
              <Text style={styles.teamPanelName} numberOfLines={2}>
                {teamB?.name ?? "TBD"}
              </Text>

              <View style={styles.scoreControls}>
                <TouchableOpacity
                  onPress={() => adjustScore("b", -cfg.step)}
                  disabled={!isLive || scoreB <= 0}
                  style={[styles.scoreBtn, styles.scoreBtnMinus]}
                >
                  <Feather name="minus" size={16} color={(!isLive || scoreB <= 0) ? "#1F2937" : "#94A3B8"} />
                </TouchableOpacity>

                <Text style={[styles.scoreNum, scoreB > scoreA && styles.scoreNumLeading]}>
                  {scoreB}
                </Text>

                <TouchableOpacity
                  onPress={() => adjustScore("b", cfg.step)}
                  disabled={!isLive || scoreB >= cfg.max}
                  style={[styles.scoreBtn, styles.scoreBtnPlus]}
                >
                  <Feather name="plus" size={16} color={(!isLive || scoreB >= cfg.max) ? "#1F2937" : "#94A3B8"} />
                </TouchableOpacity>
              </View>

              {scoreB > scoreA && isLive && (
                <View style={styles.leadingBadge}>
                  <Text style={styles.leadingBadgeText}>Leading</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Action buttons ── */}
          <View style={styles.actions}>
            {status === "pending" && (
              <TouchableOpacity onPress={handleStart} style={styles.startBtn} activeOpacity={0.85}>
                <Feather name="play" size={14} color="#fff" />
                <Text style={styles.startBtnText}>Start Match</Text>
              </TouchableOpacity>
            )}

            {isLive && (
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting || scoreA === scoreB}
                style={[
                  styles.submitBtn,
                  (submitting || scoreA === scoreB) && styles.submitBtnDisabled,
                ]}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Feather name="check-circle" size={14} color="#fff" />
                      <Text style={styles.submitBtnText}>Submit Result</Text>
                    </>
                }
              </TouchableOpacity>
            )}

            {isDone && (
              <View style={styles.resultBanner}>
                <Feather name="award" size={14} color="#22C55E" />
                <Text style={styles.resultBannerText}>
                  {(scoreA > scoreB ? teamA : teamB)?.name ?? "?"} wins!
                </Text>
              </View>
            )}
          </View>

          {/* ── Game-specific hint ── */}
          <Text style={styles.hint}>
            {gameType === "basketball" && "Tap +/− to update points live"}
            {gameType === "mlbb"       && "Each point = 1 game win"}
            {gameType === "tekken"     && "Count rounds won, not sets"}
            {gameType === "valorant"   && "Track rounds won per half"}
            {gameType === "cod"        && "Each point = 1 game win"}
          </Text>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  panel: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#0C0C1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1A1A3A",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.5,
    shadowRadius: 48,
    elevation: 20,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#111123",
  },
  matchLabel: {
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "700",
  },
  gameLabel: {
    color: "#374151",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#111123",
  },

  // Scoreboard
  scoreboard: {
    flexDirection: "row",
    alignItems: "stretch",
    padding: 20,
    gap: 12,
  },
  teamPanel: {
    flex: 1,
    backgroundColor: "#0A0A1E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#111123",
    padding: 16,
    alignItems: "center",
    gap: 14,
    position: "relative",
    overflow: "hidden",
  },
  teamPanelLeading: {
    borderColor: "#14532d",
    backgroundColor: "#030d07",
  },
  teamPanelName: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  scoreControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  scoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBtnMinus: {
    backgroundColor: "#111123",
    borderWidth: 1,
    borderColor: "#1A1A3A",
  },
  scoreBtnPlus: {
    backgroundColor: "#111123",
    borderWidth: 1,
    borderColor: "#1A1A3A",
  },
  scoreNum: {
    color: "#64748B",
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"] as any,
    minWidth: 56,
    textAlign: "center",
    lineHeight: 52,
  },
  scoreNumLeading: {
    color: "#22C55E",
  },
  leadingBadge: {
    position: "absolute",
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#052e16",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#14532d",
  },
  leadingBadgeText: {
    color: "#16A34A",
    fontSize: 10,
    fontWeight: "600",
  },

  // VS divider
  vsDivider: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  vsText: {
    color: "#1F2937",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },

  // Actions
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#052e16",
    borderWidth: 1,
    borderColor: "#14532d",
    borderRadius: 12,
    paddingVertical: 14,
  },
  startBtnText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "700",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#052e16",
    borderWidth: 1,
    borderColor: "#14532d",
    borderRadius: 12,
    paddingVertical: 14,
  },
  resultBannerText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "700",
  },

  // Hint
  hint: {
    color: "#1F2937",
    fontSize: 11,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
});
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Stage, Match, Team } from "@/lib/types";
import { BracketMatch, groupMatchesIntoRounds } from "@/lib/bracketUtils";
import BracketTree from "./BracketTree";
import MatchControllerModal from "./MatchControllerModal";

interface Props {
  tournamentId: string;
  gameType: string;
  tournamentStatus: string;
}

export default function BracketTab({ tournamentId, gameType, tournamentStatus }: Props) {
  const [stage,          setStage]          = useState<Stage | null>(null);
  const [matches,        setMatches]        = useState<BracketMatch[]>([]);
  const [teams,          setTeams]          = useState<Record<string, Team>>({});
  const [loading,        setLoading]        = useState(true);
  const [generating,     setGenerating]     = useState(false);
  const [activeMatch,    setActiveMatch]    = useState<BracketMatch | null>(null);
  const [teamCount,      setTeamCount]      = useState(0);

  // ── Fetch stage + matches + teams ────────────────────────────────────
  const fetchBracket = useCallback(async () => {
    // 1. Get teams for this tournament (build lookup map)
    const { data: teamData } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournamentId);

    const teamMap: Record<string, Team> = {};
    (teamData ?? []).forEach((t: Team) => { teamMap[t.id] = t; });
    setTeams(teamMap);
    setTeamCount((teamData ?? []).length);

    // 2. Get stage
    const { data: stageData } = await supabase
      .from("stages")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("sequence_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!stageData) {
      setStage(null);
      setMatches([]);
      return;
    }
    setStage(stageData);

    // 3. Get matches for stage
    const { data: matchData, error } = await supabase
      .from("matches")
      .select("*")
      .eq("stage_id", stageData.id)
      .order("match_number", { ascending: true });

    if (error) { Alert.alert("Error", error.message); return; }

    // 4. Hydrate matches with team objects
    const hydrated: BracketMatch[] = (matchData ?? []).map((m: Match) => ({
      ...m,
      round:   0, // computed by groupMatchesIntoRounds
      position: 0,
      team_a:  m.team_a_id ? (teamMap[m.team_a_id] ?? null) : null,
      team_b:  m.team_b_id ? (teamMap[m.team_b_id] ?? null) : null,
      winner:  m.winner_id ? (teamMap[m.winner_id] ?? null) : null,
    }));

    setMatches(hydrated);
  }, [tournamentId]);

  useEffect(() => {
    fetchBracket().finally(() => setLoading(false));
  }, [fetchBracket]);

  // ── Real-time match updates ───────────────────────────────────────────
  useEffect(() => {
    if (!stage) return;
    const channel = supabase
      .channel(`matches-${stage.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `stage_id=eq.${stage.id}` },
        fetchBracket
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [stage, fetchBracket]);

  // ── Generate bracket ─────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (teamCount < 2) {
      Alert.alert("Not enough teams", "Add at least 2 teams before generating the bracket.");
      return;
    }

    Alert.alert(
      "Generate Bracket",
      `This will create a single-elimination bracket for ${teamCount} teams. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Generate",
          onPress: async () => {
            setGenerating(true);
            try {
              const { error } = await supabase.rpc("generate_bracket", {
                p_tournament_id: tournamentId,
              });
              if (error) throw error;
              await fetchBracket();
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Failed to generate bracket.");
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  };

  // ── Activate tournament (set status → active) ─────────────────────────
  const handleActivate = async () => {
    const { error } = await supabase
      .from("tournaments")
      .update({ status: "active" })
      .eq("id", tournamentId);
    if (error) Alert.alert("Error", error.message);
  };

  // ── Rounds data ───────────────────────────────────────────────────────
  const rounds = groupMatchesIntoRounds(matches);

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  // ── No bracket yet ────────────────────────────────────────────────────
  if (!stage || matches.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Feather name="git-merge" size={28} color="#2D3748" />
        </View>
        <Text style={styles.emptyTitle}>No bracket yet</Text>
        <Text style={styles.emptySubtitle}>
          {teamCount < 2
            ? `Add at least 2 teams first (${teamCount} registered)`
            : `${teamCount} teams ready — generate the bracket to begin`}
        </Text>

        {teamCount >= 2 && (
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={generating}
            style={styles.generateBtn}
            activeOpacity={0.85}
          >
            {generating
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Feather name="zap" size={14} color="#fff" />
                  <Text style={styles.generateBtnText}>Generate Bracket</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── Stats bar ─────────────────────────────────────────────────────────
  const totalM     = matches.length;
  const completedM = matches.filter(m => m.status === "completed").length;
  const liveM      = matches.filter(m => m.status === "live").length;
  const pendingM   = matches.filter(m => m.status === "pending").length;

  return (
    <View style={styles.container}>
      {/* ── Header bar ── */}
      <View style={styles.headerBar}>
        <View style={styles.statsRow}>
          {[
            { label: "Total",     value: totalM,     color: "#4B5563" },
            { label: "Live",      value: liveM,      color: "#22C55E" },
            { label: "Done",      value: completedM, color: "#60A5FA" },
            { label: "Pending",   value: pendingM,   color: "#374151" },
          ].map(s => (
            <View key={s.label} style={styles.stat}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.headerActions}>
          {tournamentStatus !== "active" && completedM === 0 && (
            <TouchableOpacity
              onPress={handleActivate}
              style={styles.activateBtn}
              activeOpacity={0.8}
            >
              <Feather name="play" size={12} color="#22C55E" />
              <Text style={styles.activateBtnText}>Start Tournament</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={generating}
            style={styles.regenBtn}
            activeOpacity={0.8}
          >
            <Feather name="refresh-cw" size={12} color="#374151" />
            <Text style={styles.regenBtnText}>Regenerate</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Bracket tree ── */}
      <View style={styles.treeWrap}>
        <BracketTree
          rounds={rounds}
          onPopOut={(match) => setActiveMatch(match)}
        />
      </View>

      {/* ── Match controller modal ── */}
      {activeMatch && (
        <MatchControllerModal
          match={activeMatch}
          gameType={gameType}
          onClose={() => setActiveMatch(null)}
          onUpdated={() => { fetchBracket(); setActiveMatch(null); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1, alignItems: "center", justifyContent: "center",
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#0C0C1A",
    borderWidth: 1,
    borderColor: "#13132A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    color: "#374151",
    fontSize: 13,
    textAlign: "center",
    maxWidth: 320,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#6C63FF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 11,
    marginTop: 8,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Container
  container: {
    flex: 1,
  },

  // Header bar
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#0F0F22",
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statVal: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statLabel: {
    color: "#2D3748",
    fontSize: 11,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  activateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#052e16",
    borderWidth: 1,
    borderColor: "#14532d",
  },
  activateBtnText: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "600",
  },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#0C0C1A",
    borderWidth: 1,
    borderColor: "#1A1A3A",
  },
  regenBtnText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "500",
  },

  // Tree
  treeWrap: {
    flex: 1,
    backgroundColor: "#080812",
  },
});
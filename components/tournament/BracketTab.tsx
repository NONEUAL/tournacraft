import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
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
  const [stage,       setStage]       = useState<Stage | null>(null);
  const [matches,     setMatches]     = useState<BracketMatch[]>([]);
  const [teams,       setTeams]       = useState<Record<string, Team>>({});
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [activeMatch, setActiveMatch] = useState<BracketMatch | null>(null);
  const [teamCount,   setTeamCount]   = useState(0);
  const [debugLog,    setDebugLog]    = useState<string[]>([]);

  const log = useCallback((msg: string) => {
    console.log("[BracketTab]", msg);
    setDebugLog(prev => [...prev.slice(-10), msg]);
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────
  const fetchBracket = useCallback(async () => {
    log(`fetchBracket — tournamentId: ${tournamentId}`);

    const { data: teamData, error: teamErr } = await supabase
      .from("teams").select("*").eq("tournament_id", tournamentId);
    if (teamErr) log(`❌ teams error: ${teamErr.message}`);

    const teamMap: Record<string, Team> = {};
    (teamData ?? []).forEach((t: Team) => { teamMap[t.id] = t; });
    setTeams(teamMap);
    const tc = (teamData ?? []).length;
    setTeamCount(tc);
    log(`teams: ${tc}`);

    const { data: stageData, error: stageErr } = await supabase
      .from("stages").select("*")
      .eq("tournament_id", tournamentId)
      .order("sequence_order", { ascending: true })
      .limit(1).maybeSingle();
    if (stageErr) log(`❌ stage error: ${stageErr.message}`);

    if (!stageData) { log("no stage found"); setStage(null); setMatches([]); return; }
    log(`stage: ${stageData.id}`);
    setStage(stageData);

    const { data: matchData, error: matchErr } = await supabase
      .from("matches").select("*").eq("stage_id", stageData.id)
      .order("match_number", { ascending: true });
    if (matchErr) { log(`❌ matches error: ${matchErr.message}`); return; }
    log(`matches: ${(matchData ?? []).length}`);

    const hydrated: BracketMatch[] = (matchData ?? []).map((m: Match) => ({
      ...m, round: 0, position: 0,
      team_a: m.team_a_id ? (teamMap[m.team_a_id] ?? null) : null,
      team_b: m.team_b_id ? (teamMap[m.team_b_id] ?? null) : null,
      winner: m.winner_id ? (teamMap[m.winner_id] ?? null) : null,
    }));
    setMatches(hydrated);
  }, [tournamentId, log]);

  useEffect(() => {
    fetchBracket().finally(() => setLoading(false));
  }, [fetchBracket]);

  useEffect(() => {
    if (!stage) return;
    const ch = supabase.channel(`matches-${stage.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `stage_id=eq.${stage.id}` },
        fetchBracket)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [stage, fetchBracket]);

  // ── Generate — NO Alert.alert, runs directly ─────────────────────────
  const runGenerate = useCallback(async () => {
    log("▶ runGenerate start");
    setGenerating(true);
    try {
      // First check auth
      const { data: { user } } = await supabase.auth.getUser();
      log(`auth user: ${user?.id ?? "NULL — not logged in!"}`);

      log(`calling RPC generate_bracket…`);
      const { data, error } = await supabase.rpc("generate_bracket", {
        p_tournament_id: tournamentId,
      });
      log(`RPC result → error: ${error ? error.message : "none"} | data: ${JSON.stringify(data)}`);

      if (error) {
        Alert.alert("RPC Error", `${error.code}: ${error.message}\n\nHint: ${error.hint ?? "none"}`);
        return;
      }

      log("RPC success — refetching bracket…");
      await fetchBracket();
      log("✅ done");
    } catch (e: any) {
      const msg = e?.message ?? JSON.stringify(e);
      log(`💥 caught: ${msg}`);
      Alert.alert("Error", msg);
    } finally {
      setGenerating(false);
    }
  }, [tournamentId, log, fetchBracket]);

  const handleActivate = async () => {
    const { error } = await supabase.from("tournaments")
      .update({ status: "active" }).eq("id", tournamentId);
    if (error) Alert.alert("Error", error.message);
  };

  const rounds     = groupMatchesIntoRounds(matches);
  const totalM     = matches.length;
  const completedM = matches.filter(m => m.status === "completed" || m.status === "bye").length;
  const liveM      = matches.filter(m => m.status === "live").length;
  const pendingM   = matches.filter(m => m.status === "pending").length;

  // ── Debug panel (always visible while no bracket) ────────────────────
  const DebugPanel = () => (
    <View style={styles.debugBox}>
      {debugLog.map((l, i) => (
        <Text key={i} style={styles.debugLine}>{l}</Text>
      ))}
    </View>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#6C63FF" /></View>;
  }

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
            : `${teamCount} teams ready`}
        </Text>

        {teamCount >= 2 && (
          <TouchableOpacity
            onPress={runGenerate}   // ← direct, no Alert confirm
            disabled={generating}
            style={styles.generateBtn}
            activeOpacity={0.85}
          >
            {generating
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Feather name="zap" size={14} color="#fff" /><Text style={styles.generateBtnText}>Generate Bracket</Text></>
            }
          </TouchableOpacity>
        )}

        <DebugPanel />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.statsRow}>
          {[
            { label: "Total",   value: totalM,     color: "#4B5563" },
            { label: "Live",    value: liveM,      color: "#22C55E" },
            { label: "Done",    value: completedM, color: "#60A5FA" },
            { label: "Pending", value: pendingM,   color: "#374151" },
          ].map(s => (
            <View key={s.label} style={styles.stat}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.headerActions}>
          {tournamentStatus !== "active" && completedM === 0 && (
            <TouchableOpacity onPress={handleActivate} style={styles.activateBtn} activeOpacity={0.8}>
              <Feather name="play" size={12} color="#22C55E" />
              <Text style={styles.activateBtnText}>Start Tournament</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={runGenerate} disabled={generating} style={styles.regenBtn} activeOpacity={0.8}>
            <Feather name="refresh-cw" size={12} color="#374151" />
            <Text style={styles.regenBtnText}>Regenerate</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.treeWrap}>
        <BracketTree rounds={rounds} onPopOut={(match) => setActiveMatch(match)} />
      </View>

      {activeMatch && (
        <MatchControllerModal
          match={activeMatch} gameType={gameType}
          onClose={() => setActiveMatch(null)}
          onUpdated={() => { fetchBracket(); setActiveMatch(null); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: "#0C0C1A", borderWidth: 1, borderColor: "#13132A",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle:    { color: "#64748B", fontSize: 16, fontWeight: "700" },
  emptySubtitle: { color: "#374151", fontSize: 13, textAlign: "center", maxWidth: 320 },
  debugBox: {
    marginTop: 16, padding: 12, backgroundColor: "#0A0A1E",
    borderRadius: 8, borderWidth: 1, borderColor: "#1A1A3A",
    alignSelf: "stretch", maxWidth: 520, gap: 3,
  },
  debugLine: { color: "#4B8563", fontSize: 11, fontFamily: "monospace" as any },
  generateBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#6C63FF", paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 11, marginTop: 4,
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  generateBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#0F0F22",
  },
  statsRow:      { flexDirection: "row", gap: 20 },
  stat:          { flexDirection: "row", alignItems: "center", gap: 6 },
  statVal:       { fontSize: 16, fontWeight: "800", letterSpacing: -0.5 },
  statLabel:     { color: "#2D3748", fontSize: 11, fontWeight: "500" },
  headerActions: { flexDirection: "row", gap: 8 },
  activateBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    backgroundColor: "#052e16", borderWidth: 1, borderColor: "#14532d",
  },
  activateBtnText: { color: "#22C55E", fontSize: 12, fontWeight: "600" },
  regenBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    backgroundColor: "#0C0C1A", borderWidth: 1, borderColor: "#1A1A3A",
  },
  regenBtnText: { color: "#374151", fontSize: 12, fontWeight: "500" },
  treeWrap:     { flex: 1, backgroundColor: "#080812" },
});
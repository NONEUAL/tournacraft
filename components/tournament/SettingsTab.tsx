import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Tournament, TournamentStatus } from "@/lib/types";
import * as XLSX from "xlsx";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";

interface Props {
  tournament: Tournament;
  onUpdated:  () => void;
}

const STATUS_OPTIONS: { value: TournamentStatus; label: string; desc: string; color: string; bg: string }[] = [
  { value: "setup",     label: "Setup",     desc: "Teams registration open",      color: "#94A3B8", bg: "#1E293B" },
  { value: "active",    label: "Live",      desc: "Tournament is running",        color: "#22C55E", bg: "#052e16" },
  { value: "completed", label: "Completed", desc: "All matches finished",         color: "#60A5FA", bg: "#1e3a5f" },
  { value: "archived",  label: "Archived",  desc: "Hidden from dashboard",        color: "#374151", bg: "#111827" },
];

export default function SettingsTab({ tournament, onUpdated }: Props) {
  const [saving,    setSaving]    = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Change status ────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: TournamentStatus) => {
    if (newStatus === tournament.status) return;

    const option = STATUS_OPTIONS.find(o => o.value === newStatus)!;
    Alert.alert(
      `Set to "${option.label}"?`,
      option.desc,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setSaving(true);
            const { error } = await supabase
              .from("tournaments")
              .update({ status: newStatus })
              .eq("id", tournament.id);
            setSaving(false);
            if (error) { Alert.alert("Error", error.message); return; }
            onUpdated();
          },
        },
      ]
    );
  };

  // ── Export to Excel ───────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      // 1. Fetch teams
      const { data: teams } = await supabase
        .from("teams")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("seed", { ascending: true, nullsFirst: false });

      // 2. Fetch players
      const { data: players } = await supabase
        .from("players")
        .select("*, teams!inner(tournament_id)")
        .eq("teams.tournament_id", tournament.id);

      // 3. Fetch matches (with stage)
      const { data: stages } = await supabase
        .from("stages")
        .select("id")
        .eq("tournament_id", tournament.id);

      const stageIds = (stages ?? []).map((s: any) => s.id);
      let matches: any[] = [];
      if (stageIds.length > 0) {
        const { data: matchData } = await supabase
          .from("matches")
          .select("*")
          .in("stage_id", stageIds)
          .order("match_number", { ascending: true });
        matches = matchData ?? [];
      }

      // Build team name lookup
      const teamMap: Record<string, string> = {};
      (teams ?? []).forEach((t: any) => { teamMap[t.id] = t.name; });

      // ── Sheet 1: Teams ──────────────────────────────────────────────
      const teamsSheet = XLSX.utils.json_to_sheet(
        (teams ?? []).map((t: any) => ({
          Seed:       t.seed ?? "",
          "Team Name": t.name,
          Created:    new Date(t.created_at).toLocaleDateString("en-PH"),
        }))
      );

      // ── Sheet 2: Players ────────────────────────────────────────────
      const playersSheet = XLSX.utils.json_to_sheet(
        (players ?? []).map((p: any) => ({
          Team:          teamMap[p.team_id] ?? p.team_id,
          "Player Name": p.name,
          Role:          p.role ?? "",
          "#":           p.jersey_number ?? "",
        }))
      );

      // ── Sheet 3: Matches ────────────────────────────────────────────
      const matchesSheet = XLSX.utils.json_to_sheet(
        matches.map((m: any) => ({
          "Match #":  m.match_number ?? "",
          "Team A":   teamMap[m.team_a_id] ?? "TBD",
          "Score A":  m.team_a_score,
          "Score B":  m.team_b_score,
          "Team B":   teamMap[m.team_b_id] ?? "TBD",
          Winner:     teamMap[m.winner_id] ?? "",
          Status:     m.status,
        }))
      );

      // ── Workbook ────────────────────────────────────────────────────
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, teamsSheet,   "Teams");
      XLSX.utils.book_append_sheet(wb, playersSheet, "Players");
      XLSX.utils.book_append_sheet(wb, matchesSheet, "Matches");

      const filename = `${tournament.name.replace(/[^a-z0-9]/gi, "_")}_export.xlsx`;
      const wbout   = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      if (Platform.OS === "web") {
        // Web: trigger browser download
        const blob = new Blob(
          [Uint8Array.from(atob(wbout), c => c.charCodeAt(0))],
          { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
        );
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href     = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Native: write to temp file + share
        const fileUri = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: `Export: ${tournament.name}`,
        });
      }
    } catch (e: any) {
      Alert.alert("Export Failed", e.message ?? "Unknown error.");
    } finally {
      setExporting(false);
    }
  };

  // ── Delete tournament ────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      `Delete "${tournament.name}"?`,
      "This will permanently delete the tournament, all teams, players, and match data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("tournaments")
              .delete()
              .eq("id", tournament.id);
            if (error) Alert.alert("Error", error.message);
            // Navigation handled by real-time update removing the row
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

      {/* ── Status section ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tournament Status</Text>
          <Text style={styles.sectionSubtitle}>
            Controls what actions are available and what players can see
          </Text>
        </View>

        <View style={styles.statusGrid}>
          {STATUS_OPTIONS.map((opt) => {
            const isCurrent = tournament.status === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleStatusChange(opt.value)}
                disabled={saving}
                style={[
                  styles.statusCard,
                  isCurrent && { borderColor: opt.color, backgroundColor: opt.bg },
                ]}
                activeOpacity={0.75}
              >
                <View style={styles.statusCardTop}>
                  <View style={[styles.statusDot, { backgroundColor: opt.color }]} />
                  <Text style={[styles.statusCardLabel, isCurrent && { color: opt.color }]}>
                    {opt.label}
                  </Text>
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.statusCardDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {saving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color="#6C63FF" />
            <Text style={styles.savingText}>Saving…</Text>
          </View>
        )}
      </View>

      {/* ── Export section ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Export Data</Text>
          <Text style={styles.sectionSubtitle}>
            Download tournament data as an Excel spreadsheet (.xlsx)
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleExport}
          disabled={exporting}
          style={styles.exportBtn}
          activeOpacity={0.85}
        >
          {exporting
            ? <ActivityIndicator size="small" color="#fff" />
            : <>
                <Feather name="download" size={15} color="#fff" />
                <Text style={styles.exportBtnText}>Export to Excel</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={styles.exportHint}>
          Includes: Teams, Players, and Match Results sheets
        </Text>
      </View>

      {/* ── Danger zone ── */}
      <View style={[styles.section, styles.dangerSection]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          <Text style={styles.sectionSubtitle}>
            Irreversible actions — proceed with caution
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleDelete}
          style={styles.deleteBtn}
          activeOpacity={0.85}
        >
          <Feather name="trash-2" size={14} color="#F87171" />
          <Text style={styles.deleteBtnText}>Delete Tournament</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:  { flex: 1 },
  content: { padding: 32, gap: 32, paddingBottom: 60 },

  // Section
  section: {
    backgroundColor: "#0C0C1A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#13132A",
    padding: 24,
    gap: 16,
  },
  dangerSection: {
    borderColor: "#3A1515",
    backgroundColor: "#0C0808",
  },
  sectionHeader: { gap: 4 },
  sectionTitle:  { color: "#D1D5DB", fontSize: 14, fontWeight: "700" },
  dangerTitle:   { color: "#F87171" },
  sectionSubtitle: { color: "#374151", fontSize: 12 },

  // Status grid
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#0A0A1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A3A",
    padding: 14,
    gap: 6,
  },
  statusCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusCardLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  statusCardDesc: {
    color: "#2D3748",
    fontSize: 11,
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 4,
  },
  currentBadgeText: {
    color: "#4B5563",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savingText: {
    color: "#4B5563",
    fontSize: 12,
  },

  // Export
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  exportBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  exportHint: {
    color: "#2D3748",
    fontSize: 11,
  },

  // Delete
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1c0a0a",
    borderWidth: 1,
    borderColor: "#3A1515",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
  },
  deleteBtnText: {
    color: "#F87171",
    fontSize: 14,
    fontWeight: "600",
  },
});
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Team, Player } from "@/lib/types";
import AddTeamForm from "./AddTeamForm";
import PlayerRoster from "./PlayerRoster";

interface Props {
  tournamentId: string;
  gameType: string;
}

export default function TeamsTab({ tournamentId, gameType }: Props) {
  const [teams,        setTeams]        = useState<Team[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showAddTeam,  setShowAddTeam]  = useState(false);
  const [hoveredId,    setHoveredId]    = useState<string | null>(null);

  // ── Fetch teams ──────────────────────────────────────────────────────────
  const fetchTeams = useCallback(async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) { Alert.alert("Error", error.message); return; }
    setTeams(data ?? []);

    // Auto-select first team if none selected
    setSelectedTeam(prev => {
      if (prev) {
        const still = (data ?? []).find(t => t.id === prev.id);
        return still ?? (data?.[0] ?? null);
      }
      return data?.[0] ?? null;
    });
  }, [tournamentId]);

  useEffect(() => {
    fetchTeams().finally(() => setLoading(false));
  }, [fetchTeams]);

  // ── Real-time ──────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`teams-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `tournament_id=eq.${tournamentId}` },
        fetchTeams
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTeams, tournamentId]);

  // ── Delete team ──────────────────────────────────────────────────────────
  const handleDeleteTeam = (team: Team) => {
    Alert.alert(
      `Delete "${team.name}"?`,
      "This will also delete all players on this team.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("teams").delete().eq("id", team.id);
            if (error) { Alert.alert("Error", error.message); return; }
            if (selectedTeam?.id === team.id) setSelectedTeam(null);
          },
        },
      ]
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ══ LEFT PANEL: Team list ══════════════════════════════════════════ */}
      <View style={styles.leftPanel}>
        {/* Panel header */}
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>Teams</Text>
            <Text style={styles.panelSubtitle}>
              {teams.length} team{teams.length !== 1 ? "s" : ""} registered
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddTeam(v => !v)}
            style={[styles.addBtn, showAddTeam && styles.addBtnActive]}
            activeOpacity={0.7}
          >
            <Feather
              name={showAddTeam ? "x" : "plus"}
              size={13}
              color={showAddTeam ? "#F87171" : "#A5A0FF"}
            />
            <Text style={[styles.addBtnText, showAddTeam && styles.addBtnTextActive]}>
              {showAddTeam ? "Cancel" : "Add Team"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add team inline form */}
        {showAddTeam && (
          <AddTeamForm
            tournamentId={tournamentId}
            onCreated={() => { setShowAddTeam(false); fetchTeams(); }}
            existingCount={teams.length}
          />
        )}

        {/* Team list */}
        <ScrollView
          style={styles.teamList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {teams.length === 0 && !showAddTeam ? (
            <View style={styles.emptyTeams}>
              <Text style={styles.emptyTeamsIcon}>👥</Text>
              <Text style={styles.emptyTeamsTitle}>No teams yet</Text>
              <Text style={styles.emptyTeamsSubtitle}>
                Add your first team to get started
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddTeam(true)}
                style={styles.emptyTeamsBtn}
              >
                <Text style={styles.emptyTeamsBtnText}>+ Add Team</Text>
              </TouchableOpacity>
            </View>
          ) : (
            teams.map((team, idx) => {
              const selected = selectedTeam?.id === team.id;
              const hovered  = hoveredId === team.id;
              return (
                <TouchableOpacity
                  key={team.id}
                  onPress={() => setSelectedTeam(team)}
                  style={[
                    styles.teamCard,
                    selected && styles.teamCardSelected,
                    hovered && !selected && styles.teamCardHovered,
                  ]}
                  activeOpacity={0.7}
                  {...(Platform.OS === "web"
                    ? {
                        onMouseEnter: () => setHoveredId(team.id),
                        onMouseLeave: () => setHoveredId(null),
                      }
                    : {})}
                >
                  {/* Seed badge */}
                  <View style={[styles.seedBadge, selected && styles.seedBadgeSelected]}>
                    <Text style={[styles.seedText, selected && styles.seedTextSelected]}>
                      {team.seed ?? idx + 1}
                    </Text>
                  </View>

                  {/* Team info */}
                  <View style={styles.teamInfo}>
                    <Text style={[styles.teamName, selected && styles.teamNameSelected]}>
                      {team.name}
                    </Text>
                    <PlayerCount teamId={team.id} />
                  </View>

                  {/* Delete */}
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); handleDeleteTeam(team); }}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={12} color="#1F2937" />
                  </TouchableOpacity>

                  {/* Selection indicator */}
                  {selected && <View style={styles.selectionBar} />}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* ══ RIGHT PANEL: Player roster ════════════════════════════════════ */}
      <View style={styles.rightPanel}>
        {selectedTeam ? (
          <PlayerRoster
            team={selectedTeam}
            gameType={gameType}
            onTeamUpdated={fetchTeams}
          />
        ) : (
          <View style={styles.noTeamSelected}>
            <Feather name="users" size={36} color="#111123" />
            <Text style={styles.noTeamText}>Select a team to view its roster</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Small helper: live player count badge ─────────────────────────────────
function PlayerCount({ teamId }: { teamId: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [teamId]);

  if (count === null) return null;
  return (
    <Text style={styles.playerCount}>
      {count} {count === 1 ? "player" : "players"}
    </Text>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    flexDirection: "row",
  },

  // ── Left Panel ──────────────────────────────────────────────────────────
  leftPanel: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: "#0F0F22",
    flexDirection: "column",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#0F0F22",
  },
  panelTitle: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "700",
  },
  panelSubtitle: {
    color: "#2D3748",
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#11112A",
    borderWidth: 1,
    borderColor: "#1A1A3A",
  },
  addBtnActive: {
    backgroundColor: "#1A0A0A",
    borderColor: "#3A1A1A",
  },
  addBtnText: {
    color: "#A5A0FF",
    fontSize: 12,
    fontWeight: "600",
  },
  addBtnTextActive: {
    color: "#F87171",
  },

  teamList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },

  // Team card
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 4,
    position: "relative",
    overflow: "hidden",
  },
  teamCardSelected: {
    backgroundColor: "#0D0D22",
    borderColor: "#1A1A3A",
  },
  teamCardHovered: {
    backgroundColor: "#0A0A1A",
    borderColor: "#111128",
  },
  seedBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#111123",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  seedBadgeSelected: {
    backgroundColor: "#1A1A3A",
  },
  seedText: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "700",
  },
  seedTextSelected: {
    color: "#6C63FF",
  },
  teamInfo: {
    flex: 1,
    overflow: "hidden",
  },
  teamName: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  teamNameSelected: {
    color: "#C4C0FF",
  },
  playerCount: {
    color: "#2D3748",
    fontSize: 11,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 4,
  },
  selectionBar: {
    position: "absolute",
    left: 0,
    top: "20%",
    bottom: "20%",
    width: 3,
    backgroundColor: "#6C63FF",
    borderRadius: 2,
  },

  // Empty teams
  emptyTeams: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyTeamsIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyTeamsTitle: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyTeamsSubtitle: {
    color: "#2D3748",
    fontSize: 12,
    textAlign: "center",
  },
  emptyTeamsBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#11112A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6C63FF",
  },
  emptyTeamsBtnText: {
    color: "#A5A0FF",
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Right Panel ─────────────────────────────────────────────────────────
  rightPanel: {
    flex: 1,
  },
  noTeamSelected: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  noTeamText: {
    color: "#1F2937",
    fontSize: 13,
  },
});
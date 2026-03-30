import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  TextInput, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Team, Player } from "@/lib/types";

// Per-game role options
const ROLE_OPTIONS: Record<string, string[]> = {
  mlbb:       ["Roamer", "Gold Lane", "Mid Lane", "Exp Lane", "Jungler"],
  valorant:   ["Duelist", "Initiator", "Controller", "Sentinel", "Flex"],
  cod:        ["Anchor", "Sub", "Search", "Flex"],
  basketball: ["PG", "SG", "SF", "PF", "C"],
  tekken:     ["Main", "Sub"],
  default:    ["Player", "Captain", "Sub"],
};

interface Props {
  team: Team;
  gameType: string;
  onTeamUpdated: () => void;
}

interface EditingPlayer {
  id:             string;
  name:           string;
  role:           string;
  jersey_number:  string;
}

export default function PlayerRoster({ team, gameType, onTeamUpdated }: Props) {
  const [players,      setPlayers]      = useState<Player[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editValues,   setEditValues]   = useState<EditingPlayer | null>(null);
  const [hoveredId,    setHoveredId]    = useState<string | null>(null);

  // New player form state
  const [newName,    setNewName]    = useState("");
  const [newJersey,  setNewJersey]  = useState("");
  const [newRole,    setNewRole]    = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const roles = ROLE_OPTIONS[gameType] ?? ROLE_OPTIONS.default;

  // ── Fetch players ─────────────────────────────────────────────────────
  const fetchPlayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: true });

    if (error) { Alert.alert("Error", error.message); return; }
    setPlayers(data ?? []);
  }, [team.id]);

  useEffect(() => {
    setLoading(true);
    fetchPlayers().finally(() => setLoading(false));
    setShowAddForm(false);
    setEditingId(null);
  }, [team.id, fetchPlayers]);

  // ── Real-time ─────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`players-${team.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `team_id=eq.${team.id}` },
        fetchPlayers
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPlayers, team.id]);

  // ── Add player ────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newName.trim()) { Alert.alert("Required", "Please enter a player name."); return; }
    setAddLoading(true);

    const { error } = await supabase.from("players").insert({
      team_id:       team.id,
      name:          newName.trim(),
      jersey_number: newJersey.trim() || null,
      role:          newRole  || null,
    });

    setAddLoading(false);
    if (error) { Alert.alert("Error", error.message); return; }

    setNewName("");
    setNewJersey("");
    setNewRole("");
    fetchPlayers();
    onTeamUpdated();
  };

  // ── Save edit ─────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editValues || !editValues.name.trim()) return;

    const { error } = await supabase
      .from("players")
      .update({
        name:          editValues.name.trim(),
        jersey_number: editValues.jersey_number.trim() || null,
        role:          editValues.role || null,
      })
      .eq("id", editValues.id);

    if (error) { Alert.alert("Error", error.message); return; }
    setEditingId(null);
    setEditValues(null);
    fetchPlayers();
  };

  // ── Delete player ─────────────────────────────────────────────────────
  const handleDelete = (player: Player) => {
    Alert.alert(
      `Remove "${player.name}"?`,
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove", style: "destructive",
          onPress: async () => {
            await supabase.from("players").delete().eq("id", player.id);
            fetchPlayers();
            onTeamUpdated();
          },
        },
      ]
    );
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.subtitle}>
            {players.length} {players.length === 1 ? "player" : "players"} · Seed #{team.seed ?? "—"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAddForm(v => !v)}
          style={[styles.addBtn, showAddForm && styles.addBtnActive]}
          activeOpacity={0.7}
        >
          <Feather
            name={showAddForm ? "x" : "user-plus"}
            size={13}
            color={showAddForm ? "#F87171" : "#A5A0FF"}
          />
          <Text style={[styles.addBtnText, showAddForm && styles.addBtnTextCancel]}>
            {showAddForm ? "Cancel" : "Add Player"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add player form */}
      {showAddForm && (
        <View style={styles.addForm}>
          <Text style={styles.formSectionTitle}>New Player</Text>
          <View style={styles.addFormRow}>
            {/* Jersey */}
            <View style={styles.jerseyField}>
              <Text style={styles.fieldLabel}>#</Text>
              <TextInput
                value={newJersey}
                onChangeText={setNewJersey}
                placeholder="00"
                placeholderTextColor="#2D3748"
                keyboardType="numeric"
                style={styles.jerseyInput}
                selectTextOnFocus
              />
            </View>

            {/* Name */}
            <View style={styles.nameField}>
              <Text style={styles.fieldLabel}>NAME</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Player name"
                placeholderTextColor="#2D3748"
                style={styles.nameInput}
                autoFocus
                onSubmitEditing={handleAdd}
                returnKeyType="done"
              />
            </View>

            {/* Role */}
            <View style={styles.roleField}>
              <Text style={styles.fieldLabel}>ROLE</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.roleScroll}
                contentContainerStyle={styles.roleScrollContent}
              >
                {roles.map(r => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setNewRole(r === newRole ? "" : r)}
                    style={[styles.roleChip, newRole === r && styles.roleChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.roleChipText, newRole === r && styles.roleChipTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleAdd}
            disabled={addLoading}
            style={styles.submitBtn}
            activeOpacity={0.8}
          >
            {addLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Feather name="check" size={13} color="#fff" />
                  <Text style={styles.submitText}>Add Player</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Player list */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Column headers */}
          {players.length > 0 && (
            <View style={styles.listHead}>
              <Text style={[styles.headCell, { width: 44 }]}>#</Text>
              <Text style={[styles.headCell, { flex: 1 }]}>NAME</Text>
              <Text style={[styles.headCell, { width: 110 }]}>ROLE</Text>
              <Text style={[styles.headCell, { width: 60, textAlign: "right" }]}>ACTIONS</Text>
            </View>
          )}

          {players.length === 0 ? (
            <View style={styles.emptyPlayers}>
              <Text style={styles.emptyPlayersIcon}>🎮</Text>
              <Text style={styles.emptyPlayersTitle}>No players yet</Text>
              <Text style={styles.emptyPlayersSubtitle}>
                Add players to this team roster
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddForm(true)}
                style={styles.emptyPlayersBtn}
              >
                <Text style={styles.emptyPlayersBtnText}>+ Add Player</Text>
              </TouchableOpacity>
            </View>
          ) : (
            players.map((player) => {
              const isEditing = editingId === player.id;
              const hov       = hoveredId === player.id;

              if (isEditing && editValues) {
                return (
                  <View key={player.id} style={styles.editRow}>
                    {/* Jersey edit */}
                    <TextInput
                      value={editValues.jersey_number}
                      onChangeText={v => setEditValues(ev => ev ? { ...ev, jersey_number: v } : ev)}
                      style={[styles.editInput, { width: 44, textAlign: "center" }]}
                      keyboardType="numeric"
                      placeholder="—"
                      placeholderTextColor="#2D3748"
                      selectTextOnFocus
                    />
                    {/* Name edit */}
                    <TextInput
                      value={editValues.name}
                      onChangeText={v => setEditValues(ev => ev ? { ...ev, name: v } : ev)}
                      style={[styles.editInput, { flex: 1 }]}
                      autoFocus
                      onSubmitEditing={handleSaveEdit}
                    />
                    {/* Role edit chips */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ width: 110 }}
                      contentContainerStyle={{ gap: 4 }}
                    >
                      {roles.map(r => (
                        <TouchableOpacity
                          key={r}
                          onPress={() => setEditValues(ev => ev ? { ...ev, role: r === ev.role ? "" : r } : ev)}
                          style={[styles.roleChipSm, editValues.role === r && styles.roleChipActive]}
                        >
                          <Text style={[styles.roleChipTextSm, editValues.role === r && styles.roleChipTextActive]}>
                            {r}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {/* Save / cancel */}
                    <View style={{ width: 60, flexDirection: "row", justifyContent: "flex-end", gap: 4 }}>
                      <TouchableOpacity onPress={handleSaveEdit} style={styles.saveBtn}>
                        <Feather name="check" size={12} color="#22C55E" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => { setEditingId(null); setEditValues(null); }}
                        style={styles.cancelBtn}
                      >
                        <Feather name="x" size={12} color="#F87171" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }

              return (
                <View
                  key={player.id}
                  style={[styles.playerRow, hov && styles.playerRowHovered]}
                  {...(Platform.OS === "web"
                    ? {
                        onMouseEnter: () => setHoveredId(player.id),
                        onMouseLeave: () => setHoveredId(null),
                      }
                    : {})}
                >
                  {/* Jersey */}
                  <View style={[styles.jerseyBadge, { width: 44 }]}>
                    <Text style={styles.jerseyNum}>
                      {player.jersey_number ? `#${player.jersey_number}` : "—"}
                    </Text>
                  </View>

                  {/* Name */}
                  <Text style={[styles.playerName, { flex: 1 }]} numberOfLines={1}>
                    {player.name}
                  </Text>

                  {/* Role */}
                  <View style={{ width: 110 }}>
                    {player.role ? (
                      <View style={styles.rolePill}>
                        <Text style={styles.rolePillText}>{player.role}</Text>
                      </View>
                    ) : (
                      <Text style={styles.noRole}>—</Text>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={{ width: 60, flexDirection: "row", justifyContent: "flex-end", gap: 4 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingId(player.id);
                        setEditValues({
                          id:            player.id,
                          name:          player.name,
                          role:          player.role ?? "",
                          jersey_number: player.jersey_number ?? "",
                        });
                      }}
                      style={styles.actionBtn}
                    >
                      <Feather name="edit-2" size={11} color="#374151" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(player)}
                      style={styles.actionBtn}
                    >
                      <Feather name="trash-2" size={11} color="#374151" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080812",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#0F0F22",
  },
  teamName: {
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: "#2D3748",
    fontSize: 11,
    marginTop: 3,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
  addBtnTextCancel: {
    color: "#F87171",
  },

  // Add Form
  addForm: {
    margin: 16,
    padding: 16,
    backgroundColor: "#0A0A1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A3A",
    gap: 12,
  },
  formSectionTitle: {
    color: "#2D3748",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  addFormRow: {
    gap: 10,
  },
  jerseyField: {
    gap: 4,
  },
  nameField: {
    gap: 4,
  },
  roleField: {
    gap: 4,
  },
  fieldLabel: {
    color: "#2D3748",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  jerseyInput: {
    width: 60,
    backgroundColor: "#111123",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1A1A3A",
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    outlineStyle: "none",
  } as any,
  roleScroll: {
    height: 32,
  },
  roleScrollContent: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#111123",
    borderWidth: 1,
    borderColor: "#1A1A3A",
  },
  roleChipActive: {
    backgroundColor: "#1A1A3A",
    borderColor: "#6C63FF",
  },
  roleChipText: {
    color: "#374151",
    fontSize: 11,
    fontWeight: "500",
  },
  roleChipTextActive: {
    color: "#A5A0FF",
    fontWeight: "600",
  },
  roleChipSm: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: "#111123",
    borderWidth: 1,
    borderColor: "#1A1A3A",
  },
  roleChipTextSm: {
    color: "#374151",
    fontSize: 10,
  },
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

  // Loading
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // List
  list: {
    flex: 1,
    paddingHorizontal: 24,
  },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0F0F22",
    marginBottom: 4,
  },
  headCell: {
    color: "#1F2937",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Player row
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  playerRowHovered: {
    backgroundColor: "#0C0C1A",
    borderColor: "#111128",
  },
  jerseyBadge: {
    alignItems: "center",
  },
  jerseyNum: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  playerName: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "500",
  },
  rolePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: "#111123",
    borderWidth: 1,
    borderColor: "#1A1A3A",
  },
  rolePillText: {
    color: "#6C63FF",
    fontSize: 10,
    fontWeight: "600",
  },
  noRole: {
    color: "#1F2937",
    fontSize: 13,
  },
  actionBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: "#0C0C1A",
  },

  // Edit row
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#0A0A1E",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1A1A3A",
    marginBottom: 2,
  },
  editInput: {
    backgroundColor: "#111123",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2A2A4A",
    color: "#D1D5DB",
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 6,
    outlineStyle: "none",
  } as any,
  saveBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#052e16",
    borderWidth: 1,
    borderColor: "#14532d",
  },
  cancelBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#1c0a0a",
    borderWidth: 1,
    borderColor: "#3a1515",
  },

  // Empty
  emptyPlayers: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 6,
  },
  emptyPlayersIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyPlayersTitle: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyPlayersSubtitle: {
    color: "#2D3748",
    fontSize: 12,
    textAlign: "center",
  },
  emptyPlayersBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#11112A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6C63FF",
  },
  emptyPlayersBtnText: {
    color: "#A5A0FF",
    fontSize: 12,
    fontWeight: "600",
  },
});
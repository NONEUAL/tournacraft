import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
  StyleSheet, Platform, TextInput,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { Tournament } from "@/lib/types";
import CreateTournamentModal from "@/components/CreateTournamentModal";

interface TournamentWithCount extends Tournament {
  team_count: number;
}

const GAME_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  mlbb:       { icon: "⚔️",  color: "#60A5FA", bg: "#1E3A5F" },
  cod:        { icon: "🎯",  color: "#F87171", bg: "#5F1E1E" },
  basketball: { icon: "🏀",  color: "#FB923C", bg: "#5F3A1E" },
  tekken:     { icon: "👊",  color: "#A78BFA", bg: "#3A1E5F" },
  valorant:   { icon: "🔫",  color: "#4ADE80", bg: "#1E5F3A" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  setup:     { label: "Setup",    color: "#64748B", dot: "#334155" },
  active:    { label: "Live",     color: "#22C55E", dot: "#16A34A" },
  completed: { label: "Done",     color: "#60A5FA", dot: "#2563EB" },
  archived:  { label: "Archived", color: "#374151", dot: "#1F2937" },
};

type Filter = "all" | "active" | "setup" | "completed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "active",    label: "Live"      },
  { key: "setup",     label: "Setup"     },
  { key: "completed", label: "Completed" },
];

export default function Dashboard() {
  const router                          = useRouter();
  const { session }                     = useAuth();
  const [tournaments,   setTournaments] = useState<TournamentWithCount[]>([]);
  const [loading,       setLoading]     = useState(true);
  const [refreshing,    setRefreshing]  = useState(false);
  const [showModal,     setShowModal]   = useState(false);
  const [filter,        setFilter]      = useState<Filter>("all");
  const [search,        setSearch]      = useState("");
  const [hoveredId,     setHoveredId]   = useState<string | null>(null);

  const fetchTournaments = useCallback(async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select(`*, teams(count)`)
      .order("created_at", { ascending: false });

    if (error) { Alert.alert("Error", error.message); return; }

    const mapped: TournamentWithCount[] = (data ?? []).map((t: any) => ({
      ...t,
      team_count: t.teams?.[0]?.count ?? 0,
    }));
    setTournaments(mapped);
  }, []);

  useEffect(() => {
    fetchTournaments().finally(() => setLoading(false));
  }, [fetchTournaments]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-tournaments")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, fetchTournaments)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTournaments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTournaments();
    setRefreshing(false);
  }, [fetchTournaments]);

  const handleDelete = (t: TournamentWithCount) => {
    Alert.alert(
      `Delete "${t.name}"?`,
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            await supabase.from("tournaments").delete().eq("id", t.id);
          },
        },
      ]
    );
  };

  const handleArchive = async (t: TournamentWithCount) => {
    await supabase.from("tournaments").update({ status: "archived" }).eq("id", t.id);
  };

  const filtered = tournaments.filter((t) => {
    const matchFilter = filter === "all" ? t.status !== "archived" : t.status === filter;
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Stats
  const total    = tournaments.filter(t => t.status !== "archived").length;
  const live     = tournaments.filter(t => t.status === "active").length;
  const setup    = tournaments.filter(t => t.status === "setup").length;
  const done     = tournaments.filter(t => t.status === "completed").length;

  return (
    <View style={styles.page}>
      {/* ── Page Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Tournaments</Text>
          <Text style={styles.pageSubtitle}>
            {session?.user?.email} · Manage your events
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={styles.createBtn}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={15} color="#fff" />
          <Text style={styles.createBtnText}>New Tournament</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats Bar ── */}
      <View style={styles.statsBar}>
        {[
          { label: "Total",     value: total, color: "#94A3B8" },
          { label: "Live",      value: live,  color: "#22C55E" },
          { label: "Setup",     value: setup, color: "#F59E0B" },
          { label: "Completed", value: done,  color: "#60A5FA" },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Toolbar ── */}
      <View style={styles.toolbar}>
        {/* Search */}
        <View style={styles.searchBox}>
          <Feather name="search" size={13} color="#374151" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search tournaments…"
            placeholderTextColor="#2D3748"
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={13} color="#374151" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Table ── */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Loading tournaments…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.tableWrap}
          contentContainerStyle={styles.tableContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
          }
        >
          {/* Table Head */}
          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 3 }]}>Tournament</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Game</Text>
            <Text style={[styles.th, { flex: 1 }]}>Teams</Text>
            <Text style={[styles.th, { flex: 1 }]}>Status</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Created</Text>
            <Text style={[styles.th, { width: 80, textAlign: "right" }]}>Actions</Text>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyTitle}>
                {search ? "No results found" : "No tournaments yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? `No tournaments match "${search}"`
                  : "Create your first tournament to get started"}
              </Text>
              {!search && (
                <TouchableOpacity
                  onPress={() => setShowModal(true)}
                  style={styles.emptyAction}
                >
                  <Text style={styles.emptyActionText}>+ New Tournament</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.resultCount}>
                {filtered.length} tournament{filtered.length !== 1 ? "s" : ""}
              </Text>
              {filtered.map((t) => {
                const game   = GAME_CONFIG[t.game_type]   ?? GAME_CONFIG.mlbb;
                const status = STATUS_CONFIG[t.status]    ?? STATUS_CONFIG.setup;
                const date   = new Date(t.created_at).toLocaleDateString("en-PH", {
                  month: "short", day: "numeric", year: "numeric",
                });
                const hov = hoveredId === t.id;

                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => router.push(`/(admin)/tournament/${t.id}` as any)}
                    style={[styles.tableRow, hov && styles.tableRowHovered]}
                    activeOpacity={0.75}
                    {...(Platform.OS === "web"
                      ? {
                          onMouseEnter: () => setHoveredId(t.id),
                          onMouseLeave: () => setHoveredId(null),
                        }
                      : {})}
                  >
                    {/* Name */}
                    <View style={[styles.td, { flex: 3, flexDirection: "row", alignItems: "center", gap: 10 }]}>
                      <View style={[styles.gameIcon, { backgroundColor: game.bg }]}>
                        <Text style={{ fontSize: 14 }}>{game.icon}</Text>
                      </View>
                      <Text style={styles.tournamentName} numberOfLines={1}>{t.name}</Text>
                    </View>

                    {/* Game */}
                    <View style={[styles.td, { flex: 1.2 }]}>
                      <Text style={[styles.gameLabel, { color: game.color }]}>
                        {t.game_type.toUpperCase()}
                      </Text>
                    </View>

                    {/* Teams */}
                    <View style={[styles.td, { flex: 1 }]}>
                      <View style={styles.teamsBadge}>
                        <Feather name="users" size={10} color="#475569" />
                        <Text style={styles.teamsCount}>{t.team_count}</Text>
                      </View>
                    </View>

                    {/* Status */}
                    <View style={[styles.td, { flex: 1 }]}>
                      <View style={styles.statusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
                        <Text style={[styles.statusLabel, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>

                    {/* Date */}
                    <View style={[styles.td, { flex: 1.2 }]}>
                      <Text style={styles.dateText}>{date}</Text>
                    </View>

                    {/* Actions */}
                    <View style={[styles.td, { width: 80, flexDirection: "row", justifyContent: "flex-end", gap: 4 }]}>
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation?.(); handleArchive(t); }}
                        style={styles.actionBtn}
                      >
                        <Feather name="archive" size={13} color="#475569" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation?.(); handleDelete(t); }}
                        style={styles.actionBtn}
                      >
                        <Feather name="trash-2" size={13} color="#475569" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      <CreateTournamentModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={fetchTournaments}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#080812",
    paddingHorizontal: 32,
    paddingTop: 32,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  pageTitle: {
    color: "#F1F5F9",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    color: "#2D3748",
    fontSize: 12,
    marginTop: 3,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#6C63FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  // Stats
  statsBar: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#0C0C1A",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#13132A",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -1,
  },
  statLabel: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "500",
  },

  // Toolbar
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0C0C1A",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#13132A",
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxWidth: 300,
  },
  searchInput: {
    flex: 1,
    color: "#94A3B8",
    fontSize: 13,
    outlineStyle: "none",
  } as any,
  filterRow: {
    flexDirection: "row",
    gap: 4,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0C0C1A",
    borderWidth: 1,
    borderColor: "#13132A",
  },
  filterBtnActive: {
    backgroundColor: "#1A1A3A",
    borderColor: "#6C63FF",
  },
  filterLabel: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "500",
  },
  filterLabelActive: {
    color: "#A5A0FF",
    fontWeight: "600",
  },

  // Loading
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "#2D3748",
    fontSize: 13,
  },

  // Table
  tableWrap: {
    flex: 1,
  },
  tableContent: {
    paddingBottom: 40,
  },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0F0F22",
    marginBottom: 4,
  },
  th: {
    color: "#2D3748",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  resultCount: {
    color: "#2D3748",
    fontSize: 11,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 2,
  },
  tableRowHovered: {
    backgroundColor: "#0C0C1A",
    borderColor: "#13132A",
  },
  td: {
    justifyContent: "center",
  },
  gameIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tournamentName: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  gameLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  teamsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  teamsCount: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateText: {
    color: "#374151",
    fontSize: 12,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 7,
    backgroundColor: "#0C0C1A",
  },

  // Empty
  emptyBox: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtitle: {
    color: "#374151",
    fontSize: 13,
    textAlign: "center",
  },
  emptyAction: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#1A1A3A",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#6C63FF",
  },
  emptyActionText: {
    color: "#A5A0FF",
    fontSize: 13,
    fontWeight: "600",
  },
});
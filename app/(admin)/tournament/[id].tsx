import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Tournament } from "@/lib/types";
import TeamsTab from "@/components/tournament/TeamsTab";

type Tab = "overview" | "teams" | "bracket" | "settings";

const TABS: { key: Tab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "overview",  label: "Overview",  icon: "bar-chart-2" },
  { key: "teams",     label: "Teams",     icon: "users"       },
  { key: "bracket",   label: "Bracket",   icon: "git-merge"   },
  { key: "settings",  label: "Settings",  icon: "settings"    },
];

const GAME_CONFIG: Record<string, { icon: string; color: string }> = {
  mlbb:       { icon: "⚔️",  color: "#60A5FA" },
  cod:        { icon: "🎯",  color: "#F87171" },
  basketball: { icon: "🏀",  color: "#FB923C" },
  tekken:     { icon: "👊",  color: "#A78BFA" },
  valorant:   { icon: "🔫",  color: "#4ADE80" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  setup:     { label: "Setup",    color: "#94A3B8", bg: "#1E293B" },
  active:    { label: "Live",     color: "#22C55E", bg: "#052e16" },
  completed: { label: "Done",     color: "#60A5FA", bg: "#1e3a5f" },
  archived:  { label: "Archived", color: "#374151", bg: "#111827" },
};

export default function TournamentDetail() {
  const { id }                      = useLocalSearchParams<{ id: string }>();
  const router                      = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<Tab>("teams");
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);

  const fetchTournament = useCallback(async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .single();
    if (error) { Alert.alert("Error", error.message); return; }
    setTournament(data);
  }, [id]);

  useEffect(() => {
    fetchTournament().finally(() => setLoading(false));
  }, [fetchTournament]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Tournament not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const game   = GAME_CONFIG[tournament.game_type]   ?? GAME_CONFIG.mlbb;
  const status = STATUS_CONFIG[tournament.status]    ?? STATUS_CONFIG.setup;
  const date   = new Date(tournament.created_at).toLocaleDateString("en-PH", {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <View style={styles.page}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.push("/(admin)/dashboard")}
          style={styles.breadcrumbBtn}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={14} color="#374151" />
          <Text style={styles.breadcrumbText}>Tournaments</Text>
        </TouchableOpacity>
        <Feather name="chevron-right" size={12} color="#1F2937" />
        <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
          {tournament.name}
        </Text>
      </View>

      {/* ── Tournament Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.gameEmoji}>{game.icon}</Text>
          <View>
            <Text style={styles.tournamentName}>{tournament.name}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.gameType, { color: game.color }]}>
                {tournament.game_type.toUpperCase()}
              </Text>
              <Text style={styles.metaSep}>·</Text>
              <Text style={styles.metaDate}>{date}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusLabel, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active  = activeTab  === tab.key;
          const hovered = hoveredTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                active  && styles.tabActive,
                hovered && !active && styles.tabHovered,
              ]}
              activeOpacity={0.7}
              {...(Platform.OS === "web"
                ? {
                    onMouseEnter: () => setHoveredTab(tab.key),
                    onMouseLeave: () => setHoveredTab(null),
                  }
                : {})}
            >
              <Feather
                name={tab.icon}
                size={13}
                color={active ? "#A5A0FF" : "#374151"}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Tab Content ── */}
      <View style={styles.content}>
        {activeTab === "teams" && (
          <TeamsTab tournamentId={tournament.id} gameType={tournament.game_type} />
        )}
        {activeTab === "overview" && (
          <View style={styles.comingSoon}>
            <Feather name="bar-chart-2" size={32} color="#1F2937" />
            <Text style={styles.comingSoonText}>Overview coming soon</Text>
          </View>
        )}
        {activeTab === "bracket" && (
          <View style={styles.comingSoon}>
            <Feather name="git-merge" size={32} color="#1F2937" />
            <Text style={styles.comingSoonText}>Bracket view coming soon</Text>
          </View>
        )}
        {activeTab === "settings" && (
          <View style={styles.comingSoon}>
            <Feather name="settings" size={32} color="#1F2937" />
            <Text style={styles.comingSoonText}>Settings coming soon</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#080812",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#080812",
    gap: 12,
  },
  errorText: {
    color: "#64748B",
    fontSize: 15,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#0C0C1A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#13132A",
  },
  backBtnText: {
    color: "#6C63FF",
    fontSize: 13,
    fontWeight: "600",
  },

  // Breadcrumb
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 16,
  },
  breadcrumbBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  breadcrumbText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "500",
  },
  breadcrumbCurrent: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#0F0F22",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  gameEmoji: {
    fontSize: 28,
    width: 48,
    height: 48,
    textAlign: "center",
    lineHeight: 48,
    backgroundColor: "#0C0C1A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#13132A",
    overflow: "hidden",
  },
  tournamentName: {
    color: "#F1F5F9",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  gameType: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  metaSep: {
    color: "#1F2937",
    fontSize: 12,
  },
  metaDate: {
    color: "#374151",
    fontSize: 12,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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

  // Tabs
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#0F0F22",
    gap: 0,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: "relative",
  },
  tabActive: {},
  tabHovered: {},
  tabLabel: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#A5A0FF",
    fontWeight: "600",
  },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#6C63FF",
    borderRadius: 1,
  },

  // Content
  content: {
    flex: 1,
  },
  comingSoon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  comingSoonText: {
    color: "#1F2937",
    fontSize: 14,
  },
});
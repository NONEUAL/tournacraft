import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../../lib/useAuth";
import { Tournament } from "../../lib/types";
import TournamentCard from "../../components/TournamentCard";
import CreateTournamentModal from "../../components/CreateTournamentModal";

interface TournamentWithCount extends Tournament {
  team_count: number;
}

export default function Dashboard() {
  const router                          = useRouter();
  const { session, signOut }            = useAuth();
  const [tournaments,   setTournaments] = useState<TournamentWithCount[]>([]);
  const [loading,       setLoading]     = useState(true);
  const [refreshing,    setRefreshing]  = useState(false);
  const [showModal,     setShowModal]   = useState(false);
  const [filter,        setFilter]      = useState<"all" | "active" | "setup" | "completed">("all");

  // ─── Fetch tournaments with team count ────────────────────────────────────
  const fetchTournaments = useCallback(async () => {
    const { data, error } = await supabase
      .from("tournaments")
      .select(`
        *,
        teams(count)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    const mapped: TournamentWithCount[] = (data ?? []).map((t: any) => ({
      ...t,
      team_count: t.teams?.[0]?.count ?? 0,
    }));

    setTournaments(mapped);
  }, []);

  useEffect(() => {
    fetchTournaments().finally(() => setLoading(false));
  }, [fetchTournaments]);

  // ─── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-tournaments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments" },
        () => fetchTournaments()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTournaments]);

  // ─── Pull to refresh ──────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTournaments();
    setRefreshing(false);
  }, [fetchTournaments]);

  // ─── Archive / delete ─────────────────────────────────────────────────────
  const handleLongPress = (tournament: TournamentWithCount) => {
    Alert.alert(
      tournament.name,
      "What do you want to do?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: async () => {
            await supabase
              .from("tournaments")
              .update({ status: "archived" })
              .eq("id", tournament.id);
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Delete Tournament",
              `Are you sure you want to delete "${tournament.name}"? This cannot be undone.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    await supabase
                      .from("tournaments")
                      .delete()
                      .eq("id", tournament.id);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // ─── Filter ───────────────────────────────────────────────────────────────
  const FILTERS = [
    { key: "all",       label: "All"       },
    { key: "active",    label: "Live"      },
    { key: "setup",     label: "Setup"     },
    { key: "completed", label: "Completed" },
  ] as const;

  const filtered = tournaments.filter(t =>
    filter === "all" ? t.status !== "archived" : t.status === filter
  );

  // ─── Stats bar ────────────────────────────────────────────────────────────
  const total    = tournaments.filter(t => t.status !== "archived").length;
  const live     = tournaments.filter(t => t.status === "active").length;
  const archived = tournaments.filter(t => t.status === "archived").length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A18" }}>

      {/* ── Header ── */}
      <View style={{
        paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 0.5, borderBottomColor: "#1A1A2E",
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: "#6C63FF", fontSize: 11, fontWeight: "700", letterSpacing: 2 }}>
              TOURNACRAFT
            </Text>
            <Text style={{ color: "#F1F5F9", fontSize: 24, fontWeight: "700", marginTop: 2 }}>
              Dashboard
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => Alert.alert(
              "Sign Out",
              "Are you sure?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: signOut },
              ]
            )}
            style={{
              paddingHorizontal: 14, paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 0.5, borderColor: "#2A2A4A",
            }}
          >
            <Text style={{ color: "#64748B", fontSize: 13 }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <Text style={{ color: "#4B5563", fontSize: 13, marginTop: 4 }}>
          {session?.user?.email}
        </Text>

        {/* Stats row */}
        <View style={{
          flexDirection: "row", gap: 12, marginTop: 16,
        }}>
          {[
            { label: "Total",    value: total,    color: "#94A3B8" },
            { label: "Live",     value: live,     color: "#4ADE80" },
            { label: "Archived", value: archived, color: "#4B5563" },
          ].map(s => (
            <View key={s.label} style={{
              flex: 1, backgroundColor: "#16162A",
              borderRadius: 10, padding: 12,
              borderWidth: 0.5, borderColor: "#2A2A4A",
              alignItems: "center",
            }}>
              <Text style={{ color: s.color, fontSize: 22, fontWeight: "700" }}>{s.value}</Text>
              <Text style={{ color: "#4B5563", fontSize: 11, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <View style={{
        flexDirection: "row", paddingHorizontal: 20,
        paddingVertical: 12, gap: 8,
      }}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={{
              paddingHorizontal: 14, paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: filter === f.key ? "#6C63FF" : "#16162A",
              borderWidth: 0.5,
              borderColor: filter === f.key ? "#6C63FF" : "#2A2A4A",
            }}
          >
            <Text style={{
              color: filter === f.key ? "#fff" : "#64748B",
              fontSize: 13, fontWeight: filter === f.key ? "600" : "400",
            }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tournament list ── */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={{ color: "#4B5563", marginTop: 12, fontSize: 13 }}>
            Loading tournaments...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6C63FF"
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={{
              alignItems: "center", justifyContent: "center",
              paddingVertical: 80,
            }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🏆</Text>
              <Text style={{ color: "#F1F5F9", fontSize: 18, fontWeight: "600" }}>
                No tournaments yet
              </Text>
              <Text style={{ color: "#4B5563", fontSize: 14, marginTop: 8, textAlign: "center" }}>
                Tap the button below to{"\n"}create your first tournament
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ color: "#4B5563", fontSize: 12, marginBottom: 12, marginTop: 4 }}>
                {filtered.length} tournament{filtered.length !== 1 ? "s" : ""}
              </Text>
              {filtered.map(t => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  teamCount={t.team_count}
                  onPress={() => router.push(`/(admin)/tournament/${t.id}` as any)}
                  onLongPress={() => handleLongPress(t)}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <View style={{
        position: "absolute", bottom: 36, right: 24, left: 24,
      }}>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={{
            backgroundColor: "#6C63FF",
            borderRadius: 16, paddingVertical: 18,
            alignItems: "center", justifyContent: "center",
            flexDirection: "row", gap: 8,
            shadowColor: "#6C63FF",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 20, lineHeight: 22 }}>+</Text>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
            New Tournament
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Create Modal ── */}
      <CreateTournamentModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={fetchTournaments}
      />
    </View>
  );
}
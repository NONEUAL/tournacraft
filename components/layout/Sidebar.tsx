import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/useAuth";

type NavItem = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  href: string;
  match?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",   icon: "grid",  href: "/(admin)/dashboard" },
  { label: "Tournaments", icon: "award", href: "/(admin)/dashboard", match: "tournament" },
];

export default function Sidebar() {
  const router  = useRouter();
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const [hovered,    setHovered]    = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const email    = session?.user?.email ?? "";
  const initials = email.split("@")[0].slice(0, 2).toUpperCase();

  const isActive = (item: NavItem) => {
    if (item.match) return pathname.includes(item.match);
    return pathname === item.href || pathname === "/dashboard";
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          // DO NOT navigate here — AdminLayout's auth guard handles redirect
          // when onAuthStateChange fires session = null.
          // Manually pushing causes a race condition that breaks re-login.
        },
      },
    ]);
  };

  return (
    <View style={styles.sidebar}>
      {/* ── Logo ── */}
      <View style={styles.logoRow}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>TC</Text>
        </View>
        <View>
          <Text style={styles.logoName}>Tournacraft</Text>
          <Text style={styles.logoSub}>Admin Console</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ── Nav ── */}
      <View style={styles.nav}>
        <Text style={styles.navSection}>NAVIGATION</Text>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const hov    = hovered === item.label;
          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.href as any)}
              style={[
                styles.navItem,
                active && styles.navItemActive,
                hov && !active && styles.navItemHovered,
              ]}
              {...(Platform.OS === "web"
                ? {
                    onMouseEnter: () => setHovered(item.label),
                    onMouseLeave: () => setHovered(null),
                  }
                : {})}
              activeOpacity={0.7}
            >
              <View style={[styles.navIcon, active && styles.navIconActive]}>
                <Feather
                  name={item.icon}
                  size={15}
                  color={active ? "#6C63FF" : hov ? "#94A3B8" : "#475569"}
                />
              </View>
              <Text style={[
                styles.navLabel,
                active && styles.navLabelActive,
                hov && !active && styles.navLabelHovered,
              ]}>
                {item.label}
              </Text>
              {active && <View style={styles.activeBar} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      {/* ── Status chip ── */}
      <View style={styles.statusChip}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>Live & Connected</Text>
      </View>

      <View style={styles.divider} />

      {/* ── User row ── */}
      <View style={styles.userRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userEmail} numberOfLines={1}>{email}</Text>
          <Text style={styles.userRole}>Administrator</Text>
        </View>
        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          style={styles.signOutBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {signingOut
            ? <ActivityIndicator size="small" color="#374151" />
            : <Feather name="log-out" size={15} color="#475569" />
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: "#0C0C1A",
    borderRightWidth: 1,
    borderRightColor: "#13132A",
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: "column",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
  },
  logoMarkText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  logoName: {
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  logoSub: {
    color: "#374151",
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: "#13132A",
    marginVertical: 16,
    marginHorizontal: -16,
  },
  nav: {
    gap: 2,
  },
  navSection: {
    color: "#2D3748",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 9,
    position: "relative",
  },
  navItemActive: {
    backgroundColor: "#11112A",
  },
  navItemHovered: {
    backgroundColor: "#0F0F22",
  },
  navIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#111123",
    alignItems: "center",
    justifyContent: "center",
  },
  navIconActive: {
    backgroundColor: "#1A1A3A",
  },
  navLabel: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  navLabelActive: {
    color: "#C4C0FF",
    fontWeight: "600",
  },
  navLabelHovered: {
    color: "#94A3B8",
  },
  activeBar: {
    position: "absolute",
    right: 0,
    top: "25%",
    bottom: "25%",
    width: 3,
    borderRadius: 2,
    backgroundColor: "#6C63FF",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#0A1A12",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#0D2A1A",
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  statusText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "600",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#1A1A3A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2A2A4A",
  },
  avatarText: {
    color: "#6C63FF",
    fontSize: 11,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
    overflow: "hidden",
  },
  userEmail: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "500",
  },
  userRole: {
    color: "#2D3748",
    fontSize: 10,
    fontWeight: "500",
  },
  signOutBtn: {
    padding: 4,
    width: 24,
    alignItems: "center",
  },
});
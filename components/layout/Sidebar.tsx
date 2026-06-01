import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/useAuth";

const NAV_ITEMS: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  href: string;
}[] = [
  { label: "Dashboard",   icon: "home",      href: "/(admin)/dashboard" },
  { label: "Teams",       icon: "users",     href: "/(admin)/teams" },
  { label: "Matches",     icon: "git-merge", href: "/(admin)/matches" },
  { label: "Reports",     icon: "bar-chart-3", href: "/(admin)/reports" },
  { label: "Settings",    icon: "settings",  href: "/(admin)/settings" },
];

export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { signOut, session } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const email = session?.user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>

      {/* Brand */}
      <View style={styles.brand}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>TC</Text>
        </View>
        {!collapsed && (
          <Text style={styles.brandName}>Tournacraft</Text>
        )}
        {Platform.OS === "web" && (
          <TouchableOpacity
            onPress={() => setCollapsed(v => !v)}
            style={styles.collapseBtn}
            activeOpacity={0.7}
          >
            <Feather
              name={collapsed ? "chevron-right" : "chevron-left"}
              size={14}
              color="#374151"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Nav */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href.replace("/(admin)", ""));
          return (
            <TouchableOpacity
              key={item.href}
              onPress={() => router.push(item.href as any)}
              style={[styles.navItem, active && styles.navItemActive]}
              activeOpacity={0.75}
            >
              <Feather
                name={item.icon}
                size={16}
                color={active ? "#A5A0FF" : "#374151"}
              />
              {!collapsed && (
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
              )}
              {active && <View style={styles.activeBar} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* User + sign out */}
      <View style={styles.footer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {!collapsed && (
          <Text style={styles.emailText} numberOfLines={1}>
            {email}
          </Text>
        )}
        <TouchableOpacity
          onPress={signOut}
          style={styles.signOutBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="log-out" size={14} color="#374151" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const SIDEBAR_W  = 200;
const COLLAPSED_W = 56;

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: "#080812",
    borderRightWidth: 1,
    borderRightColor: "#0F0F22",
    paddingVertical: 20,
    flexDirection: "column",
  },
  sidebarCollapsed: {
    width: COLLAPSED_W,
  },

  // Brand
  brand: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 28,
    gap: 10,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  brandName: {
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  collapseBtn: {
    padding: 4,
  },

  // Nav
  nav: {
    paddingHorizontal: 8,
    gap: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 9,
    position: "relative",
    overflow: "hidden",
  },
  navItemActive: {
    backgroundColor: "#1A1A3A",
  },
  navLabel: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#A5A0FF",
    fontWeight: "600",
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: "20%",
    bottom: "20%",
    width: 3,
    backgroundColor: "#6C63FF",
    borderRadius: 2,
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#0F0F22",
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1A1A3A",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "#6C63FF",
    fontSize: 10,
    fontWeight: "700",
  },
  emailText: {
    color: "#2D3748",
    fontSize: 11,
    flex: 1,
  },
  signOutBtn: {
    padding: 4,
    flexShrink: 0,
  },
}); 
import React from "react";
import { View, StyleSheet } from "react-native";
import Sidebar from "./Sidebar";

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  return (
    <View style={styles.shell}>
      <Sidebar />
      <View style={styles.main}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#080812",
  },
  main: {
    flex: 1,
    backgroundColor: "#080812",
    overflow: "hidden",
  },
});
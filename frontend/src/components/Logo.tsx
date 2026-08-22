import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, font } from "@/src/theme";

// Temporary text-based emblem for INTERNEW.
// Replace with the real logo image once provided by the client.
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? 76 : size === "md" ? 56 : 40;
  const fs = size === "lg" ? font["2xl"] : size === "md" ? font.xl : font.lg;
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={[colors.brandPrimary, colors.brandSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.mark, { width: dim, height: dim, borderRadius: radius.md }]}
      >
        <Text style={[styles.markText, { fontSize: fs }]}>iN</Text>
      </LinearGradient>
      {size !== "sm" && (
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.name}>INTERNEW</Text>
          <Text style={styles.sub}>Tecnologia em Saúde</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  mark: { alignItems: "center", justifyContent: "center" },
  markText: { color: "#fff", fontWeight: "900", letterSpacing: -1 },
  name: { fontSize: font.xl, fontWeight: "900", color: colors.brandPrimary, letterSpacing: 0.5 },
  sub: { fontSize: font.sm, color: colors.muted, fontWeight: "600" },
});

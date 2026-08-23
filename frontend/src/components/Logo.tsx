import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";

const LOGO = require("../../assets/images/internew-logo.jpg");

// Official INTERNEW emblem (full lockup on white).
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const height = size === "lg" ? 132 : size === "md" ? 96 : 64;
  return (
    <View style={styles.wrap}>
      <Image
        source={LOGO}
        style={{ height, width: height * 0.78 }}
        contentFit="contain"
        transition={200}
      />
    </View>
  );
}

// Compact emblem inside a white rounded tile — for use over colored backgrounds.
export function LogoTile({ dim = 52 }: { dim?: number }) {
  return (
    <View style={[styles.tile, { width: dim, height: dim, borderRadius: dim * 0.24 }]}>
      <Image source={LOGO} style={{ width: dim * 0.72, height: dim * 0.72 }} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  tile: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D47A1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
});

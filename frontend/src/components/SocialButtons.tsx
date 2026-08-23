import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { Image } from "expo-image";
import { colors, spacing, radius, font } from "@/src/theme";

const GOOGLE_ICON = "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";

export function GoogleButton({
  onPress,
  loading,
  testID,
}: {
  onPress: () => void;
  loading?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.google, pressed && { opacity: 0.9 }, loading && { opacity: 0.6 }]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onSurface} />
      ) : (
        <View style={styles.row}>
          <Image source={{ uri: GOOGLE_ICON }} style={styles.gIcon} contentFit="contain" />
          <Text style={styles.googleText}>Continuar com Google</Text>
        </View>
      )}
    </Pressable>
  );
}

export function AppleButton({
  onPress,
  testID,
}: {
  onPress: () => void;
  testID?: string;
}) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => setAvailable(false));
    }
  }, []);

  if (Platform.OS !== "ios" || !available) return null;

  return (
    <View testID={testID} style={{ marginTop: spacing.md }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={radius.md}
        style={{ height: 54, width: "100%" }}
        onPress={onPress}
      />
    </View>
  );
}

export function OrDivider() {
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text style={styles.dividerText}>ou</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  google: {
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  gIcon: { width: 20, height: 20 },
  googleText: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.xl },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: font.sm, color: colors.muted, fontWeight: "700" },
});

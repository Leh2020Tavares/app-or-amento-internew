import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, font } from "@/src/theme";
import { Button } from "@/src/components/ui";

export default function SuccessScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.content}>
        <View style={styles.circle}>
          <Feather name="check" size={44} color="#fff" />
        </View>
        <Text style={styles.title}>Orçamento enviado!</Text>
        <Text style={styles.sub}>
          Recebemos sua solicitação. A equipe da INTERNEW vai analisar e responder em breve.
        </Text>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Seu código de acompanhamento</Text>
          <Text style={styles.code} testID="quote-code">{code}</Text>
          <Text style={styles.codeHint}>Guarde este código para consultar a resposta.</Text>
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        <Button
          title="Acompanhar orçamento"
          icon="search"
          onPress={() => router.replace({ pathname: "/track", params: { code } })}
          testID="go-track-button"
        />
        <Pressable onPress={() => router.replace("/")} testID="new-quote-button" style={styles.secondary}>
          <Text style={styles.secondaryText}>Fazer novo orçamento</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, justifyContent: "space-between" },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  circle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: colors.brandSecondary,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.xl,
  },
  title: { fontSize: font["2xl"], fontWeight: "900", color: colors.onSurface, textAlign: "center" },
  sub: { fontSize: font.lg, color: colors.muted, textAlign: "center", marginTop: spacing.md, lineHeight: 24, paddingHorizontal: spacing.md },
  codeCard: {
    marginTop: spacing["2xl"], backgroundColor: colors.surfaceTertiary, borderRadius: radius.lg,
    padding: spacing.xl, alignItems: "center", alignSelf: "stretch", borderWidth: 1, borderColor: colors.brandTertiary,
  },
  codeLabel: { fontSize: font.sm, fontWeight: "700", color: colors.onSurfaceTertiary, textTransform: "uppercase", letterSpacing: 1 },
  code: { fontSize: 40, fontWeight: "900", color: colors.brandPrimary, letterSpacing: 6, marginVertical: spacing.sm },
  codeHint: { fontSize: font.sm, color: colors.muted, textAlign: "center" },
  secondary: { alignItems: "center", paddingVertical: spacing.md },
  secondaryText: { color: colors.brandPrimary, fontWeight: "700", fontSize: font.lg },
});

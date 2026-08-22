import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, font } from "@/src/theme";
import { Field, Button, Card, StatusBadge } from "@/src/components/ui";
import { useToast } from "@/src/components/Toast";
import { api } from "@/src/api";

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function TrackScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [code, setCode] = useState((params.code as string) || "");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  const search = async (c?: string) => {
    const q = (c ?? code).trim().toUpperCase();
    if (!q) {
      toast.show("Digite o código do orçamento", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await api.trackQuote(q);
      setQuote(data);
    } catch (err: any) {
      setQuote(null);
      toast.show(err.message || "Orçamento não encontrado", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.code) search(params.code as string);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back-button" onPress={() => router.replace("/")} hitSlop={10} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Acompanhar orçamento</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAwareScrollView bottomOffset={20} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <Field label="Código do orçamento" value={code} onChangeText={setCode}
          placeholder="Ex.: A1B2C3" autoCapitalize="none" testID="input-track-code" />
        <Button title="Consultar" icon="search" onPress={() => search()} loading={loading} testID="track-search-button" />

        {quote && (
          <View style={{ marginTop: spacing.xl }}>
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.codeSmall}>#{quote.code}</Text>
                <Text style={styles.product}>{quote.product}</Text>
              </View>
              <StatusBadge status={quote.status} />
            </View>

            {quote.status === "responded" ? (
              <Card style={{ backgroundColor: "#E7F4E9", borderColor: "#CDEBD3", marginTop: spacing.md }}>
                <Text style={styles.replyTitle}>Resposta da INTERNEW</Text>
                {!!quote.reply_price && <Text style={styles.price}>{quote.reply_price}</Text>}
                <Text style={styles.replyMsg}>{quote.reply_message}</Text>
              </Card>
            ) : (
              <Card style={{ backgroundColor: "#FEF9EC", borderColor: "#FCE8B8", marginTop: spacing.md }}>
                <Text style={styles.pendingText}>
                  Seu orçamento está em análise. Assim que respondermos, a resposta aparecerá aqui.
                </Text>
              </Card>
            )}

            <Card style={{ marginTop: spacing.lg }}>
              <Text style={styles.detailsTitle}>Detalhes da solicitação</Text>
              <Row label="Tipo" value={quote.request_type} />
              <Row label="Categoria" value={quote.category} />
              <Row label="Quantidade" value={`${quote.quantity} ${quote.unit}`} />
              <Row label="Especificação" value={quote.specification} />
              <Row label="Local de entrega" value={quote.delivery_location} />
              <Row label="Prazo desejado" value={quote.delivery_time} />
            </Card>
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: font.lg, fontWeight: "800", color: colors.onSurface },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  codeSmall: { fontSize: font.sm, color: colors.muted, fontWeight: "700" },
  product: { fontSize: font.xl, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  replyTitle: { fontSize: font.base, fontWeight: "800", color: "#1B5E20", marginBottom: spacing.sm },
  price: { fontSize: font["2xl"], fontWeight: "900", color: colors.brandSecondary, marginBottom: spacing.sm },
  replyMsg: { fontSize: font.lg, color: "#2E5E33", lineHeight: 24 },
  pendingText: { fontSize: font.lg, color: "#8A6D1E", lineHeight: 24 },
  detailsTitle: { fontSize: font.base, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: spacing.lg },
  rowLabel: { fontSize: font.base, color: colors.muted, fontWeight: "600" },
  rowValue: { fontSize: font.base, color: colors.onSurface, fontWeight: "600", flexShrink: 1, textAlign: "right" },
});

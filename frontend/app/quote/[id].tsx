import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius, font } from "@/src/theme";
import { Field, Button, Card, StatusBadge, SectionLabel } from "@/src/components/ui";
import { useToast } from "@/src/components/Toast";
import { api } from "@/src/api";

function Row({ label, value, icon }: { label: string; value?: string; icon: keyof typeof Feather.glyphMap }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Feather name={icon} size={16} color={colors.brandPrimary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [entry, setEntry] = useState("");
  const [entryPercent, setEntryPercent] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getQuote(id as string);
      setQuote(data);
      setPrice(data.reply_price || "");
      setMessage(data.reply_message || "");
      setEntry(data.entry_amount ? String(data.entry_amount).replace(".", ",") : "");
    } catch (err: any) {
      toast.show(err.message || "Erro ao carregar", "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    api.getCompany().then((c) => setEntryPercent(c.entry_percent ?? null)).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const save = async (): Promise<any | null> => {
    if (!message.trim()) {
      toast.show("Escreva a mensagem de resposta", "error");
      return null;
    }
    setSaving(true);
    try {
      const entryVal = parseFloat((entry || "0").replace(/\./g, "").replace(",", ".")) || 0;
      const updated = await api.replyQuote(id as string, { price, message, entry_amount: entryVal });
      setQuote(updated);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show("Resposta salva com sucesso", "success");
      return updated;
    } catch (err: any) {
      toast.show(err.message || "Erro ao salvar", "error");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const respondViaWhatsApp = async () => {
    const updated = (await save()) || quote;
    if (!updated) return;
    const phone = (updated.customer_phone || "").replace(/\D/g, "");
    const dest = phone.length >= 12 ? phone : `55${phone}`;
    const parts = [
      `Olá, ${updated.customer_name}! Referente ao seu orçamento #${updated.code} (${updated.product}).`,
    ];
    if (price.trim()) parts.push(`\nValor: ${price}`);
    parts.push(`\n${message}`);
    parts.push(`\n\nAtenciosamente, INTERNEW Tecnologia em Saúde.`);
    const text = encodeURIComponent(parts.join(""));
    Linking.openURL(`https://wa.me/${dest}?text=${text}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>Orçamento não encontrado.</Text>
        <Button title="Voltar" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back-button" onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Orçamento #{quote.code}</Text>
        <StatusBadge status={quote.status} />
      </View>

      <KeyboardAwareScrollView
        bottomOffset={150}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 180 }}
      >
        <Text style={styles.customer}>{quote.customer_name}</Text>
        <View style={styles.pillRow}>
          <View style={styles.pill}><Text style={styles.pillText}>{quote.request_type}</Text></View>
          <View style={styles.pill}><Text style={styles.pillText}>{quote.category}</Text></View>
        </View>

        <SectionLabel>Contato</SectionLabel>
        <Card>
          <Row label="Telefone / WhatsApp" value={quote.customer_phone} icon="phone" />
          <Row label="E-mail" value={quote.customer_email} icon="mail" />
          <Row label="Endereço" value={quote.address} icon="map-pin" />
          <Row label="Local de entrega" value={quote.delivery_location} icon="truck" />
        </Card>

        <SectionLabel>Solicitação</SectionLabel>
        <Card>
          <Row label="Produto" value={quote.product} icon="box" />
          <Row label="Quantidade" value={`${quote.quantity} ${quote.unit}`} icon="hash" />
          <Row label="Especificação" value={quote.specification} icon="file-text" />
          <Row label="Prazo desejado" value={quote.delivery_time} icon="clock" />
        </Card>

        <SectionLabel>Sua resposta</SectionLabel>
        <Field label="Valor / Preço" value={price} onChangeText={setPrice}
          placeholder="Ex.: R$ 1.250,00 / mês" testID="input-reply-price" />
        <Field label="Mensagem ao cliente" value={message} onChangeText={setMessage}
          placeholder="Condições, prazo, disponibilidade..." multiline testID="input-reply-message" />

        <SectionLabel>Entrada (pagamento)</SectionLabel>
        <Field label="Valor da entrada em R$ (deixe 0 se não houver)" value={entry} onChangeText={setEntry}
          placeholder="Ex.: 500,00" keyboardType="numeric" testID="input-reply-entry" />
        <Text style={styles.entryHint}>
          {entryPercent
            ? `Sugestão configurada: ${entryPercent}% do total. O cliente paga por cartão de crédito ou Pix.`
            : "O cliente poderá pagar esse valor por cartão de crédito ou Pix."}
        </Text>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            title="Responder via WhatsApp"
            icon="message-circle"
            variant="secondary"
            onPress={respondViaWhatsApp}
            loading={saving}
            testID="respond-whatsapp-button"
          />
          <Button title="Salvar resposta" icon="save" variant="outline" onPress={save} testID="save-reply-button" style={{ marginTop: spacing.sm }} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  headerTitle: { fontSize: font.lg, fontWeight: "800", color: colors.onSurface },
  entryHint: { fontSize: font.sm, color: colors.muted, marginTop: -spacing.sm, marginBottom: spacing.md, lineHeight: 18 },
  customer: { fontSize: font["2xl"], fontWeight: "900", color: colors.onSurface },
  pillRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md },
  pill: { backgroundColor: colors.surfaceTertiary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  pillText: { fontSize: font.sm, color: colors.onSurfaceTertiary, fontWeight: "700" },
  row: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { fontSize: font.sm, color: colors.muted, fontWeight: "600" },
  rowValue: { fontSize: font.base, color: colors.onSurface, fontWeight: "600", marginTop: 2 },
  ctaBar: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
});

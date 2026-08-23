import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, font } from "@/src/theme";
import { Field, Button, SectionLabel } from "@/src/components/ui";
import { useToast } from "@/src/components/Toast";
import { api } from "@/src/api";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getCompany();
      setForm(data);
    } catch (err: any) {
      toast.show(err.message || "Erro ao carregar", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (k: string) => (v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.updateCompany(form);
      toast.show("Dados da empresa atualizados", "success");
    } catch (err: any) {
      toast.show(err.message || "Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back-button" onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Dados da empresa</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAwareScrollView bottomOffset={20} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <SectionLabel>Identificação</SectionLabel>
        <Field label="Nome da empresa" value={form.name} onChangeText={set("name")} testID="input-company-name" />
        <Field label="Descrição / Ramo" value={form.tagline} onChangeText={set("tagline")} multiline testID="input-company-tagline" />

        <SectionLabel>Contato</SectionLabel>
        <Field label="WhatsApp (com DDI e DDD, só números)" value={form.whatsapp} onChangeText={set("whatsapp")}
          placeholder="5548999999999" keyboardType="numeric" testID="input-company-whatsapp" />
        <Text style={styles.hint}>Este é o número usado no botão &quot;Falar no WhatsApp&quot; do cliente.</Text>
        <Field label="Telefone fixo" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" testID="input-company-phone" />
        <Field label="E-mail" value={form.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" testID="input-company-email" />

        <SectionLabel>Receber orçamentos por e-mail</SectionLabel>
        <Field label="E-mails que recebem novos orçamentos" value={form.notify_emails || ""} onChangeText={set("notify_emails")}
          placeholder="comercial@empresa.com, outro@empresa.com" keyboardType="email-address" autoCapitalize="none" multiline testID="input-company-notify-emails" />
        <Text style={styles.hint}>Separe vários e-mails por vírgula. Todos recebem um aviso a cada novo pedido.</Text>

        <SectionLabel>Sobre</SectionLabel>
        <Field label="Texto institucional" value={form.about} onChangeText={set("about")} multiline testID="input-company-about" />

        <Button title="Salvar alterações" icon="save" onPress={save} loading={saving} testID="save-company-button" style={{ marginTop: spacing.sm }} />
      </KeyboardAwareScrollView>
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
  hint: { fontSize: font.sm, color: colors.muted, marginTop: -spacing.md, marginBottom: spacing.lg },
});

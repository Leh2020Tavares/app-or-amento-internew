import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, spacing, radius, font } from "@/src/theme";
import { Field, ChipGroup, Button, SectionLabel } from "@/src/components/ui";
import { useToast } from "@/src/components/Toast";
import { LogoTile } from "@/src/components/Logo";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/api";

const HERO =
  "https://images.pexels.com/photos/7108115/pexels-photo-7108115.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const emptyForm = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  address: "",
  delivery_location: "",
  request_type: "Locação",
  category: "Equipamento",
  product: "",
  quantity: "",
  unit: "Unidade",
  specification: "",
  delivery_time: "",
};

export default function QuoteFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState({ ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    api.getCompany().then(setCompany).catch(() => {});
  }, []);

  const set = (k: string) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.customer_name.trim()) e.customer_name = "Informe seu nome";
    if (!form.customer_phone.trim()) e.customer_phone = "Informe seu telefone";
    if (!form.address.trim()) e.address = "Informe seu endereço";
    if (!form.delivery_location.trim()) e.delivery_location = "Informe o local de entrega";
    if (!form.product.trim()) e.product = "Informe o produto";
    if (!form.quantity.trim()) e.quantity = "Informe a quantidade";
    if (!form.delivery_time.trim()) e.delivery_time = "Informe o prazo desejado";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      toast.show("Preencha os campos obrigatórios", "error");
      return;
    }
    setSubmitting(true);
    try {
      const quote = await api.createQuote(form);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: "/success", params: { code: quote.code } });
      setForm({ ...emptyForm });
    } catch (err: any) {
      toast.show(err.message || "Erro ao enviar", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => {
    if (!company?.whatsapp) return;
    const text = encodeURIComponent(
      "Olá! Gostaria de solicitar um orçamento de equipamentos médicos."
    );
    Linking.openURL(`https://wa.me/${company.whatsapp}?text=${text}`);
  };

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        bottomOffset={90}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={["rgba(13,71,161,0.55)", "rgba(13,71,161,0.92)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroContent, { paddingTop: insets.top + spacing.lg }]}>
            <View style={styles.heroTopRow}>
              <LogoTile dim={48} />
              <Pressable
                testID="account-link"
                onPress={() =>
                  router.push(
                    user
                      ? user.role === "company_admin"
                        ? "/dashboard"
                        : "/my-quotes"
                      : "/login"
                  )
                }
                style={styles.loginPill}
              >
                <Feather name={user ? "user" : "lock"} size={13} color="#fff" />
                <Text style={styles.loginPillText}>
                  {user ? (user.role === "company_admin" ? "Painel" : "Meus orçamentos") : "Área da empresa"}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.heroTitle}>Solicite seu orçamento</Text>
            <Text style={styles.heroSub}>
              INTERNEW Tecnologia em Saúde • Equipamentos médicos, acessórios e consumíveis
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* WhatsApp CTA */}
          <Pressable testID="whatsapp-cta" onPress={openWhatsApp} style={styles.waCard}>
            <View style={styles.waIcon}>
              <Feather name="message-circle" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.waTitle}>Falar direto no WhatsApp</Text>
              <Text style={styles.waSub}>Prefere conversar? Toque para abrir o chat</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.brandSecondary} />
          </Pressable>

          <Pressable
            testID="track-link"
            onPress={() => router.push("/track")}
            style={styles.trackLink}
          >
            <Feather name="search" size={15} color={colors.brandPrimary} />
            <Text style={styles.trackLinkText}>Acompanhar um orçamento já enviado</Text>
          </Pressable>

          {/* Customer data */}
          <SectionLabel>Seus dados</SectionLabel>
          <Field label="Nome / Empresa" value={form.customer_name} onChangeText={set("customer_name")}
            placeholder="Ex.: Hospital Santa Casa" required testID="input-name" error={errors.customer_name}
            autoCapitalize="words" />
          <Field label="Telefone / WhatsApp" value={form.customer_phone} onChangeText={set("customer_phone")}
            placeholder="(48) 99999-9999" keyboardType="phone-pad" required testID="input-phone" error={errors.customer_phone} />
          <Field label="E-mail" value={form.customer_email} onChangeText={set("customer_email")}
            placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" testID="input-email" />
          <Field label="Endereço" value={form.address} onChangeText={set("address")}
            placeholder="Rua, número, cidade - UF" required testID="input-address" error={errors.address} />
          <Field label="Local de entrega" value={form.delivery_location} onChangeText={set("delivery_location")}
            placeholder="Ex.: UTI 3º andar, Ala B" required testID="input-delivery-location" error={errors.delivery_location} />

          {/* Request details */}
          <SectionLabel>Detalhes da solicitação</SectionLabel>
          <ChipGroup label="Tipo de solicitação" options={["Locação", "Venda"]}
            value={form.request_type} onChange={set("request_type")} testID="chip-type" required />
          <ChipGroup label="Categoria" options={["Equipamento", "Acessório", "Consumível"]}
            value={form.category} onChange={set("category")} testID="chip-category" required />
          <Field label="Produto" value={form.product} onChangeText={set("product")}
            placeholder="Ex.: Monitor multiparâmetro" required testID="input-product" error={errors.product} />
          <Field label="Quantidade" value={form.quantity} onChangeText={set("quantity")}
            placeholder="Ex.: 5" keyboardType="numeric" required testID="input-quantity" error={errors.quantity} />
          <ChipGroup label="Unidade" options={["Unidade", "Caixa", "Pacote", "Kg", "Litro", "Metro"]}
            value={form.unit} onChange={set("unit")} testID="chip-unit" />
          <Field label="Especificação" value={form.specification} onChangeText={set("specification")}
            placeholder="Marca, modelo, detalhes técnicos..." multiline testID="input-spec" />
          <Field label="Prazo de entrega desejado" value={form.delivery_time} onChangeText={set("delivery_time")}
            placeholder="Ex.: 15 dias, urgente..." required testID="input-delivery-time" error={errors.delivery_time} />
        </View>
      </KeyboardAwareScrollView>

      {/* Sticky CTA */}
      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            title="Solicitar Orçamento"
            icon="send"
            onPress={submit}
            loading={submitting}
            testID="submit-quote-button"
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  hero: { height: 240, backgroundColor: colors.brandPrimary },
  heroContent: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: "flex-end", paddingBottom: spacing.xl },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", position: "absolute", left: spacing.lg, right: spacing.lg, top: 0 },
  logoBadge: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)",
  },
  logoBadgeText: { color: "#fff", fontWeight: "900", fontSize: font.lg },
  loginPill: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.35)",
  },
  loginPillText: { color: "#fff", fontSize: font.sm, fontWeight: "700" },
  heroTitle: { color: "#fff", fontSize: font["2xl"], fontWeight: "900", marginTop: spacing.md },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: font.base, marginTop: spacing.xs, lineHeight: 20 },
  body: { padding: spacing.lg },
  waCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "#E7F4E9",
    borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: "#CDEBD3", marginBottom: spacing.md,
  },
  waIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  waTitle: { fontSize: font.lg, fontWeight: "800", color: "#1B5E20" },
  waSub: { fontSize: font.sm, color: "#3B7C41", marginTop: 2 },
  trackLink: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: spacing.sm, marginBottom: spacing.md },
  trackLinkText: { color: colors.brandPrimary, fontWeight: "700", fontSize: font.base },
  ctaBar: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
});

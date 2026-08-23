import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, font } from "@/src/theme";
import { Field, Button } from "@/src/components/ui";
import { useToast } from "@/src/components/Toast";
import { useAuth } from "@/src/context/AuthContext";

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast.show("Informe seu nome", "error");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      toast.show("Perfil atualizado", "success");
      router.back();
    } catch (err: any) {
      toast.show(err.message || "Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back-button" onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAwareScrollView bottomOffset={20} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <Field label="Nome completo" value={name} onChangeText={setName}
          placeholder="Seu nome" autoCapitalize="words" testID="input-profile-name" required />
        <Field label="Telefone de contato" value={phone} onChangeText={setPhone}
          placeholder="(48) 99999-9999" keyboardType="phone-pad" testID="input-profile-phone" />
        {!!user?.email && (
          <View style={styles.readonly}>
            <Feather name="mail" size={16} color={colors.muted} />
            <Text style={styles.readonlyText}>{user.email}</Text>
          </View>
        )}
        <Button title="Salvar" icon="save" onPress={save} loading={saving} testID="save-profile-button" style={{ marginTop: spacing.sm }} />
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
  headerTitle: { fontSize: font.lg, fontWeight: "800", color: colors.onSurface },
  readonly: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  readonlyText: { fontSize: font.base, color: colors.muted },
});

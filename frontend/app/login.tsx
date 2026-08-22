import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, font } from "@/src/theme";
import { Field, Button } from "@/src/components/ui";
import { useToast } from "@/src/components/Toast";
import { Logo } from "@/src/components/Logo";
import { useAuth } from "@/src/context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      toast.show("Preencha e-mail e senha", "error");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/dashboard");
    } catch (err: any) {
      toast.show(err.message || "Credenciais inválidas", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back-button" onPress={() => router.replace("/")} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
      </View>
      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, justifyContent: "center", paddingBottom: insets.bottom + spacing.xl }}
      >
        <View style={{ alignItems: "center", marginBottom: spacing["3xl"] }}>
          <Logo size="lg" />
          <Text style={styles.title}>Área da empresa</Text>
          <Text style={styles.sub}>Acesse para gerenciar e responder os orçamentos.</Text>
        </View>

        <Field label="E-mail" value={email} onChangeText={setEmail}
          placeholder="admin@internew.com.br" keyboardType="email-address" autoCapitalize="none" testID="input-login-email" />
        <Field label="Senha" value={password} onChangeText={setPassword}
          placeholder="••••••••" secureTextEntry testID="input-login-password" />
        <Button title="Entrar" icon="log-in" onPress={submit} loading={loading} testID="login-submit-button" />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  top: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: font.xl, fontWeight: "900", color: colors.onSurface, marginTop: spacing.xl },
  sub: { fontSize: font.base, color: colors.muted, marginTop: spacing.xs, textAlign: "center" },
});

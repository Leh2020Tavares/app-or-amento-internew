import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, font } from "@/src/theme";
import { Field, Button } from "@/src/components/ui";
import { GoogleButton, AppleButton, OrDivider } from "@/src/components/SocialButtons";
import { useToast } from "@/src/components/Toast";
import { Logo } from "@/src/components/Logo";
import { useAuth, User } from "@/src/context/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user, signInPassword, signInGoogle, signInApple, authInProgress } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  const routeByRole = (u: User) => {
    router.replace(u.role === "company_admin" ? "/dashboard" : "/my-quotes");
  };

  // Google (web redirect) sets user on return -> navigate away from login
  useEffect(() => {
    if (user) routeByRole(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submitPassword = async () => {
    if (!email.trim() || !password.trim()) {
      toast.show("Preencha e-mail e senha", "error");
      return;
    }
    setLoading(true);
    try {
      const u = await signInPassword(email.trim(), password);
      routeByRole(u);
    } catch (err: any) {
      toast.show(err.message || "Credenciais inválidas", "error");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    try {
      await signInGoogle();
    } catch (err: any) {
      toast.show(err.message || "Não foi possível entrar com Google", "error");
    }
  };

  const apple = async () => {
    try {
      const u = await signInApple();
      routeByRole(u);
    } catch (err: any) {
      if (err?.code === "ERR_REQUEST_CANCELED") return;
      toast.show(err.message || "Não foi possível entrar com Apple", "error");
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
        <View style={{ alignItems: "center", marginBottom: spacing["2xl"] }}>
          <Logo size="lg" />
          <Text style={styles.title}>Entrar</Text>
          <Text style={styles.sub}>Acesse para acompanhar ou responder orçamentos.</Text>
        </View>

        <GoogleButton onPress={google} loading={authInProgress} testID="google-signin-button" />
        <AppleButton onPress={apple} testID="apple-signin-button" />

        <OrDivider />

        {!showEmail ? (
          <Pressable testID="show-email-login" onPress={() => setShowEmail(true)} style={styles.emailToggle}>
            <Feather name="mail" size={16} color={colors.brandPrimary} />
            <Text style={styles.emailToggleText}>Entrar com e-mail e senha</Text>
          </Pressable>
        ) : (
          <View>
            <Field label="E-mail" value={email} onChangeText={setEmail}
              placeholder="admin@internew.com.br" keyboardType="email-address" autoCapitalize="none" testID="input-login-email" />
            <Field label="Senha" value={password} onChangeText={setPassword}
              placeholder="••••••••" secureTextEntry testID="input-login-password" />
            <Button title="Entrar" icon="log-in" onPress={submitPassword} loading={loading} testID="login-submit-button" />
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  top: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: font.xl, fontWeight: "900", color: colors.onSurface, marginTop: spacing.xl },
  sub: { fontSize: font.base, color: colors.muted, marginTop: spacing.xs, textAlign: "center" },
  emailToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md },
  emailToggleText: { color: colors.brandPrimary, fontWeight: "700", fontSize: font.lg },
});

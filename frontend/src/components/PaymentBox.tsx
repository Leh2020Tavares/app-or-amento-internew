import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Platform, Linking, AppState } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, font } from "@/src/theme";
import { Button } from "@/src/components/ui";
import { useToast } from "@/src/components/Toast";
import { api } from "@/src/api";

export function formatBRL(v: number) {
  return "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
}

export function PaymentBox({
  quoteId,
  entryAmount,
  status,
  onPaid,
}: {
  quoteId: string;
  entryAmount: number;
  status: string;
  onPaid?: () => void;
}) {
  const toast = useToast();
  const [payStatus, setPayStatus] = useState(status);
  const [loading, setLoading] = useState(false);
  const poll = useRef<any>(null);

  useEffect(() => setPayStatus(status), [status]);

  const check = async () => {
    try {
      const res = await api.getPaymentStatus(quoteId);
      setPayStatus(res.payment_status);
      if (res.payment_status === "paid") {
        if (poll.current) clearInterval(poll.current);
        toast.show("Entrada paga com sucesso!", "success");
        onPaid?.();
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // when app returns to foreground (after browser checkout), re-check
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && payStatus !== "paid") check();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payStatus]);

  useEffect(() => {
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, []);

  const pay = async () => {
    setLoading(true);
    try {
      const res = await api.createPaymentSession(quoteId);
      if (Platform.OS === "web") {
        window.location.assign(res.checkout_url);
        return;
      }
      if (poll.current) clearInterval(poll.current);
      poll.current = setInterval(check, 3000);
      await WebBrowser.openBrowserAsync(res.checkout_url);
      check();
    } catch (err: any) {
      if (err?.status === 503) {
        toast.show("Pagamento online ainda não está ativo. Fale com a empresa.", "info");
      } else {
        toast.show(err.message || "Não foi possível iniciar o pagamento", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!entryAmount || entryAmount <= 0) return null;

  const paid = payStatus === "paid";

  return (
    <View style={[styles.box, paid && styles.boxPaid]} testID="payment-box">
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Feather name={paid ? "check-circle" : "credit-card"} size={20} color={paid ? colors.success : colors.brandPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Entrada</Text>
          <Text style={styles.amount}>{formatBRL(entryAmount)}</Text>
        </View>
        {paid && (
          <View style={styles.paidTag}>
            <Text style={styles.paidTagText}>Paga ✓</Text>
          </View>
        )}
      </View>
      {!paid && (
        <>
          <Text style={styles.hint}>Pague a entrada com cartão de crédito ou Pix para confirmar seu pedido.</Text>
          <Button
            title={`Pagar entrada ${formatBRL(entryAmount)}`}
            icon="lock"
            variant="secondary"
            onPress={pay}
            loading={loading}
            testID="pay-entry-button"
            style={{ marginTop: spacing.md }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brandTertiary,
    marginTop: spacing.lg,
  },
  boxPaid: { backgroundColor: "#E7F4E9", borderColor: "#CDEBD3" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  label: { fontSize: font.sm, color: colors.muted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  amount: { fontSize: font.xl, fontWeight: "900", color: colors.onSurface },
  hint: { fontSize: font.base, color: colors.onSurfaceSecondary, marginTop: spacing.md, lineHeight: 20 },
  paidTag: { backgroundColor: colors.success, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  paidTagText: { color: "#fff", fontWeight: "800", fontSize: font.sm },
});

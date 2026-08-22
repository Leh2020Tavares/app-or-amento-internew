import React, { createContext, useContext, useRef, useState, useCallback } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, font, shadow } from "@/src/theme";

type ToastType = "success" | "error" | "info";
type Ctx = { show: (msg: string, type?: ToastType) => void };

const ToastContext = createContext<Ctx>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);

  const show = useCallback(
    (m: string, t: ToastType = "info") => {
      setMsg(m);
      setType(t);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      }, 2800);
    },
    [opacity]
  );

  const bg =
    type === "success" ? colors.success : type === "error" ? colors.error : colors.brandPrimary;
  const iconName = type === "success" ? "check-circle" : type === "error" ? "alert-circle" : "info";

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.wrap,
          { top: insets.top + spacing.sm, opacity },
        ]}
      >
        <View style={[styles.toast, { backgroundColor: bg }]}>
          <Feather name={iconName as any} size={18} color="#fff" />
          <Text style={styles.text}>{msg}</Text>
        </View>
      </Animated.View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center", zIndex: 9999 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    ...shadow.card,
    maxWidth: 520,
  },
  text: { color: "#fff", fontSize: font.base, fontWeight: "600", flexShrink: 1 },
});

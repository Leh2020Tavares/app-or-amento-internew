import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { colors, spacing, radius, font, shadow } from "@/src/theme";

// ---------- Button ----------
export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  icon,
  testID,
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  icon?: keyof typeof Feather.glyphMap;
  testID?: string;
  style?: ViewStyle;
}) {
  const bg =
    variant === "primary"
      ? colors.brandPrimary
      : variant === "secondary"
      ? colors.brandSecondary
      : "transparent";
  const fg =
    variant === "outline"
      ? colors.brandPrimary
      : variant === "ghost"
      ? colors.brandPrimary
      : colors.onBrandPrimary;

  const handle = () => {
    if (disabled || loading) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      testID={testID}
      onPress={handle}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        variant === "outline" && { borderWidth: 1.5, borderColor: colors.brandPrimary },
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnRow}>
          {icon && <Feather name={icon} size={18} color={fg} style={{ marginRight: spacing.sm }} />}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ---------- Input ----------
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  autoCapitalize,
  secureTextEntry,
  testID,
  required,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
  secureTextEntry?: boolean;
  testID?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          multiline && { height: 96, textAlignVertical: "top", paddingTop: spacing.md },
          error && { borderColor: colors.error },
        ]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ---------- Segmented chips ----------
export function ChipGroup({
  label,
  options,
  value,
  onChange,
  testID,
  required,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  testID?: string;
  required?: boolean;
}) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {options.map((opt) => {
          const active = value === opt;
          return (
            <Pressable
              key={opt}
              testID={`${testID}-${opt}`}
              onPress={() => onChange(opt)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------- Card ----------
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------- Status badge ----------
export function StatusBadge({ status }: { status: string }) {
  const responded = status === "responded";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: responded ? "#E7F4E9" : "#FEF3C7" },
      ]}
    >
      <View
        style={[
          styles.badgeDot,
          { backgroundColor: responded ? colors.success : colors.warning },
        ]}
      />
      <Text
        style={[
          styles.badgeText,
          { color: responded ? colors.success : "#B45309" },
        ]}
      >
        {responded ? "Respondido" : "Pendente"}
      </Text>
    </View>
  );
}

// ---------- Section title ----------
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnRow: { flexDirection: "row", alignItems: "center" },
  btnText: { fontSize: font.lg, fontWeight: "700" },
  label: {
    fontSize: font.base,
    fontWeight: "600",
    color: colors.onSurfaceSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    fontSize: font.lg,
    color: colors.onSurface,
  },
  errorText: { color: colors.error, fontSize: font.sm, marginTop: spacing.xs },
  chip: {
    flexShrink: 0,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: font.base, fontWeight: "600", color: colors.onSurfaceSecondary },
  chipTextActive: { color: colors.onBrandPrimary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadow.card,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, marginRight: spacing.xs },
  badgeText: { fontSize: font.sm, fontWeight: "700" },
  sectionLabel: {
    fontSize: font.sm,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
});

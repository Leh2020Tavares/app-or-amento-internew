import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, font, shadow } from "@/src/theme";
import { StatusBadge, Button } from "@/src/components/ui";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/Toast";
import { api } from "@/src/api";

const EMPTY_IMG =
  "https://images.pexels.com/photos/7722834/pexels-photo-7722834.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

function getInitials(name?: string, email?: string) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export default function MyQuotesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, signOut } = useAuth();
  const toast = useToast();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.myQuotes();
      setQuotes(list);
    } catch (err: any) {
      toast.show(err.message || "Erro ao carregar", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && !user) {
        router.replace("/login");
        return;
      }
      if (user) {
        setLoading(true);
        load();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading])
  );

  const logout = async () => {
    await signOut();
    router.replace("/");
  };

  const renderItem = ({ item }: { item: any }) => (
    <Pressable
      testID={`my-quote-${item.code}`}
      onPress={() => router.push({ pathname: "/track", params: { code: item.code } })}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.code}>#{item.code}</Text>
          <Text style={styles.product} numberOfLines={1}>{item.product}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      {item.status === "responded" && !!item.reply_price && (
        <View style={styles.priceRow}>
          <Feather name="tag" size={14} color={colors.brandSecondary} />
          <Text style={styles.price}>{item.reply_price}</Text>
        </View>
      )}
      <Text style={styles.date}>{item.quantity} {item.unit} • {formatDate(item.created_at)}</Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Meus orçamentos</Text>
          <Pressable testID="logout-button" onPress={logout} style={styles.iconBtn}>
            <Feather name="log-out" size={19} color={colors.error} />
          </Pressable>
        </View>

        <View style={styles.profileRow} testID="client-profile">
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} contentFit="cover" testID="client-avatar" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{getInitials(user?.name, user?.email)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName} numberOfLines={1} testID="client-name">
              {user?.name || "Cliente"}
            </Text>
            {!!user?.email && (
              <Text style={styles.profileEmail} numberOfLines={1} testID="client-email">
                {user.email}
              </Text>
            )}
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.brandPrimary} /></View>
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={(q) => q.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Image source={{ uri: EMPTY_IMG }} style={styles.emptyImg} contentFit="cover" />
              <Text style={styles.emptyTitle}>Você ainda não pediu orçamentos</Text>
              <Text style={styles.emptySub}>Faça seu primeiro pedido e acompanhe a resposta por aqui.</Text>
            </View>
          }
        />
      )}

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Novo orçamento" icon="plus" onPress={() => router.push("/")} testID="new-quote-button" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.divider, ...shadow.card,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hi: { fontSize: font.sm, color: colors.muted, fontWeight: "600" },
  headerTitle: { fontSize: font.xl, fontWeight: "900", color: colors.brandPrimary },
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceTertiary },
  avatarFallback: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.brandTertiary },
  avatarInitials: { fontSize: font.lg, fontWeight: "900", color: colors.brandPrimary },
  profileName: { fontSize: font.lg, fontWeight: "800", color: colors.onSurface },
  profileEmail: { fontSize: font.sm, color: colors.muted, marginTop: 1 },
  iconBtn: {
    width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.divider, ...shadow.card,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  code: { fontSize: font.sm, color: colors.muted, fontWeight: "700" },
  product: { fontSize: font.lg, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm },
  price: { fontSize: font.lg, fontWeight: "800", color: colors.brandSecondary },
  date: { fontSize: font.sm, color: colors.muted, marginTop: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: spacing["3xl"] },
  emptyImg: { width: 150, height: 150, borderRadius: radius.lg, marginBottom: spacing.xl, opacity: 0.9 },
  emptyTitle: { fontSize: font.xl, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  emptySub: { fontSize: font.base, color: colors.muted, marginTop: spacing.xs, textAlign: "center", paddingHorizontal: spacing.lg },
  cta: {
    position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider,
  },
});

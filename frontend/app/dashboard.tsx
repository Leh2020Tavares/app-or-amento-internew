import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, font, shadow } from "@/src/theme";
import { StatusBadge } from "@/src/components/ui";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/Toast";
import { api } from "@/src/api";

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "responded", label: "Respondidos" },
];

const EMPTY_IMG =
  "https://images.pexels.com/photos/7722834/pexels-photo-7722834.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, signOut, loading: authLoading } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [quotes, setQuotes] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, responded: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (f: string) => {
    try {
      const [list, st] = await Promise.all([
        api.listQuotes(f === "all" ? undefined : f),
        api.stats(),
      ]);
      setQuotes(list);
      setStats(st);
    } catch (err: any) {
      toast.show(err.message || "Erro ao carregar", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && !token) {
        router.replace("/login");
        return;
      }
      if (token) {
        setLoading(true);
        load(filter);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, authLoading, filter])
  );

  const onFilter = (f: string) => {
    setFilter(f);
    setLoading(true);
    load(f);
  };

  const logout = async () => {
    await signOut();
    router.replace("/");
  };

  const renderItem = ({ item }: { item: any }) => (
    <Pressable
      testID={`quote-card-${item.code}`}
      onPress={() => router.push({ pathname: "/quote/[id]", params: { id: item.id } })}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.customer_name}</Text>
          <Text style={styles.cardProduct} numberOfLines={1}>
            {item.product} • {item.quantity} {item.unit}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.request_type}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.category}</Text>
        </View>
        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerHi}>Painel de orçamentos</Text>
            <Text style={styles.headerTitle}>INTERNEW</Text>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable testID="settings-button" onPress={() => router.push("/settings")} style={styles.iconBtn}>
              <Feather name="settings" size={19} color={colors.onSurface} />
            </Pressable>
            <Pressable testID="logout-button" onPress={logout} style={styles.iconBtn}>
              <Feather name="log-out" size={19} color={colors.error} />
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.warning }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.success }]}>{stats.responded}</Text>
            <Text style={styles.statLabel}>Respondidos</Text>
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                testID={`filter-${f.key}`}
                onPress={() => onFilter(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={(q) => q.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(filter); }} tintColor={colors.brandPrimary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Image source={{ uri: EMPTY_IMG }} style={styles.emptyImg} contentFit="cover" />
              <Text style={styles.emptyTitle}>Nenhum orçamento aqui</Text>
              <Text style={styles.emptySub}>Os pedidos dos clientes aparecerão nesta lista.</Text>
            </View>
          }
        />
      )}
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
  headerHi: { fontSize: font.sm, color: colors.muted, fontWeight: "600" },
  headerTitle: { fontSize: font.xl, fontWeight: "900", color: colors.brandPrimary },
  iconBtn: {
    width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  statBox: {
    flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingVertical: spacing.md,
    alignItems: "center", borderWidth: 1, borderColor: colors.divider,
  },
  statNum: { fontSize: font["2xl"], fontWeight: "900", color: colors.brandPrimary },
  statLabel: { fontSize: font.sm, color: colors.muted, fontWeight: "600", marginTop: 2 },
  filterRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  filterChip: {
    flexShrink: 0, height: 38, paddingHorizontal: spacing.lg, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  filterChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  filterText: { fontSize: font.base, fontWeight: "700", color: colors.onSurfaceSecondary },
  filterTextActive: { color: colors.onBrandPrimary },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.divider, ...shadow.card,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  cardName: { fontSize: font.lg, fontWeight: "800", color: colors.onSurface },
  cardProduct: { fontSize: font.base, color: colors.muted, marginTop: 2 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  tag: { backgroundColor: colors.surfaceTertiary, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.sm },
  tagText: { fontSize: font.sm, color: colors.onSurfaceTertiary, fontWeight: "700" },
  date: { marginLeft: "auto", fontSize: font.sm, color: colors.muted },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: spacing["3xl"] },
  emptyImg: { width: 160, height: 160, borderRadius: radius.lg, marginBottom: spacing.xl, opacity: 0.9 },
  emptyTitle: { fontSize: font.xl, fontWeight: "800", color: colors.onSurface },
  emptySub: { fontSize: font.base, color: colors.muted, marginTop: spacing.xs, textAlign: "center" },
});

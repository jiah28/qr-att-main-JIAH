
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type DataRow = Record<string, any>;

type DashboardData = {
  users: DataRow[];
  events: DataRow[];
  attendance: DataRow[];
  userCount: number;
  eventCount: number;
  attendanceCount: number;
};

const EMPTY_DATA: DashboardData = {
  users: [],
  events: [],
  attendance: [],
  userCount: 0,
  eventCount: 0,
  attendanceCount: 0,
};

type Section = 'overview' | 'users' | 'events' | 'attendance';

export default function AdminScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [section, setSection] = useState<Section>('overview');
  const [errorMessage, setErrorMessage] = useState('');

  const loadDashboard = useCallback(async (refresh = false) => {
    if (!user) {
      setLoading(false);
      setIsAdmin(false);
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');

    try {
      // Verify the current user's role before loading admin data.
      const { data: ownProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const role = String(ownProfile?.role ?? '')
        .trim()
        .toLowerCase();

      if (role !== 'admin') {
        setIsAdmin(false);
        setData(EMPTY_DATA);
        return;
      }

      setIsAdmin(true);

      // Counts and lists use the existing project tables.
      const [
        usersResult,
        eventsResult,
        attendanceResult,
        userCountResult,
        eventCountResult,
        attendanceCountResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*').limit(100),
        supabase.from('events').select('*').limit(100),
        supabase.from('attendance').select('*').limit(100),
        supabase.from('profiles').select('*', {
          count: 'exact',
          head: true,
        }),
        supabase.from('events').select('*', {
          count: 'exact',
          head: true,
        }),
        supabase.from('attendance').select('*', {
          count: 'exact',
          head: true,
        }),
      ]);

      const firstError =
        usersResult.error ||
        eventsResult.error ||
        attendanceResult.error ||
        userCountResult.error ||
        eventCountResult.error ||
        attendanceCountResult.error;

      if (firstError) throw firstError;

      setData({
        users: usersResult.data ?? [],
        events: eventsResult.data ?? [],
        attendance: attendanceResult.data ?? [],
        userCount: userCountResult.count ?? 0,
        eventCount: eventCountResult.count ?? 0,
        attendanceCount: attendanceCountResult.count ?? 0,
      });
    } catch (error: any) {
      console.error('Admin dashboard error:', error);
      setErrorMessage(
        error?.message ||
          'Unable to load dashboard data. Check your Supabase setup.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return 'Not available';
    }

    return String(value);
  };

  const formatDate = (value: unknown) => {
    if (!value) return 'Date not available';

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString();
  };

  const getUserName = (item: DataRow) =>
    item.full_name || item.email || item.id || 'Unknown user';

  const getEventTitle = (item: DataRow) =>
    item.title || item.eventTitle || item.event_id || item.eventId ||
    'Untitled event';

  const getAttendanceName = (item: DataRow) =>
    item.student_id || item.user_id || item.email || 'Attendance record';

  const renderStat = (
    title: string,
    value: number,
    icon: keyof typeof Ionicons.glyphMap
  ) => (
    <View style={styles.statCard} key={title}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={23} color={COLORS.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const renderMenu = (
    value: Section,
    title: string,
    icon: keyof typeof Ionicons.glyphMap
  ) => (
    <Pressable
      key={value}
      onPress={() => setSection(value)}
      style={[
        styles.menuButton,
        section === value && styles.menuButtonActive,
      ]}
    >
      <Ionicons
        name={icon}
        size={19}
        color={section === value ? '#FFFFFF' : COLORS.primary}
      />
      <Text
        style={[
          styles.menuText,
          section === value && styles.menuTextActive,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );

  const renderRow = (
    title: string,
    subtitle: string,
    badge?: string,
    key?: string
  ) => (
    <View style={styles.listRow} key={key ?? title}>
      <View style={styles.listAvatar}>
        <Ionicons
          name="document-text-outline"
          size={20}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.listDetails}>
        <Text style={styles.listTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.listSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>

      {badge ? (
        <View style={styles.smallBadge}>
          <Text style={styles.smallBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );

  const renderContent = () => {
    if (section === 'overview') {
      return (
        <>
          <Text style={styles.sectionTitle}>Dashboard Overview</Text>
          <Text style={styles.sectionDescription}>
            Monitor your QR attendance system.
          </Text>

          <View style={styles.statsGrid}>
            {renderStat('Total Users', data.userCount, 'people-outline')}
            {renderStat('Total Events', data.eventCount, 'calendar-outline')}
            {renderStat(
              'Attendance Records',
              data.attendanceCount,
              'clipboard-outline'
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Quick Actions</Text>

            {renderMenu('users', 'Manage Users', 'people-outline')}
            {renderMenu('events', 'Manage Events', 'calendar-outline')}
            {renderMenu(
              'attendance',
              'Attendance Reports',
              'bar-chart-outline'
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Events</Text>

            {data.events.length === 0 ? (
              <Text style={styles.emptyText}>No events available.</Text>
            ) : (
              data.events.slice(-5).reverse().map((event, index) =>
                renderRow(
                  formatValue(getEventTitle(event)),
                  `Start: ${formatDate(event.start)}`,
                  undefined,
                  `event-${event.eventId ?? event.id ?? index}`
                )
              )
            )}
          </View>
        </>
      );
    }

    if (section === 'users') {
      return (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>User Management</Text>
          <Text style={styles.sectionDescription}>
            Registered accounts and assigned roles.
          </Text>

          {data.users.length === 0 ? (
            <Text style={styles.emptyText}>No users found.</Text>
          ) : (
            data.users.map((item, index) =>
              renderRow(
                formatValue(getUserName(item)),
                formatValue(item.email),
                formatValue(item.role),
                `user-${item.id ?? index}`
              )
            )
          )}
        </View>
      );
    }

    if (section === 'events') {
      return (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Event Management</Text>
          <Text style={styles.sectionDescription}>
            Review events currently stored in Supabase.
          </Text>

          {data.events.length === 0 ? (
            <Text style={styles.emptyText}>No events found.</Text>
          ) : (
            data.events.map((item, index) =>
              renderRow(
                formatValue(getEventTitle(item)),
                `Start: ${formatDate(item.start)}`,
                item.status ? String(item.status) : undefined,
                `event-${item.eventId ?? item.id ?? index}`
              )
            )
          )}

          <Text style={styles.noticeText}>
            This screen displays events. Create, edit, and delete actions
            require your event schema and database policies to be configured.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Attendance Reports</Text>
        <Text style={styles.sectionDescription}>
          Review the latest attendance records.
        </Text>

        {data.attendance.length === 0 ? (
          <Text style={styles.emptyText}>No attendance records found.</Text>
        ) : (
          data.attendance.map((item, index) =>
            renderRow(
              formatValue(getAttendanceName(item)),
              `${formatValue(item.eventTitle || item.eventId)} · ${formatDate(item.scannedAt)}`,
              item.status ? String(item.status) : undefined,
              `attendance-${item.id ?? index}`
            )
          )
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons
          name="lock-closed-outline"
          size={48}
          color={COLORS.primary}
        />
        <Text style={styles.deniedTitle}>Login Required</Text>
        <Text style={styles.sectionDescription}>
          Sign in to access your account.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.primaryButtonText}>Go to Login</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!isAdmin && !errorMessage) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.deniedIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={42}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.deniedTitle}>Admin Access Required</Text>
        <Text style={styles.sectionDescription}>
          Your account does not have the Admin role. Please contact your
          system administrator.
        </Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </Pressable>
        <Pressable
          style={styles.textButton}
          onPress={() => loadDashboard()}
        >
          <Text style={styles.textButtonLabel}>Check Access Again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>QR-ATT-MAIN</Text>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>
              Welcome, {user.email || 'Administrator'}
            </Text>
          </View>

          <View style={styles.adminIcon}>
            <Ionicons
              name="shield-checkmark"
              size={28}
              color={COLORS.primary}
            />
          </View>
        </View>

        <View style={styles.refreshRow}>
          <View style={styles.adminBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.adminBadgeText}>Administrator</Text>
          </View>

          <Pressable
            onPress={() => loadDashboard(true)}
            style={styles.refreshButton}
            disabled={refreshing}
          >
            <Ionicons
              name="refresh-outline"
              size={19}
              color={COLORS.primary}
            />
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={23}
              color="#C62828"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Unable to load data</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Text style={styles.errorHint}>
                Check your table names, Supabase connection, and Row Level
                Security policies.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.menuContainer}>
          {renderMenu('overview', 'Overview', 'grid-outline')}
          {renderMenu('users', 'Users', 'people-outline')}
          {renderMenu('events', 'Events', 'calendar-outline')}
          {renderMenu('attendance', 'Reports', 'bar-chart-outline')}
        </View>

        {renderContent()}

        <Text style={styles.footer}>
          QR-ATT-MAIN · Admin Management
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 18,
    paddingBottom: 35,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 5,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 25,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 6,
  },
  adminIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  refreshRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22A06B',
  },
  adminBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  refreshText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  menuContainer: {
    gap: 8,
    marginBottom: 20,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  menuButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  menuText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  menuTextActive: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 15,
    marginBottom: 18,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '29%',
    minWidth: 95,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 13,
  },
  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statTitle: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 17,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listAvatar: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listDetails: {
    flex: 1,
  },
  listTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  listSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  smallBadge: {
    maxWidth: 90,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
  },
  smallBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    paddingVertical: 15,
  },
  noticeText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  errorCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FDECEC',
    borderColor: '#F3C5C5',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  errorTitle: {
    color: '#9B1C1C',
    fontWeight: '800',
    fontSize: 14,
  },
  errorText: {
    color: '#9B1C1C',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  errorHint: {
    color: '#7D3434',
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  deniedIcon: {
    width: 78,
    height: 78,
    borderRadius: 25,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  deniedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 13,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 13,
    marginTop: 10,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  textButton: {
    padding: 14,
  },
  textButtonLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
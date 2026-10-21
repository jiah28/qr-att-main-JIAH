import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const C = {
  background: '#F8F5FF',
  white: '#FFFFFF',
  pink: '#B9A0E8',
  pinkDark: '#8064B0',
  lightPink: '#EDE5FA',
  border: '#D8C8F0',
  text: '#514365',
  muted: '#9382AB',
  green: '#438A70',
  purple: '#9B85CC',
};

type ChecklistItem = {
  id: string;
  title: string;
  completed: boolean;
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('Student');
  const [role, setRole] = useState('student');

  // Checklist State & Controls
  const [prepChecklist, setPrepChecklist] = useState<ChecklistItem[]>([
    { id: '1', title: 'Verify camera & QR scanner permissions', completed: true },
    { id: '2', title: 'Generate session QR code for event', completed: false },
    { id: '3', title: 'Sync offline attendance buffer', completed: false },
  ]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const loadHome = useCallback(async () => {
    setError('');

    try {
      if (!user) {
        setFullName('Guest');
        return;
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
      } else if (data) {
        setFullName(
          data.full_name ||
            user.email?.split('@')[0] ||
            'User'
        );
        setRole(data.role || 'student');
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to load dashboard.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadHome();
    }, [loadHome])
  );

  const refresh = async () => {
    setRefreshing(true);
    await loadHome();
  };

  // Toggle item checkbox
  const togglePrepItem = (id: string) => {
    setPrepChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // Add new item
  const handleAddItem = () => {
    if (!newItemTitle.trim()) return;
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      title: newItemTitle.trim(),
      completed: false,
    };
    setPrepChecklist((prev) => [...prev, newItem]);
    setNewItemTitle('');
  };

  // Start editing item
  const handleStartEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  // Save edited item
  const handleSaveEdit = (id: string) => {
    if (!editingTitle.trim()) return;
    setPrepChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, title: editingTitle.trim() } : item
      )
    );
    setEditingId(null);
    setEditingTitle('');
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    setPrepChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.pink} />
        <Text style={styles.muted}>Loading your dashboard...</Text>
      </View>
    );
  }

  // Calculate stats dynamically
  const completedTasksCount = prepChecklist.filter((t) => t.completed).length;
  const totalTasksCount = prepChecklist.length;
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={C.pink}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.topBar}>
          <View style={styles.brandIcon}>
            <Ionicons
              name="qr-code-outline"
              size={27}
              color={C.pinkDark}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>QR Attendance</Text>
            <Text style={styles.brandSubtitle}>
              Your attendance space
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={refresh}
            accessibilityLabel="Refresh dashboard"
          >
            <Ionicons
              name="refresh-outline"
              size={22}
              color={C.pinkDark}
            />
          </Pressable>
        </View>

        {/* Improved Welcome Banner with QR Code Badge */}
        <View style={styles.welcomeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name} numberOfLines={2}>
              {fullName}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role}</Text>
            </View>
          </View>

          <View style={styles.welcomeIcon}>
            <Ionicons name="qr-code" size={32} color={C.pinkDark} />
          </View>
        </View>

        {/* Scan QR Code Button */}
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push('/scan')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="qr-code" size={31} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Scan QR Code</Text>
            <Text style={styles.actionSubtitle}>
              Scan your event QR to record attendance.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#FFFFFF"
          />
        </Pressable>

        {/* History Button */}
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push('/history')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="time" size={26} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>History</Text>
            <Text style={styles.actionSubtitle}>
              Review past attendance and event logs.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#FFFFFF"
          />
        </Pressable>

        {/* My Profile Button */}
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="person" size={26} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>My Profile</Text>
            <Text style={styles.actionSubtitle}>
              View personal details and account settings.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#FFFFFF"
          />
        </Pressable>

        {/* Useful Feature: Dynamic Quick Session Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Ionicons name="checkmark-done-circle" size={20} color={C.green} />
            <View>
              <Text style={styles.summaryVal}>
                {completedTasksCount}/{totalTasksCount}
              </Text>
              <Text style={styles.summaryLbl}>Tasks Done</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <View style={styles.onlineDot} />
            <View>
              <Text style={styles.summaryVal}>Online</Text>
              <Text style={styles.summaryLbl}>Scanner Status</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Ionicons name="calendar-outline" size={18} color={C.pinkDark} />
            <View>
              <Text style={styles.summaryVal}>{todayFormatted}</Text>
              <Text style={styles.summaryLbl}>Today's Date</Text>
            </View>
          </View>
        </View>

        {/* Event Preparation Checklist Card */}
        <View style={styles.checklistContainer}>
          <View style={styles.checklistHeader}>
            <View style={styles.checklistHeaderIcon}>
              <Ionicons name="checkbox" size={18} color={C.pinkDark} />
            </View>
            <Text style={styles.checklistHeaderText}>Event Preparation Checklist</Text>
          </View>

          {/* Add New Item Input */}
          <View style={styles.addInputRow}>
            <TextInput
              style={styles.addTextInput}
              placeholder="Type a new prep task..."
              placeholderTextColor={C.muted}
              value={newItemTitle}
              onChangeText={setNewItemTitle}
              onSubmitEditing={handleAddItem}
            />
            <Pressable style={styles.addButton} onPress={handleAddItem}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Checklist Items List */}
          {prepChecklist.map((item) => (
            <View
              key={item.id}
              style={[
                styles.checklistItem,
                item.completed && styles.checklistCompletedItem,
              ]}
            >
              <Pressable
                onPress={() => togglePrepItem(item.id)}
                style={styles.checkboxTouch}
              >
                <Ionicons
                  name={item.completed ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={item.completed ? C.green : C.muted}
                />
              </Pressable>

              {editingId === item.id ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.editTextInput}
                    value={editingTitle}
                    onChangeText={setEditingTitle}
                    autoFocus
                  />
                  <Pressable
                    style={styles.saveEditBtn}
                    onPress={() => handleSaveEdit(item.id)}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : (
                <Text
                  style={[
                    styles.checklistText,
                    item.completed && styles.checklistCompletedText,
                  ]}
                  onPress={() => togglePrepItem(item.id)}
                >
                  {item.title}
                </Text>
              )}

              {editingId !== item.id && (
                <View style={styles.itemActions}>
                  <Pressable
                    onPress={() => handleStartEdit(item)}
                    style={styles.iconActionBtn}
                  >
                    <Ionicons name="pencil" size={16} color={C.pinkDark} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteItem(item.id)}
                    style={styles.iconActionBtnDelete}
                  >
                    <Ionicons name="trash" size={16} color="#B4234D" />
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#B4234D"
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Made with care • QR-ATT
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    padding: 18,
    paddingBottom: 35,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.lightPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  brand: {
    color: C.text,
    fontSize: 17,
    fontWeight: '800',
  },
  brandSubtitle: {
    color: C.muted,
    fontSize: 11,
    marginTop: 3,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: C.border,
    borderWidth: 1,
    marginLeft: 'auto',
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.lightPink,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 16,
  },
  greeting: {
    color: C.muted,
    fontSize: 15,
  },
  name: {
    color: C.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: C.white,
    borderRadius: 9,
  },
  roleText: {
    color: C.pinkDark,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  welcomeIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: C.pink,
    borderRadius: 21,
    marginBottom: 16,
  },
  actionIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  actionSubtitle: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryVal: {
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
  },
  summaryLbl: {
    color: C.muted,
    fontSize: 10,
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: C.border,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.green,
  },
  checklistContainer: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 16,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  checklistHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.lightPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistHeaderText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 10,
  },
  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  addTextInput: {
    flex: 1,
    backgroundColor: '#F8F5FF',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: C.text,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: C.pinkDark,
    borderRadius: 14,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FAFAFD',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0EAF9',
  },
  checklistCompletedItem: {
    backgroundColor: '#F4EFFE',
    borderColor: C.border,
  },
  checkboxTouch: {
    marginRight: 4,
  },
  checklistText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  checklistCompletedText: {
    color: C.muted,
    textDecorationLine: 'line-through',
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  editTextInput: {
    flex: 1,
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: C.text,
    marginRight: 8,
  },
  saveEditBtn: {
    backgroundColor: C.green,
    borderRadius: 8,
    padding: 8,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: C.lightPink,
    marginRight: 4,
  },
  iconActionBtnDelete: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FCE8EE',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE8EE',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  errorText: {
    flex: 1,
    color: '#B4234D',
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 9,
  },
  muted: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    color: C.muted,
    textAlign: 'center',
    fontSize: 11,
    marginTop: 25,
  },
});
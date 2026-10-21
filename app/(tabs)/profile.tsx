import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { signOut, useAuth } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [department, setDepartment] = useState('BSIT');
  const [yearLevel, setYearLevel] = useState('3rd Year');
  const [section, setSection] = useState('E');

  const [draftDepartment, setDraftDepartment] = useState('BSIT');
  const [draftYearLevel, setDraftYearLevel] = useState('3rd Year');
  const [draftSection, setDraftSection] = useState('E');

  const [photo, setPhoto] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const photoKey = user ? `profile_photo_${user.id}` : '';

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [result, savedPhoto, savedDept, savedYear, savedSection] = await Promise.all([
        getProfile(user.id),
        AsyncStorage.getItem(`profile_photo_${user.id}`),
        AsyncStorage.getItem(`profile_dept_${user.id}`),
        AsyncStorage.getItem(`profile_year_${user.id}`),
        AsyncStorage.getItem(`profile_section_${user.id}`),
      ]);

      setProfile(result);
      setDraftName(result?.full_name ?? '');
      setPhoto(savedPhoto);

      const deptVal = savedDept || 'BSIT';
      const yearVal = savedYear || '3rd Year';
      const sectionVal = savedSection || 'E';

      setDepartment(deptVal);
      setDraftDepartment(deptVal);
      setYearLevel(yearVal);
      setDraftYearLevel(yearVal);
      setSection(sectionVal);
      setDraftSection(sectionVal);
    } catch (error) {
      console.error('Profile loading error:', error);
      Alert.alert(
        'Profile Error',
        'Unable to load your profile. Please check your connection and Supabase setup.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const choosePhoto = async () => {
    if (!user) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Gallery Permission',
          'Please allow gallery access to choose your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const selectedPhoto = result.assets[0].uri;

      await AsyncStorage.setItem(photoKey, selectedPhoto);
      setPhoto(selectedPhoto);

      Alert.alert('Success', 'Your profile picture has been updated.');
    } catch (error) {
      console.error('Photo selection error:', error);
      Alert.alert(
        'Error',
        'Could not update your photo. Please try again.'
      );
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    const name = draftName.trim();
    const dept = draftDepartment.trim();
    const year = draftYearLevel.trim();
    const sec = draftSection.trim();

    if (!name) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(
        user.id,
        { full_name: name },
        user.email ?? undefined
      );

      if (error) {
        Alert.alert('Save Failed', error);
        return;
      }

      // Save academic info locally
      await Promise.all([
        AsyncStorage.setItem(`profile_dept_${user.id}`, dept),
        AsyncStorage.setItem(`profile_year_${user.id}`, year),
        AsyncStorage.setItem(`profile_section_${user.id}`, sec),
      ]);

      setProfile((previous) =>
        previous ? { ...previous, full_name: name } : previous
      );

      setDepartment(dept);
      setYearLevel(year);
      setSection(sec);

      setDraftName(name);
      setEditing(false);

      Alert.alert('Success', 'Your profile has been updated successfully.');
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Error', 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (error: any) {
      Alert.alert(
        'Sign Out Failed',
        error?.message || 'Please try again.'
      );
    } finally {
      setSigningOut(false);
    }
  };

  const getInitials = (name?: string | null) => {
    const parts = (name || user?.email || 'User')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return (parts[0] || 'U').slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.muted}>Loading your profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons
          name="person-circle-outline"
          size={64}
          color={COLORS.primary}
        />
        <Text style={styles.heading}>Please sign in</Text>
        <AppButton
          title="Go to Login"
          icon="log-in-outline"
          onPress={() => router.replace('/login')}
        />
      </View>
    );
  }

  const isTeacher = profile?.role?.toLowerCase() === 'teacher';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.wrapper}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>QR ATTENDANCE</Text>
            <Text style={styles.title}>My Profile</Text>
            <Text style={styles.subtitle}>
              Manage your personal information
            </Text>
          </View>

          <View style={styles.topIcon}>
            <Ionicons
              name="person-outline"
              size={24}
              color={COLORS.primary}
            />
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.decorCircle} />

          <Pressable
            onPress={choosePhoto}
            style={styles.avatarWrapper}
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
          >
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {getInitials(profile?.full_name)}
                </Text>
              </View>
            )}

            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={17} color="#FFFFFF" />
            </View>
          </Pressable>

          <Text style={styles.profileName}>
            {profile?.full_name || 'Add your full name'}
          </Text>

          <Text style={styles.profileEmail}>{user.email || 'No email'}</Text>

          <View
            style={[
              styles.roleBadge,
              isTeacher ? styles.teacherBadge : styles.studentBadge,
            ]}
          >
            <Ionicons
              name={isTeacher ? 'school-outline' : 'person-outline'}
              size={14}
              color={isTeacher ? '#FFFFFF' : COLORS.primary}
            />
            <Text
              style={[
                styles.roleText,
                !isTeacher && styles.studentRoleText,
              ]}
            >
              {isTeacher ? 'Teacher' : 'Student'}
            </Text>
          </View>

          <Pressable onPress={choosePhoto} style={styles.changePhotoButton}>
            <Ionicons
              name="image-outline"
              size={17}
              color={COLORS.primary}
            />
            <Text style={styles.changePhotoText}>
              Change Profile Picture
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.cardTitle}>Personal Information</Text>
              <Text style={styles.cardSubtitle}>
                Your account details
              </Text>
            </View>
            {!editing && (
              <Pressable
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <Ionicons
                  name="create-outline"
                  size={17}
                  color={COLORS.primary}
                />
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.label}>Full Name</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="words"
              editable={!saving}
              returnKeyType="done"
            />
          ) : (
            <View style={styles.valueBox}>
              <Ionicons
                name="person"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.valueText}>
                {profile?.full_name || 'Not set'}
              </Text>
            </View>
          )}

          <Text style={styles.label}>Email Address</Text>
          <View style={styles.valueBox}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.valueText}>{user.email || 'Not set'}</Text>
          </View>

          <Text style={styles.label}>User ID</Text>
          <View style={styles.valueBox}>
            <Ionicons
              name="finger-print-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.userIdText} selectable>
              {user.id}
            </Text>
          </View>
        </View>

        {/* Academic Information Section (Now Editable) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="school-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.cardTitle}>Academic Information</Text>
              <Text style={styles.cardSubtitle}>
                Your department and section
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Department</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={draftDepartment}
              onChangeText={setDraftDepartment}
              placeholder="e.g. BSIT"
              placeholderTextColor={COLORS.textSecondary}
              editable={!saving}
            />
          ) : (
            <View style={styles.valueBox}>
              <Ionicons
                name="business-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.valueText}>{department}</Text>
            </View>
          )}

          <Text style={styles.label}>Year Level</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={draftYearLevel}
              onChangeText={setDraftYearLevel}
              placeholder="e.g. 3rd Year"
              placeholderTextColor={COLORS.textSecondary}
              editable={!saving}
            />
          ) : (
            <View style={styles.valueBox}>
              <Ionicons
                name="book-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.valueText}>{yearLevel}</Text>
            </View>
          )}

          <Text style={styles.label}>Block / Section</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={draftSection}
              onChangeText={setDraftSection}
              placeholder="e.g. E"
              placeholderTextColor={COLORS.textSecondary}
              editable={!saving}
            />
          ) : (
            <View style={styles.valueBox}>
              <Ionicons
                name="people-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.valueText}>{section}</Text>
            </View>
          )}

          {editing && (
            <View style={styles.editActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setDraftName(profile?.full_name ?? '');
                  setDraftDepartment(department);
                  setDraftYearLevel(yearLevel);
                  setDraftSection(section);
                  setEditing(false);
                }}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.saveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={saveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color="#FFFFFF"
                  />
                )}
                <Text style={styles.saveText}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.tipCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={23}
            color={COLORS.primary}
          />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Keep your profile updated</Text>
            <Text style={styles.tipText}>
              Use a clear profile picture and your correct account name
              for easier identification.
            </Text>
          </View>
        </View>

        <View style={styles.signOutCard}>
          <View style={styles.signOutInfo}>
            <View style={styles.signOutIcon}>
              <Ionicons
                name="log-out-outline"
                size={21}
                color="#D9485F"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.signOutTitle}>Sign Out</Text>
              <Text style={styles.signOutDescription}>
                Sign out of your account on this device.
              </Text>
            </View>
          </View>

          <AppButton
            title={signingOut ? 'Signing Out...' : 'Sign Out'}
            icon="log-out-outline"
            onPress={handleSignOut}
            disabled={signingOut}
          />
        </View>

        <Text style={styles.footer}>
          QR-ATT-MAIN · Attendance Management
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  wrapper: {
    width: '100%',
    maxWidth: 600,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  muted: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: COLORS.primary,
    marginBottom: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  topIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    padding: 24,
    marginBottom: 18,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: COLORS.surface,
    top: -120,
    right: -40,
  },
  avatarWrapper: {
    width: 112,
    height: 112,
    marginBottom: 14,
    position: 'relative',
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 3,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  avatarPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.primary,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.card,
  },
  profileName: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 13,
  },
  teacherBadge: {
    backgroundColor: COLORS.primary,
  },
  studentBadge: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  studentRoleText: {
    color: COLORS.primary,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  changePhotoText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  sectionHeadingText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 13,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    marginBottom: 17,
  },
  valueBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 17,
  },
  valueText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  userIdText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    minHeight: 45,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 17,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  saveButton: {
    minHeight: 45,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.65,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  signOutCard: {
    padding: 17,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  signOutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signOutIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#FCE8EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  signOutDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  heading: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 20,
  },
});
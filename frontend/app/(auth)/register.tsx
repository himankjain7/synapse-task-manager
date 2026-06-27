import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, ActivityIndicator, ScrollView, useWindowDimensions, AccessibilityInfo } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { Text } from '../../components/typography/Text';
import { Heading } from '../../components/typography/Heading';
import { PressScale } from '../../components/animations/PressScale';
import { RipplePress } from '../../components/animations/RipplePress';
import { Shimmer } from '../../components/animations/Shimmer';
import { SkeletonForm } from '../../components/animations/Skeleton';
import { triggerHaptic } from '../../utils/haptics';

function EyeIcon({ visible }: { visible: boolean }) {
  const theme = useTheme();
  return (
    <Text style={{ fontSize: 18, color: theme.colors.text.tertiary }}>
      {visible ? '\u{1F441}' : '\u{1F441}\u{200D}\u{1F5E8}'}
    </Text>
  );
}

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { register } = useAuthStore();
  const { signIn: googleSignIn, loading: gLoading, error: gError, disabled: gDisabled } = useGoogleAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const errorSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    const dur = reduceMotion ? 50 : 400;
    const delay = reduceMotion ? 0 : 150;

    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.timing(logoFade, { toValue: 1, duration: dur, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(fadeAnim, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
      ]).start();
    }, delay);
  }, [reduceMotion]);

  useEffect(() => {
    if (gError) {
      setError(gError);
      triggerHaptic('error');
    }
  }, [gError]);

  const shakeError = useCallback(() => {
    errorSlide.setValue(0);
    Animated.sequence([
      Animated.timing(errorSlide, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(errorSlide, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(errorSlide, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(errorSlide, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [errorSlide]);

  const handleError = useCallback((msg: string) => {
    setError(msg);
    triggerHaptic('error');
    shakeError();
  }, [shakeError]);

  const handleGoogle = useCallback(async () => {
    setError('');
    triggerHaptic('light');
    setLoading(true);
    const ok = await googleSignIn();
    setLoading(false);
    if (ok) {
      triggerHaptic('success');
      router.replace('/(protected)');
    }
  }, [googleSignIn, router]);

  const handleRegister = useCallback(async () => {
    setError('');
    if (!name.trim()) {
      handleError('Enter your full name to continue');
      nameRef.current?.focus();
      return;
    }
    if (!email.trim()) {
      handleError('Enter your email address to continue');
      emailRef.current?.focus();
      return;
    }
    if (!password.trim()) {
      handleError('Enter a password to continue');
      passwordRef.current?.focus();
      return;
    }
    if (password.length < 8) {
      handleError('Password must be at least 8 characters');
      passwordRef.current?.focus();
      return;
    }
    if (password !== confirmPassword) {
      handleError('Passwords do not match. Please try again.');
      confirmRef.current?.focus();
      return;
    }
    setLoading(true);
    triggerHaptic('light');
    try {
      await register(name.trim(), email.trim(), password);
      triggerHaptic('success');
      router.replace('/(protected)');
    } catch (err: any) {
      handleError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [name, email, password, confirmPassword, register, router, handleError]);

  const isTablet = screenWidth >= 768;
  const maxContentWidth = isTablet ? 420 : screenWidth;

  if (!reduceMotion && loading && email && password) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.skeletonWrap}>
          <View style={styles.skeletonCenter}>
            <Shimmer width={72} height={72} borderRadius={20} style={{ marginBottom: 24 }} />
          </View>
          <SkeletonForm fields={4} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.inner, { maxWidth: maxContentWidth }]}>
          <Animated.View style={[styles.topSection, { opacity: logoFade, transform: [{ scale: logoScale }] }]}>
            <View style={[styles.logoContainer, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Heading level={2} style={{ marginTop: theme.spacing.lg }}>Create your account</Heading>
            <Text variant="bodyLarge" color="secondary" align="center" style={{ marginTop: theme.spacing.xs }}>
              Get started with your workspace
            </Text>
          </Animated.View>

          <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Animated.View style={{ transform: [{ translateX: errorSlide }] }}>
              {error ? (
                <View
                  style={[styles.errorBanner, { backgroundColor: theme.colors.dangerLight, borderColor: theme.colors.danger + '25' }]}
                  accessibilityRole="alert"
                  accessibilityLabel={error}
                >
                  <Text variant="bodySmall" color="danger" style={{ textAlign: 'center', lineHeight: 18 }}>{error}</Text>
                </View>
              ) : null}
            </Animated.View>

            <RipplePress
              style={[styles.googleButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: gDisabled ? 0.5 : 1 }]}
              onPress={handleGoogle}
              disabled={loading || gDisabled}
              rippleColor="rgba(66, 133, 244, 0.12)"
              accessibilityLabel="Sign up with Google"
              accessibilityRole="button"
            >
              <View style={styles.googleInner}>
                <Text style={styles.googleIcon}>G</Text>
                <Text weight="semibold" style={[styles.googleButtonText, { color: theme.colors.text.primary }]}>
                  Continue with Google
                </Text>
              </View>
            </RipplePress>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1, color: theme.colors.text.tertiary, marginHorizontal: 12 }}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            <View style={[styles.inputGroup, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <Text variant="caption" color="tertiary" style={styles.inputLabel}>Full Name</Text>
              <TextInput
                ref={nameRef}
                style={[styles.input, { color: theme.colors.text.primary }]}
                placeholder="Michael Scott"
                placeholderTextColor={theme.colors.text.tertiary}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
                accessibilityLabel="Full name"
                accessibilityHint="Enter your full name"
              />
            </View>

            <View style={[styles.inputGroup, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <Text variant="caption" color="tertiary" style={styles.inputLabel}>Email</Text>
              <TextInput
                ref={emailRef}
                style={[styles.input, { color: theme.colors.text.primary }]}
                placeholder="michael@company.com"
                placeholderTextColor={theme.colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
                accessibilityLabel="Email address"
                accessibilityHint="Enter your email address"
              />
            </View>

            <View style={[styles.inputGroup, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <View style={styles.passwordLabel}>
                <Text variant="caption" color="tertiary" style={styles.inputLabel}>Password</Text>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic('light');
                    setShowPassword((p) => !p);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                >
                  <EyeIcon visible={showPassword} />
                </TouchableOpacity>
              </View>
              <TextInput
                ref={passwordRef}
                style={[styles.input, { color: theme.colors.text.primary }]}
                placeholder="Min. 8 characters"
                placeholderTextColor={theme.colors.text.tertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
                accessibilityLabel="Password"
                accessibilityHint="Create a password with at least 8 characters"
              />
            </View>

            <View style={[styles.inputGroup, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <Text variant="caption" color="tertiary" style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                ref={confirmRef}
                style={[styles.input, { color: theme.colors.text.primary }]}
                placeholder="Re-enter password"
                placeholderTextColor={theme.colors.text.tertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={handleRegister}
                accessibilityLabel="Confirm password"
                accessibilityHint="Re-enter your password to confirm"
              />
            </View>

            <PressScale scaleTo={0.97}>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.colors.primary, opacity: loading ? 0.6 : 1 }]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
                accessibilityLabel="Create Account"
                accessibilityRole="button"
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text weight="semibold" style={styles.submitText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </PressScale>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                router.back();
              }}
              style={styles.footerLink}
              disabled={loading}
              accessibilityLabel="Sign in instead"
              accessibilityRole="button"
            >
              <Text variant="bodyMedium" color="secondary" align="center">
                Already have an account?{' '}
                <Text variant="bodyMedium" weight="semibold" color="primary">Sign in</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1 },
  inner: { flex: 1, alignSelf: 'center', width: '100%', paddingHorizontal: 24, justifyContent: 'center' },
  topSection: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 64, height: 64, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', backgroundColor: '#4F46E5',
  },
  logoText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -2 },
  form: { gap: 14 },
  errorBanner: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 2 },
  inputGroup: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  inputLabel: { marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  passwordLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { fontSize: 16, height: 36, padding: 0 },
  googleButton: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  googleInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  googleButtonText: { fontSize: 15 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  dividerLine: { flex: 1, height: 1 },
  submitButton: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  submitText: { color: '#FFFFFF', fontSize: 16 },
  footerLink: { alignItems: 'center', paddingVertical: 16 },
  skeletonWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  skeletonCenter: { alignItems: 'center' },
});

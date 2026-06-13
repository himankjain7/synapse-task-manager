import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { registerFormSchema, RegisterFormData } from '../../validation';
import { ApiError } from '../../utils/error';

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    try {
      await register(data.email, data.password, data.name);
      router.replace('/(protected)');
    } catch (error) {
      if (error instanceof ApiError) {
        setApiError(error.message);
      } else {
        setApiError('Registration failed. Please try again.');
      }
    }
  };

  const inputStyle = (hasError: boolean) => ({
    backgroundColor: theme.colors.surface,
    borderColor: hasError ? theme.colors.danger : theme.colors.border,
    color: theme.colors.text.primary,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={[styles.logoContainer, { backgroundColor: theme.colors.primaryLight }]}>
              <Text style={[styles.logoText, { color: theme.colors.primary }]}>S</Text>
            </View>

            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              Create Account
            </Text>

            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Join a workspace to get started
            </Text>

            {apiError && (
              <View style={[styles.errorBanner, { backgroundColor: theme.colors.danger + '15' }]}>
                <Text style={[styles.errorText, { color: theme.colors.danger }]}>{apiError}</Text>
              </View>
            )}

            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Full Name</Text>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, inputStyle(!!errors.name)]}
                      placeholder="Jane Doe"
                      placeholderTextColor={theme.colors.text.tertiary}
                      autoCapitalize="words"
                      textContentType="name"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.name && (
                  <Text style={[styles.fieldError, { color: theme.colors.danger }]}>
                    {errors.name.message}
                  </Text>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Email</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, inputStyle(!!errors.email)]}
                      placeholder="you@example.com"
                      placeholderTextColor={theme.colors.text.tertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.email && (
                  <Text style={[styles.fieldError, { color: theme.colors.danger }]}>
                    {errors.email.message}
                  </Text>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Password</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, inputStyle(!!errors.password)]}
                      placeholder="Min. 6 characters"
                      placeholderTextColor={theme.colors.text.tertiary}
                      secureTextEntry
                      textContentType="newPassword"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.password && (
                  <Text style={[styles.fieldError, { color: theme.colors.danger }]}>
                    {errors.password.message}
                  </Text>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Confirm Password</Text>
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, inputStyle(!!errors.confirmPassword)]}
                      placeholder="Re-enter your password"
                      placeholderTextColor={theme.colors.text.tertiary}
                      secureTextEntry
                      textContentType="newPassword"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.confirmPassword && (
                  <Text style={[styles.fieldError, { color: theme.colors.danger }]}>
                    {errors.confirmPassword.message}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.primary, opacity: isSubmitting ? 0.7 : 1 }]}
                onPress={handleSubmit(onSubmit)}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={theme.colors.text.onPrimary} />
                ) : (
                  <Text style={[styles.buttonText, { color: theme.colors.text.onPrimary }]}>
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.colors.text.tertiary }]}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.footerLink, { color: theme.colors.primary }]}>
                {' '}Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  fieldError: {
    fontSize: 12,
    fontWeight: '500',
  },
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
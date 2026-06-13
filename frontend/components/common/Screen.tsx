import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

export interface ScreenProps extends ViewProps {
  scrollable?: boolean;
  withSafeArea?: boolean;
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
  keyboardAvoiding?: boolean;
}

export function Screen({
  children,
  scrollable = false,
  withSafeArea = true,
  safeAreaEdges = ['top', 'bottom'],
  keyboardAvoiding = Platform.OS === 'ios',
  style,
  ...props
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const baseStyle = [
    styles.container,
    { backgroundColor: theme.colors.background },
    withSafeArea && {
      paddingTop: safeAreaEdges.includes('top') ? insets.top : 0,
      paddingBottom: safeAreaEdges.includes('bottom') ? insets.bottom : 0,
      paddingLeft: safeAreaEdges.includes('left') ? insets.left : 0,
      paddingRight: safeAreaEdges.includes('right') ? insets.right : 0,
    },
    style,
  ];

  const content = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={baseStyle}
        {...props}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={baseStyle} {...props}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
});

export default Screen;

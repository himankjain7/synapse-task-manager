import React, { useMemo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from './typography/Text';
import { useTheme } from '../hooks/useTheme';

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

interface TextToken {
  type: 'text';
  text: string;
}

interface MentionToken {
  type: 'mention';
  displayName: string;
  userId: string;
}

type Token = TextToken | MentionToken;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const matchStart = match.index;

    if (matchStart > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, matchStart) });
    }

    tokens.push({ type: 'mention', displayName: match[1], userId: match[2] });

    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return tokens;
}

interface MentionTextProps {
  text: string;
  variant?: 'bodyLarge' | 'bodyMedium' | 'bodySmall' | 'caption' | 'tiny' | 'mono';
  color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'onPrimary';
  numberOfLines?: number;
  onPressMention?: (userId: string, displayName: string) => void;
  style?: any;
}

function MentionTextInner({
  text,
  variant = 'bodyMedium',
  color = 'primary',
  numberOfLines,
  onPressMention,
  style,
}: MentionTextProps) {
  const theme = useTheme();

  const tokens = useMemo(() => tokenize(text), [text]);

  const handlePress = useCallback(
    (userId: string, displayName: string) => {
      onPressMention?.(userId, displayName);
    },
    [onPressMention]
  );

  if (tokens.length === 1 && tokens[0].type === 'text') {
    return (
      <Text variant={variant} color={color} numberOfLines={numberOfLines} style={style}>
        {text}
      </Text>
    );
  }

  const children = tokens.map((token, i) => {
    if (token.type === 'text') {
      return <React.Fragment key={i}>{token.text}</React.Fragment>;
    }
    return (
      <Text
        key={i}
        style={{ backgroundColor: theme.colors.primaryLight, color: theme.colors.primary, fontWeight: '700', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1, overflow: 'hidden' }}
        onPress={() => handlePress(token.userId, token.displayName)}
        suppressHighlighting
      >
        @{token.displayName}
      </Text>
    );
  });

  return (
    <Text variant={variant} color={color} numberOfLines={numberOfLines} style={style}>
      {children}
    </Text>
  );
}

export const MentionText = React.memo(MentionTextInner);

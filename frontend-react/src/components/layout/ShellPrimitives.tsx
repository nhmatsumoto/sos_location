import {
  Badge,
  Box,
  HStack,
  Text,
  type BadgeProps,
  type BoxProps,
  type TextProps,
} from '@chakra-ui/react';
import { createElement } from 'react';

type ShellSurfaceVariant = 'panel' | 'toolbar' | 'subtle' | 'rail';
type ShellTone = 'default' | 'info' | 'success' | 'warning' | 'critical';

const surfaceStyles: Record<ShellSurfaceVariant, BoxProps> = {
  panel: {
    bg: 'surface.panel',
    border: '1px solid',
    borderColor: 'border.subtle',
    borderRadius: 'xl',
    boxShadow: 'panel',
  },
  toolbar: {
    bg: 'surface.panel',
    border: '1px solid',
    borderColor: 'border.subtle',
    borderRadius: 'lg',
  },
  subtle: {
    bg: 'rgba(255,255,255,0.03)',
    border: '1px solid',
    borderColor: 'border.subtle',
    borderRadius: 'lg',
  },
  rail: {
    bg: 'surface.base',
    borderRight: '1px solid',
    borderColor: 'border.subtle',
  },
};

const toneStyles: Record<ShellTone, BadgeProps> = {
  default: {
    bg: 'rgba(255,255,255,0.06)',
    color: 'text.secondary',
    borderColor: 'border.subtle',
  },
  info: {
    bg: 'rgba(0,122,255,0.12)',
    color: 'sos.blue.300',
    borderColor: 'rgba(0,122,255,0.22)',
  },
  success: {
    bg: 'rgba(52,199,89,0.14)',
    color: 'sos.green.300',
    borderColor: 'rgba(52,199,89,0.22)',
  },
  warning: {
    bg: 'rgba(255,149,0,0.14)',
    color: 'sos.amber.300',
    borderColor: 'rgba(255,149,0,0.22)',
  },
  critical: {
    bg: 'rgba(255,59,48,0.14)',
    color: 'sos.red.300',
    borderColor: 'rgba(255,59,48,0.22)',
  },
};

export interface ShellSurfaceProps extends BoxProps {
  variant?: ShellSurfaceVariant;
}

export function ShellSurface({
  variant = 'panel',
  ...props
}: ShellSurfaceProps) {
  return <Box {...surfaceStyles[variant]} {...props} />;
}

export function ShellSectionEyebrow(props: TextProps) {
  return createElement(Text, {
    fontSize: '10px',
    fontWeight: '700',
    color: 'text.tertiary',
    textTransform: 'uppercase',
    letterSpacing: 'widest',
    ...props,
  });
}

type ResponsiveStyleValue = string | number | Record<string, string | number>;

export interface ShellLiveIndicatorProps {
  label: string;
  px?: ResponsiveStyleValue;
  py?: ResponsiveStyleValue;
  className?: string;
}

export function ShellLiveIndicator({
  label,
  ...props
}: ShellLiveIndicatorProps) {
  return (
    <HStack spacing={2} {...props}>
      <Box
        w={2}
        h={2}
        borderRadius="full"
        bg="status.live"
        className="status-live"
        flexShrink={0}
      />
      <Text fontSize="11px" fontWeight="600" color="text.secondary">
        {label}
      </Text>
    </HStack>
  );
}

export interface ShellTelemetryBadgeProps extends BadgeProps {
  tone?: ShellTone;
}

export function ShellTelemetryBadge({
  tone = 'default',
  ...props
}: ShellTelemetryBadgeProps) {
  return createElement(Badge, {
    px: 2,
    py: 1,
    borderRadius: 'full',
    border: '1px solid',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: 'wider',
    textTransform: 'uppercase',
    ...toneStyles[tone],
    ...props,
  });
}

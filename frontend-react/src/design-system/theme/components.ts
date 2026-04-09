import type { ThemeComponents } from '@chakra-ui/react';

export const components: ThemeComponents = {
  Button: {
    baseStyle: {
      borderRadius: 'md',
      fontWeight: '600',
      fontFamily: 'body',
      letterSpacing: 'normal',
      _focus: { boxShadow: 'outline' },
      _focusVisible: { boxShadow: 'outline' },
    },
    sizes: {
      xs: { h: '28px', px: '10px', fontSize: '2xs' },
      sm: { h: '32px', px: '12px', fontSize: 'xs' },
      md: { h: '36px', px: '14px', fontSize: 'sm' },
      lg: { h: '44px', px: '18px', fontSize: 'md' },
    },
    variants: {
      tactical: {
        bg: 'mission.command',
        color: 'white',
        _hover: { bg: 'sos.blue.600' },
        _active: { bg: 'sos.blue.700' },
        _disabled: { bg: 'sos.blue.800', opacity: 0.5, cursor: 'not-allowed' },
      },
      tinted: {
        bg: 'rgba(0, 122, 255, 0.12)',
        color: 'sos.blue.300',
        border: '1px solid rgba(0, 122, 255, 0.20)',
        _hover: { bg: 'rgba(0, 122, 255, 0.20)' },
        _active: { bg: 'rgba(0, 122, 255, 0.28)' },
      },
      danger: {
        bg: 'status.critical',
        color: 'white',
        _hover: { bg: 'sos.red.600' },
        _active: { bg: 'sos.red.700' },
      },
      ghost: {
        bg: 'transparent',
        color: 'text.secondary',
        _hover: { bg: 'surface.interactiveHover', color: 'white' },
        _active: { bg: 'rgba(255,255,255,0.10)' },
      },
      outline: {
        bg: 'transparent',
        color: 'white',
        border: '1px solid',
        borderColor: 'border.strong',
        _hover: { bg: 'surface.interactiveHover' },
      },
    },
    defaultProps: { size: 'md', variant: 'ghost' },
  },
  IconButton: {
    baseStyle: {
      borderRadius: 'md',
      _focus: { boxShadow: 'outline' },
      _focusVisible: { boxShadow: 'outline' },
    },
  },
  Input: {
    variants: {
      tactical: {
        field: {
          bg: 'surface.interactive',
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 'md',
          color: 'white',
          _placeholder: { color: 'text.tertiary' },
          _hover: { borderColor: 'border.strong' },
          _focus: {
            borderColor: 'border.active',
            boxShadow: '0 0 0 1px rgba(0,122,255,0.40)',
            bg: 'rgba(0,122,255,0.04)',
          },
        },
      },
    },
    defaultProps: { variant: 'tactical' },
  },
  Textarea: {
    variants: {
      tactical: {
        bg: 'surface.interactive',
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 'md',
        color: 'white',
        _placeholder: { color: 'text.tertiary' },
        _hover: { borderColor: 'border.strong' },
        _focus: {
          borderColor: 'border.active',
          boxShadow: '0 0 0 1px rgba(0,122,255,0.40)',
          bg: 'rgba(0,122,255,0.04)',
        },
      },
    },
    defaultProps: { variant: 'tactical' },
  },
  Select: {
    variants: {
      tactical: {
        field: {
          bg: 'surface.interactive',
          border: '1px solid',
          borderColor: 'border.default',
          borderRadius: 'md',
          color: 'white',
          _hover: { borderColor: 'border.strong' },
          _focus: {
            borderColor: 'border.active',
            boxShadow: '0 0 0 1px rgba(0,122,255,0.40)',
          },
        },
        icon: { color: 'text.secondary' },
      },
    },
    defaultProps: { variant: 'tactical' },
  },
  Switch: {
    baseStyle: {
      track: {
        bg: 'rgba(255,255,255,0.14)',
        border: '1px solid',
        borderColor: 'border.default',
        _checked: {
          bg: 'mission.command',
          borderColor: 'rgba(0,122,255,0.34)',
        },
      },
      thumb: {
        bg: 'white',
      },
    },
    defaultProps: {
      colorScheme: 'blue',
    },
  },
  Badge: {
    baseStyle: {
      borderRadius: 'sm',
      fontWeight: '600',
      letterSpacing: 'normal',
      fontSize: '11px',
    },
  },
  Card: {
    baseStyle: {
      container: {
        bg: 'surface.elevated',
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 'xl',
        boxShadow: 'panel',
      },
    },
  },
  Stat: {
    baseStyle: {
      label: {
        color: 'text.secondary',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 'wider',
      },
      number: {
        fontFamily: 'mono',
        fontSize: '2xl',
        fontWeight: '700',
        color: 'white',
      },
      helpText: {
        fontSize: 'xs',
        color: 'text.tertiary',
      },
    },
  },
  Tooltip: {
    baseStyle: {
      bg: 'surface.overlay',
      color: 'text.primary',
      border: '1px solid',
      borderColor: 'border.default',
      borderRadius: 'md',
      fontSize: 'xs',
      fontWeight: '500',
      px: 3,
      py: 2,
    },
  },
  Table: {
    baseStyle: {
      table: {
        borderCollapse: 'separate',
        borderSpacing: 0,
      },
      thead: {
        bg: 'rgba(255,255,255,0.03)',
      },
      th: {
        borderColor: 'border.subtle',
        color: 'text.tertiary',
        fontSize: '10px',
        letterSpacing: 'widest',
        textTransform: 'uppercase',
        py: 4,
      },
      td: {
        borderColor: 'border.subtle',
        color: 'text.primary',
        fontSize: 'sm',
        py: 4,
      },
    },
  },
  Divider: {
    baseStyle: { borderColor: 'border.subtle' },
  },
  Modal: {
    baseStyle: {
      overlay: { bg: 'rgba(0,0,0,0.75)' },
      dialog: {
        bg: 'surface.base',
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 'xl',
      },
      header: { color: 'white', fontWeight: '600' },
      body: { color: 'text.primary' },
    },
  },
};

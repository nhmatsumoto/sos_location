import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors: {
    sos: {
      // iOS System Blue — precision & action
      blue: {
        50:  '#E3F2FD',
        100: '#BBDEFB',
        200: '#90CAF9',
        300: '#64B5F6',
        400: '#42A5F5',
        500: '#007AFF', // iOS System Blue — primary
        600: '#0066CC',
        700: '#004C99',
        800: '#003366',
        900: '#001933',
      },
      // iOS System Red — emergency
      red: {
        50:  '#FFF2F1',
        100: '#FFD5D3',
        200: '#FFB3AF',
        300: '#FF8882',
        400: '#FF5F59',
        500: '#FF3B30', // iOS System Red
        600: '#CC2F26',
        700: '#99231C',
        800: '#661813',
        900: '#330C09',
      },
      // iOS System Green — confirmed / safe
      green: {
        50:  '#F0FDF4',
        100: '#D1FAE5',
        200: '#A7F3D0',
        300: '#6EE7B7',
        400: '#34D399',
        500: '#34C759', // iOS System Green
        600: '#28A745',
        700: '#1E7D35',
        800: '#145425',
        900: '#0A2A12',
      },
      // iOS System Amber — warning
      amber: {
        50:  '#FFFBEB',
        100: '#FEF3C7',
        200: '#FDE68A',
        300: '#FCD34D',
        400: '#FBBF24',
        500: '#FF9500', // iOS System Orange
        600: '#D97706',
        700: '#B45309',
        800: '#92400E',
        900: '#78350F',
      },
      // Dark canvas — deepest background
      dark:   '#08080F',
      slate:  '#0F0F1A',
    }
  },
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif`,
    body:    `'Inter', -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Helvetica, Arial, sans-serif`,
    mono:    `'JetBrains Mono', 'SF Mono', 'Roboto Mono', 'Consolas', monospace`,
  },
  fontSizes: {
    '2xs': '0.625rem',
    xs:   '0.75rem',
    sm:   '0.875rem',
    md:   '1rem',
    lg:   '1.125rem',
    xl:   '1.25rem',
    '2xl':'1.5rem',
    '3xl':'1.875rem',
    '4xl':'2.25rem',
  },
  letterSpacings: {
    tighter: '-0.02em',
    tight:   '-0.01em',
    normal:  '0em',
    wide:    '0.025em',
    wider:   '0.05em',
    widest:  '0.1em',
    ultra:   '0.15em',
  },
  radii: {
    none: '0',
    sm:   '4px',
    md:   '8px',
    lg:   '12px',
    xl:   '16px',
    '2xl':'20px',
    '3xl':'24px',
    '4xl':'32px',
    full: '9999px',
  },
  semanticTokens: {
    colors: {
      'bg.canvas':      { default: 'sos.dark' },
      'bg.base':        { default: '#0E0E16' },
      'border.subtle':  { default: 'rgba(255,255,255,0.07)' },
      'border.default': { default: 'rgba(255,255,255,0.12)' },
      'border.strong':  { default: 'rgba(255,255,255,0.20)' },
      'border.active':  { default: 'sos.blue.500' },
      'brand.primary':  { default: 'sos.blue.500' },
      'accent.emergency': { default: 'sos.red.500' },
      'accent.warning':   { default: 'sos.amber.500' },
      'accent.success':   { default: 'sos.green.500' },
      'text.primary':   { default: 'rgba(255,255,255,0.95)' },
      'text.secondary': { default: 'rgba(255,255,255,0.60)' },
      'text.tertiary':  { default: 'rgba(255,255,255,0.35)' },
    }
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'lg',
        fontWeight: '600',
        fontFamily: 'body',
        letterSpacing: 'wide',
        _focus: { boxShadow: '0 0 0 3px rgba(0, 122, 255, 0.35)' },
        _focusVisible: { boxShadow: '0 0 0 3px rgba(0, 122, 255, 0.35)' },
      },
      sizes: {
        xs: { h: '28px', px: '10px', fontSize: '2xs' },
        sm: { h: '32px', px: '12px', fontSize: 'xs' },
        md: { h: '40px', px: '16px', fontSize: 'sm' },
        lg: { h: '48px', px: '20px', fontSize: 'md' },
      },
      variants: {
        tactical: {
          bg: 'sos.blue.500',
          color: 'white',
          _hover: { bg: 'sos.blue.600', transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,122,255,0.35)' },
          _active: { bg: 'sos.blue.700', transform: 'translateY(0)' },
          _disabled: { bg: 'sos.blue.800', opacity: 0.5, cursor: 'not-allowed' },
        },
        tinted: {
          bg: 'rgba(0, 122, 255, 0.12)',
          color: '#42A5F5',
          border: '1px solid rgba(0, 122, 255, 0.22)',
          _hover: { bg: 'rgba(0, 122, 255, 0.22)', borderColor: 'rgba(0,122,255,0.4)' },
          _active: { bg: 'rgba(0, 122, 255, 0.30)' },
        },
        danger: {
          bg: 'sos.red.500',
          color: 'white',
          _hover: { bg: 'sos.red.600' },
          _active: { bg: 'sos.red.700' },
        },
        ghost: {
          bg: 'transparent',
          color: 'rgba(255,255,255,0.70)',
          _hover: { bg: 'rgba(255,255,255,0.08)', color: 'white' },
          _active: { bg: 'rgba(255,255,255,0.12)' },
        },
        outline: {
          bg: 'transparent',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.20)',
          _hover: { bg: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.35)' },
        },
      },
      defaultProps: { size: 'md', variant: 'ghost' },
    },
    IconButton: {
      baseStyle: {
        borderRadius: 'lg',
        _focus: { boxShadow: '0 0 0 3px rgba(0, 122, 255, 0.35)' },
      },
    },
    Input: {
      variants: {
        tactical: {
          field: {
            bg: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'lg',
            color: 'white',
            _placeholder: { color: 'rgba(255,255,255,0.30)' },
            _hover: { borderColor: 'rgba(255,255,255,0.22)' },
            _focus: { borderColor: 'sos.blue.500', boxShadow: '0 0 0 3px rgba(0,122,255,0.18)', bg: 'rgba(0,122,255,0.04)' },
          }
        }
      },
      defaultProps: { variant: 'tactical' }
    },
    Select: {
      variants: {
        tactical: {
          field: {
            bg: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 'lg',
            color: 'white',
            _hover: { borderColor: 'rgba(255,255,255,0.22)' },
            _focus: { borderColor: 'sos.blue.500', boxShadow: '0 0 0 3px rgba(0,122,255,0.18)' },
          },
          icon: { color: 'rgba(255,255,255,0.40)' }
        }
      },
      defaultProps: { variant: 'tactical' }
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        fontWeight: '700',
        letterSpacing: 'wide',
        fontSize: '10px',
      }
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'rgba(22, 22, 34, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '2xl',
          boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
        }
      }
    },
    Stat: {
      baseStyle: {
        label: {
          color: 'rgba(255,255,255,0.50)',
          fontSize: '11px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 'ultra',
        },
        number: {
          fontFamily: 'mono',
          fontSize: '2xl',
          fontWeight: '700',
          color: 'white',
        },
        helpText: {
          fontSize: 'xs',
          color: 'rgba(255,255,255,0.40)',
        }
      }
    },
    Tooltip: {
      baseStyle: {
        bg: 'rgba(14,14,22,0.96)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 'lg',
        backdropFilter: 'blur(20px)',
        fontSize: 'xs',
        fontWeight: '600',
        px: 3,
        py: 2,
        boxShadow: '0 8px 24px rgba(0,0,0,0.40)',
      }
    },
    Divider: {
      baseStyle: { borderColor: 'rgba(255,255,255,0.08)' }
    },
    Modal: {
      baseStyle: {
        overlay: { bg: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' },
        dialog: {
          bg: 'rgba(14,14,22,0.97)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '2xl',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        },
        header: { color: 'white', fontWeight: '700' },
        body: { color: 'rgba(255,255,255,0.80)' },
      }
    },
  },
  styles: {
    global: {
      body: {
        bg: 'sos.dark',
        color: 'rgba(255,255,255,0.92)',
        lineHeight: '1.6',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      '*::selection': { bg: 'rgba(0, 122, 255, 0.28)' },
      '::-webkit-scrollbar': { w: '4px', h: '4px' },
      '::-webkit-scrollbar-track': { bg: 'transparent' },
      '::-webkit-scrollbar-thumb': { bg: 'rgba(255,255,255,0.12)', borderRadius: 'full' },
      '::-webkit-scrollbar-thumb:hover': { bg: 'rgba(0,122,255,0.40)' },
    }
  }
});

export default theme;

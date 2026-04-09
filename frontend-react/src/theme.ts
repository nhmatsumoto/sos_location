import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors: {
    sos: {
      blue: {
        50:  '#E3F2FD',
        100: '#BBDEFB',
        200: '#90CAF9',
        300: '#64B5F6',
        400: '#42A5F5',
        500: '#007AFF',
        600: '#0066CC',
        700: '#004C99',
        800: '#003366',
        900: '#001933',
      },
      red: {
        50:  '#FFF2F1',
        100: '#FFD5D3',
        200: '#FFB3AF',
        300: '#FF8882',
        400: '#FF5F59',
        500: '#FF3B30',
        600: '#CC2F26',
        700: '#99231C',
        800: '#661813',
        900: '#330C09',
      },
      green: {
        50:  '#F0FDF4',
        100: '#D1FAE5',
        200: '#A7F3D0',
        300: '#6EE7B7',
        400: '#34D399',
        500: '#34C759',
        600: '#28A745',
        700: '#1E7D35',
        800: '#145425',
        900: '#0A2A12',
      },
      amber: {
        50:  '#FFFBEB',
        100: '#FEF3C7',
        200: '#FDE68A',
        300: '#FCD34D',
        400: '#FBBF24',
        500: '#FF9500',
        600: '#D97706',
        700: '#B45309',
        800: '#92400E',
        900: '#78350F',
      },
      dark:  '#09090F',
      slate: '#111119',
    }
  },
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
    body:    `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
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
    widest:  '0.08em',
    ultra:   '0.10em',
  },
  radii: {
    none: '0',
    sm:   '3px',
    md:   '6px',
    lg:   '8px',
    xl:   '10px',
    '2xl':'12px',
    '3xl':'14px',
    '4xl':'16px',
    full: '9999px',
  },
  semanticTokens: {
    colors: {
      'bg.canvas':      { default: 'sos.dark' },
      'bg.base':        { default: '#111119' },
      'border.subtle':  { default: 'rgba(255,255,255,0.06)' },
      'border.default': { default: 'rgba(255,255,255,0.10)' },
      'border.strong':  { default: 'rgba(255,255,255,0.18)' },
      'border.active':  { default: 'sos.blue.500' },
      'brand.primary':  { default: 'sos.blue.500' },
      'accent.emergency': { default: 'sos.red.500' },
      'accent.warning':   { default: 'sos.amber.500' },
      'accent.success':   { default: 'sos.green.500' },
      'text.primary':   { default: 'rgba(255,255,255,0.92)' },
      'text.secondary': { default: 'rgba(255,255,255,0.55)' },
      'text.tertiary':  { default: 'rgba(255,255,255,0.32)' },
    }
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'md',
        fontWeight: '600',
        fontFamily: 'body',
        letterSpacing: 'normal',
        _focus: { boxShadow: '0 0 0 2px rgba(0, 122, 255, 0.50)' },
        _focusVisible: { boxShadow: '0 0 0 2px rgba(0, 122, 255, 0.50)' },
      },
      sizes: {
        xs: { h: '28px', px: '10px', fontSize: '2xs' },
        sm: { h: '32px', px: '12px', fontSize: 'xs' },
        md: { h: '36px', px: '14px', fontSize: 'sm' },
        lg: { h: '44px', px: '18px', fontSize: 'md' },
      },
      variants: {
        tactical: {
          bg: 'sos.blue.500',
          color: 'white',
          _hover: { bg: 'sos.blue.600' },
          _active: { bg: 'sos.blue.700' },
          _disabled: { bg: 'sos.blue.800', opacity: 0.5, cursor: 'not-allowed' },
        },
        tinted: {
          bg: 'rgba(0, 122, 255, 0.12)',
          color: '#42A5F5',
          border: '1px solid rgba(0, 122, 255, 0.20)',
          _hover: { bg: 'rgba(0, 122, 255, 0.20)' },
          _active: { bg: 'rgba(0, 122, 255, 0.28)' },
        },
        danger: {
          bg: 'sos.red.500',
          color: 'white',
          _hover: { bg: 'sos.red.600' },
          _active: { bg: 'sos.red.700' },
        },
        ghost: {
          bg: 'transparent',
          color: 'rgba(255,255,255,0.65)',
          _hover: { bg: 'rgba(255,255,255,0.07)', color: 'white' },
          _active: { bg: 'rgba(255,255,255,0.10)' },
        },
        outline: {
          bg: 'transparent',
          color: 'white',
          border: '1px solid rgba(255,255,255,0.18)',
          _hover: { bg: 'rgba(255,255,255,0.05)' },
        },
      },
      defaultProps: { size: 'md', variant: 'ghost' },
    },
    IconButton: {
      baseStyle: {
        borderRadius: 'md',
        _focus: { boxShadow: '0 0 0 2px rgba(0, 122, 255, 0.50)' },
      },
    },
    Input: {
      variants: {
        tactical: {
          field: {
            bg: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 'md',
            color: 'white',
            _placeholder: { color: 'rgba(255,255,255,0.28)' },
            _hover: { borderColor: 'rgba(255,255,255,0.18)' },
            _focus: { borderColor: 'sos.blue.500', boxShadow: '0 0 0 1px rgba(0,122,255,0.40)', bg: 'rgba(0,122,255,0.04)' },
          }
        }
      },
      defaultProps: { variant: 'tactical' }
    },
    Select: {
      variants: {
        tactical: {
          field: {
            bg: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 'md',
            color: 'white',
            _hover: { borderColor: 'rgba(255,255,255,0.18)' },
            _focus: { borderColor: 'sos.blue.500', boxShadow: '0 0 0 1px rgba(0,122,255,0.40)' },
          },
          icon: { color: 'rgba(255,255,255,0.40)' }
        }
      },
      defaultProps: { variant: 'tactical' }
    },
    Badge: {
      baseStyle: {
        borderRadius: 'sm',
        fontWeight: '600',
        letterSpacing: 'normal',
        fontSize: '11px',
      }
    },
    Card: {
      baseStyle: {
        container: {
          bg: '#16161F',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'xl',
        }
      }
    },
    Stat: {
      baseStyle: {
        label: {
          color: 'rgba(255,255,255,0.45)',
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
          color: 'rgba(255,255,255,0.38)',
        }
      }
    },
    Tooltip: {
      baseStyle: {
        bg: '#1C1C28',
        color: 'rgba(255,255,255,0.90)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 'md',
        fontSize: 'xs',
        fontWeight: '500',
        px: 3,
        py: 2,
      }
    },
    Divider: {
      baseStyle: { borderColor: 'rgba(255,255,255,0.07)' }
    },
    Modal: {
      baseStyle: {
        overlay: { bg: 'rgba(0,0,0,0.75)' },
        dialog: {
          bg: '#111119',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 'xl',
        },
        header: { color: 'white', fontWeight: '600' },
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
      '*::selection': { bg: 'rgba(0, 122, 255, 0.30)' },
      '::-webkit-scrollbar': { w: '4px', h: '4px' },
      '::-webkit-scrollbar-track': { bg: 'transparent' },
      '::-webkit-scrollbar-thumb': { bg: 'rgba(255,255,255,0.10)', borderRadius: 'full' },
      '::-webkit-scrollbar-thumb:hover': { bg: 'rgba(255,255,255,0.22)' },
    }
  }
});

export default theme;

import { Button, forwardRef, type ButtonProps } from '@chakra-ui/react';
import { createElement } from 'react';

/**
 * TacticalButton — flat action button for operational interfaces.
 */
interface TacticalButtonProps extends ButtonProps {
  glow?: boolean;
  loading?: boolean;
}

export const TacticalButton = forwardRef<TacticalButtonProps, 'button'>(
  ({ children, glow, loading, isLoading, ...props }, ref) => {
    void glow;

    return createElement(Button, {
      ref,
      isLoading: isLoading ?? loading,
      variant: 'unstyled',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '40px',
      px: 5,
      bg: '#16161F',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 'md',
      color: 'rgba(255,255,255,0.90)',
      fontSize: 'sm',
      fontWeight: '600',
      letterSpacing: 'normal',
      transition: 'background 0.15s, border-color 0.15s',
      _hover: {
        bg: '#1C1C28',
        borderColor: 'rgba(255,255,255,0.20)',
      },
      _active: {
        bg: '#111119',
      },
      ...props,
      children,
    });
  }
);

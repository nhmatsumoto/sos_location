import { Text, forwardRef } from '@chakra-ui/react';

/**
 * Tactical Typography System
 * Ensures all text follows the mission-critical design language.
 */
export const TacticalText = forwardRef<any, 'p'>(
  ({ children, variant = 'caption', ...props }: any, ref: any) => {
    const variants = {
      heading: {
        fontSize: 'sm',
        fontWeight: 'black',
        letterSpacing: '0.2em',
        textTransform: 'uppercase' as const,
        color: 'white',
      },
      subheading: {
        fontSize: 'xs',
        fontWeight: 'bold',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: 'whiteAlpha.600',
      },
      mono: {
        fontSize: 'xs',
        fontFamily: 'mono',
        color: 'sos.blue.400',
      },
      caption: {
        fontSize: '10px',
        fontWeight: 'medium',
        color: 'whiteAlpha.500',
      }
    };

    const style = (variants as any)[variant];

    return (
      <Text ref={ref} {...style} {...props}>
        {children}
      </Text>
    );
  }
);

import { Text, forwardRef } from '@chakra-ui/react';

export const TacticalText = forwardRef<any, 'p'>(
  ({ children, variant = 'caption', ...props }: any, ref: any) => {
    const variants = {
      heading: {
        fontSize: 'sm',
        fontWeight: '600',
        letterSpacing: '0.03em',
        color: 'white',
      },
      subheading: {
        fontSize: 'xs',
        fontWeight: '500',
        letterSpacing: '0.02em',
        color: 'rgba(255,255,255,0.55)',
      },
      mono: {
        fontSize: 'xs',
        fontFamily: 'mono',
        color: 'sos.blue.300',
      },
      caption: {
        fontSize: '11px',
        fontWeight: '400',
        color: 'rgba(255,255,255,0.45)',
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

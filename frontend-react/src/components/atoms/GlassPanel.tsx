import { Flex, forwardRef } from '@chakra-ui/react';

/**
 * Tactical Glass Panel
 * Core container for all mission-critical UI modules.
 * Flexible container that supports both box and flex layouts.
 */
export const GlassPanel = forwardRef<any, 'div'>(
  ({ children, intensity = 'medium', ...props }: any, ref: any) => {
    const intensities = {
      low: {
        bg: 'rgba(2, 6, 23, 0.4)',
        blur: '8px',
      },
      medium: {
        bg: 'rgba(2, 6, 23, 0.7)',
        blur: '20px',
      },
      high: {
        bg: 'rgba(2, 6, 23, 0.9)',
        blur: '40px',
      }
    };

    const config = intensities[intensity as keyof typeof intensities] || intensities.medium;

    return (
      <Flex
        ref={ref}
        bg={config.bg}
        backdropFilter={`blur(${config.blur}) saturate(160%)`}
        border="1px solid"
        borderColor="whiteAlpha.100"
        borderRadius="2xl"
        boxShadow="0 8px 32px 0 rgba(0, 0, 0, 0.15)"
        {...props}
      >
        {children}
      </Flex>
    );
  }
);

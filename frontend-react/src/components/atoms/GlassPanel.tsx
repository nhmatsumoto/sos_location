import { Box, Flex, forwardRef } from '@chakra-ui/react';

/**
 * Tactical Glass Panel
 * Core container for all mission-critical UI modules.
 * Flexible container that supports both box and flex layouts.
 */
export const GlassPanel = forwardRef<any, 'div'>(
  ({ children, intensity = 'medium', variant = 'default', ...props }: any, ref: any) => {
    const intensities = {
      low: {
        bg: 'rgba(15, 23, 42, 0.4)',
        blur: '12px',
      },
      medium: {
        bg: 'rgba(15, 23, 42, 0.75)',
        blur: '24px',
      },
      high: {
        bg: 'rgba(15, 23, 42, 0.92)',
        blur: '40px',
      },
      ultra: {
        bg: 'rgba(2, 6, 23, 0.98)',
        blur: '64px',
      }
    };

    const config = intensities[intensity as keyof typeof intensities] || intensities.medium;

    return (
      <Flex
        ref={ref}
        bg={config.bg}
        backdropFilter={`blur(${config.blur}) saturate(180%) brightness(1.1)`}
        border="1px solid"
        borderColor="whiteAlpha.100"
        borderRadius="3xl"
        boxShadow={intensity === 'ultra' ? '0 20px 50px rgba(0,0,0,0.6)' : '0 12px 40px rgba(0, 0, 0, 0.25)'}
        position="relative"
        _before={variant === 'tactical' ? {
          content: '""',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          background: 'linear-gradient(135deg, rgba(33, 126, 255, 0.05) 0%, transparent 100%)',
          pointerEvents: 'none'
        } : undefined}
        {...props}
      >
        <Box 
          position="absolute" 
          top={0} 
          left="10%" 
          right="10%" 
          h="1px" 
          bgGradient="linear(to-r, transparent, whiteAlpha.300, transparent)" 
          opacity={0.5}
        />
        {children}
      </Flex>
    );
  }
);

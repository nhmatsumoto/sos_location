import { Button, forwardRef } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const glowPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(6, 182, 212, 0); }
  100% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0); }
`;

/**
 * Premium Tactical Button
 * Features glassmorphism, precise borders, and optional glow pulse.
 */
export const TacticalButton = forwardRef<any, 'button'>(
  ({ children, glow, ...props }: any, ref: any) => {
    return (
      <Button
        ref={ref}
        variant="unstyled"
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="48px"
        px={6}
        bg="rgba(15, 23, 42, 0.7)"
        backdropFilter="blur(16px)"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="xl"
        color="white"
        fontSize="xs"
        fontWeight="black"
        textTransform="uppercase"
        letterSpacing="widest"
        transition="all 0.3s cubic-bezier(0.23, 1, 0.32, 1)"
        animation={glow ? `${glowPulse} 2s infinite` : undefined}
        _hover={{
          bg: 'whiteAlpha.200',
          borderColor: 'sos.blue.400',
          transform: 'translateY(-2px)',
          boxShadow: '0 10px 20px -10px rgba(6, 182, 212, 0.5)',
        }}
        _active={{
          transform: 'translateY(0)',
          bg: 'whiteAlpha.100',
        }}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

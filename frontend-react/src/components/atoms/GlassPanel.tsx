import { Box, Flex, forwardRef } from '@chakra-ui/react';

type Depth = 'base' | 'raised' | 'float' | 'modal';
type Tint  = 'none' | 'blue' | 'red' | 'green' | 'amber';

const depthStyles: Record<Depth, { bg: string; shadow: string; border: string }> = {
  base:  {
    bg: 'rgba(14, 14, 22, 0.92)',
    shadow: '0 2px 12px rgba(0,0,0,0.3)',
    border: 'rgba(255,255,255,0.07)',
  },
  raised: {
    bg: 'rgba(22, 22, 34, 0.88)',
    shadow: '0 8px 32px rgba(0,0,0,0.35)',
    border: 'rgba(255,255,255,0.09)',
  },
  float: {
    bg: 'rgba(30, 30, 46, 0.82)',
    shadow: '0 16px 48px rgba(0,0,0,0.45)',
    border: 'rgba(255,255,255,0.12)',
  },
  modal: {
    bg: 'rgba(8, 8, 15, 0.96)',
    shadow: '0 24px 64px rgba(0,0,0,0.6)',
    border: 'rgba(255,255,255,0.14)',
  },
};

const tintStyles: Record<Tint, string> = {
  none:  'none',
  blue:  'linear-gradient(135deg, rgba(0,122,255,0.06) 0%, transparent 60%)',
  red:   'linear-gradient(135deg, rgba(255,59,48,0.06) 0%, transparent 60%)',
  green: 'linear-gradient(135deg, rgba(52,199,89,0.06) 0%, transparent 60%)',
  amber: 'linear-gradient(135deg, rgba(255,149,0,0.06) 0%, transparent 60%)',
};

interface GlassPanelProps {
  depth?: Depth;
  tint?: Tint;
  /** @deprecated use depth='base' | 'raised' | 'float'. Kept for back-compat */
  intensity?: 'low' | 'medium' | 'high' | 'ultra';
  [key: string]: any;
}

// Map legacy intensity prop to new depth system
const legacyDepthMap: Record<string, Depth> = {
  low: 'base', medium: 'raised', high: 'float', ultra: 'modal',
};

/**
 * Glass Panel — Guardian Clarity v3
 * Core transparent container with Apple-inspired depth layering.
 * Subtle top highlight simulates physical glass surface.
 */
export const GlassPanel = forwardRef<GlassPanelProps, 'div'>(
  ({ children, depth, tint = 'none', intensity, ...props }, ref) => {
    // Resolve depth — support legacy intensity prop
    const resolvedDepth: Depth = depth || (intensity ? legacyDepthMap[intensity] : 'raised');
    const style = depthStyles[resolvedDepth];
    const tintGrad = tintStyles[tint];

    return (
      <Flex
        ref={ref}
        bg={style.bg}
        backdropFilter="blur(20px) saturate(180%)"
        border="1px solid"
        borderColor={style.border}
        borderRadius="2xl"
        boxShadow={style.shadow}
        position="relative"
        overflow="hidden"
        {...props}
      >
        {/* Glass surface highlight — top edge */}
        <Box
          position="absolute"
          top={0}
          left="8%"
          right="8%"
          h="1px"
          bgGradient="linear(to-r, transparent, rgba(255,255,255,0.20), transparent)"
          pointerEvents="none"
          zIndex={1}
        />
        {/* Tint overlay */}
        {tint !== 'none' && (
          <Box
            position="absolute"
            inset={0}
            background={tintGrad}
            pointerEvents="none"
            zIndex={1}
          />
        )}
        {children}
      </Flex>
    );
  }
);

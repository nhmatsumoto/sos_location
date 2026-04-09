import React from 'react';
import { Box } from '@chakra-ui/react';
import type { BoxProps } from '@chakra-ui/react';

type Depth = 'base' | 'raised' | 'float' | 'modal';
type Tint  = 'none' | 'blue' | 'red' | 'green' | 'amber';

const depthStyles: Record<Depth, { bg: string; border: string }> = {
  base:  { bg: '#111119', border: 'rgba(255,255,255,0.07)' },
  raised: { bg: '#16161F', border: 'rgba(255,255,255,0.09)' },
  float:  { bg: '#1C1C28', border: 'rgba(255,255,255,0.12)' },
  modal:  { bg: '#0D0D14', border: 'rgba(255,255,255,0.13)' },
};

const tintBg: Record<Tint, string> = {
  none:  '',
  blue:  '#0C1220',
  red:   '#190D0F',
  green: '#0C1810',
  amber: '#19140A',
};

interface GlassPanelProps extends BoxProps {
  depth?: Depth;
  tint?: Tint;
  /** @deprecated use depth='base' | 'raised' | 'float'. Kept for back-compat */
  intensity?: 'low' | 'medium' | 'high' | 'ultra';
  variant?: string;
  align?: BoxProps['alignItems'];
  justify?: BoxProps['justifyContent'];
  direction?: BoxProps['flexDirection'];
  wrap?: BoxProps['flexWrap'];
}

const legacyDepthMap: Record<string, Depth> = {
  low: 'base', medium: 'raised', high: 'float', ultra: 'modal',
};

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({
    children,
    depth,
    tint = 'none',
    intensity,
    variant,
    align,
    justify,
    direction,
    wrap,
    alignItems,
    justifyContent,
    flexDirection,
    flexWrap,
    ...props
  }, ref) => {
    void variant;

    const resolvedDepth: Depth = depth || (intensity ? legacyDepthMap[intensity] : 'raised');
    const style = depthStyles[resolvedDepth];
    const bg = tint !== 'none' ? tintBg[tint] : style.bg;

    return (
      <Box
        ref={ref}
        display="flex"
        alignItems={alignItems ?? align}
        justifyContent={justifyContent ?? justify}
        flexDirection={flexDirection ?? direction}
        flexWrap={flexWrap ?? wrap}
        bg={bg}
        border="1px solid"
        borderColor={style.border}
        borderRadius="xl"
        position="relative"
        overflow="hidden"
        {...props}
      >
        {children}
      </Box>
    );
  }
);

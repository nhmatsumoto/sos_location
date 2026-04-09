import type { BoxProps } from '@chakra-ui/react';
import { ShellSurface } from '../layout/ShellPrimitives';

export function Card({ children, ...props }: BoxProps) {
  return (
    <ShellSurface variant="panel" p={4} {...props}>
      {children}
    </ShellSurface>
  );
}

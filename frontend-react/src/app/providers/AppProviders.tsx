import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { NotificationsProvider } from '../../context/NotificationsContext';
import theme from '../../theme';

interface AppProvidersProps {
  children: ReactNode;
  includeColorModeScript?: boolean;
}

export function AppProviders({
  children,
  includeColorModeScript = true,
}: AppProvidersProps) {
  return (
    <ChakraProvider theme={theme}>
      {includeColorModeScript ? (
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      ) : null}
      <NotificationsProvider>{children}</NotificationsProvider>
    </ChakraProvider>
  );
}

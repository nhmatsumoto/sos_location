import { memo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Globe, Languages, LayoutGrid, LogOut, Moon, Search, Sun } from 'lucide-react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { doLogout } from '../../lib/keycloak';
import { useAuthStore } from '../../store/authStore';
import {
  APP_ROUTE_GROUP_LABELS,
  findAppRouteByPath,
  PUBLIC_TRANSPARENCY_ROUTE,
  SHARED_SETTINGS_ROUTE,
} from '../../lib/appRouteManifest';
import {
  ShellLiveIndicator,
  ShellSectionEyebrow,
  ShellSurface,
  ShellTelemetryBadge,
} from './ShellPrimitives';

interface TopbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  notificationCount: number;
  onOpenNotifications: () => void;
  minimal?: boolean;
}

interface UserMenuProps {
  displayName: string;
  secondaryLabel?: string;
  settingsLabel: string;
  settingsHref: string;
}

const UserMenu = memo(function UserMenu({ displayName, secondaryLabel, settingsLabel, settingsHref }: UserMenuProps) {
  return (
    <Menu>
      <MenuButton
        as={IconButton}
        size="md"
        icon={<Avatar size="xs" name={displayName} bg="sos.blue.500" />}
        variant="ghost"
        borderRadius="full"
        _hover={{ bg: 'surface.interactiveHover' }}
      />
      <MenuList
        bg="surface.overlay"
        border="1px solid"
        borderColor="border.default"
        borderRadius="md"
        py={2}
        zIndex={2000}
      >
        <Box px={4} py={3}>
          <Text fontSize="sm" fontWeight="600" color="white">{displayName}</Text>
          <Text fontSize="xs" color="text.secondary">{secondaryLabel ?? ''}</Text>
        </Box>
        <MenuDivider borderColor="border.subtle" />
        <MenuItem
          as={RouterLink}
          to={settingsHref}
          icon={<LayoutGrid size={14} />}
          bg="transparent"
          _hover={{ bg: 'surface.interactiveHover' }}
          fontSize="sm"
          color="white"
        >
          {settingsLabel}
        </MenuItem>
        <MenuItem
          icon={<LogOut size={14} />}
          onClick={doLogout}
          bg="transparent"
          color="sos.red.400"
          _hover={{ bg: 'rgba(255,59,48,0.08)' }}
          fontSize="sm"
        >
          Sair do Sistema
        </MenuItem>
      </MenuList>
    </Menu>
  );
});

export const Topbar = memo(function Topbar({ theme, onToggleTheme, notificationCount, onOpenNotifications, minimal }: TopbarProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const displayName = user?.name || user?.preferredUsername || 'Operador';
  const secondaryLabel = user?.email || user?.preferredUsername;
  const settingsLabel = t('nav.settings');
  const settingsHref = SHARED_SETTINGS_ROUTE;
  const currentRoute = findAppRouteByPath(location.pathname);
  const currentGroupLabel = currentRoute
    ? APP_ROUTE_GROUP_LABELS[currentRoute.group]
    : 'Operações';
  const currentRouteLabel = currentRoute
    ? t(currentRoute.labelKey)
    : 'Centro Operacional';

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  if (minimal) {
    return (
      <ShellSurface as="header" variant="toolbar" p={2.5}>
        <HStack spacing={2} justify="space-between">
          <Box>
            <ShellSectionEyebrow>{currentGroupLabel}</ShellSectionEyebrow>
            <Text fontSize="sm" fontWeight="700" color="text.primary">
              {currentRouteLabel}
            </Text>
          </Box>
          <Box position="relative">
            <IconButton
              size="sm"
              icon={<Bell size={14} />}
              aria-label="Notificações"
              onClick={onOpenNotifications}
              variant="tactical"
              bg="sos.blue.500"
              _hover={{ bg: 'sos.blue.600' }}
            />
            {notificationCount > 0 && (
              <Badge
                position="absolute"
                top="-1"
                right="-1"
                bg="sos.red.500"
                color="white"
                borderRadius="full"
                fontSize="2xs"
                px={1}
              >
                {notificationCount}
              </Badge>
            )}
          </Box>
          <Tooltip label="Portal de Transparência" placement="bottom">
            <IconButton
              as={RouterLink}
              to={PUBLIC_TRANSPARENCY_ROUTE}
              size="sm"
              icon={<Globe size={14} />}
              aria-label="Portal de Transparência"
              variant="ghost"
            />
          </Tooltip>
          <UserMenu displayName={displayName} secondaryLabel={secondaryLabel} settingsLabel={settingsLabel} settingsHref={settingsHref} />
        </HStack>
      </ShellSurface>
    );
  }

  return (
    <ShellSurface
      as="header"
      px={4}
      py={3}
      variant="toolbar"
      m={3}
      mb={0}
      position="relative"
      zIndex={100}
    >
      <Flex justify="space-between" align="center" gap={4}>
        <HStack spacing={5}>
          <HStack spacing={3} borderRight="1px solid" borderColor="border.subtle" pr={5}>
            <Box p={2} bg="sos.blue.500" borderRadius="md">
              <Text fontSize="13px" fontWeight="700" color="white">SOS</Text>
            </Box>
            <Box display={{ base: 'none', md: 'block' }}>
              <ShellSectionEyebrow>{currentGroupLabel}</ShellSectionEyebrow>
              <Text fontSize="14px" fontWeight="700" color="white">
                {currentRouteLabel}
              </Text>
              <Text fontSize="10px" fontWeight="400" color="text.secondary" mt="-1px">
                Centro operacional orientado por missão
              </Text>
            </Box>
          </HStack>

          <HStack spacing={2} display={{ base: 'none', xl: 'flex' }}>
            <ShellTelemetryBadge tone="success">feed ativo</ShellTelemetryBadge>
            <ShellTelemetryBadge tone="info">dados territoriais</ShellTelemetryBadge>
          </HStack>

          <InputGroup size="sm" maxW="220px" display={{ base: 'none', lg: 'flex' }}>
            <InputLeftElement pointerEvents="none">
              <Search size={13} color="rgba(255,255,255,0.30)" />
            </InputLeftElement>
            <Input
              placeholder="Buscar..."
              fontSize="xs"
            />
          </InputGroup>
        </HStack>

        <HStack spacing={3}>
          <Box display={{ base: 'none', md: 'block' }}>
            <ShellLiveIndicator label="Centro sincronizado" />
          </Box>

          {/* Language selector */}
          <HStack spacing={1} bg="surface.interactive" p={1} borderRadius="md" border="1px solid" borderColor="border.subtle">
            <IconButton
              size="sm"
              icon={<Languages size={13} />}
              aria-label="Inglês"
              variant="ghost"
              color={i18n.language === 'en' ? 'sos.blue.400' : 'text.secondary'}
              onClick={() => changeLanguage('en')}
            />
            <IconButton
              size="sm"
              icon={<Text fontSize="9px" fontWeight="600">PT</Text>}
              aria-label="Português"
              variant="ghost"
              color={i18n.language === 'pt' ? 'sos.blue.400' : 'text.secondary'}
              onClick={() => changeLanguage('pt')}
            />
          </HStack>

          {/* Notifications */}
          <Box position="relative">
            <IconButton
              size="md"
              icon={<Bell size={16} />}
              aria-label="Notificações"
              onClick={onOpenNotifications}
              variant="ghost"
              color="text.secondary"
            />
            {notificationCount > 0 && (
              <Box
                position="absolute"
                top="2"
                right="2"
                bg="sos.red.500"
                w="7px"
                h="7px"
                borderRadius="full"
              />
            )}
          </Box>

          <HStack spacing={1} pl={3} borderLeft="1px solid" borderColor="border.subtle">
            <IconButton
              icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              size="md"
              aria-label="Alternar tema"
              onClick={onToggleTheme}
              variant="ghost"
              color="text.secondary"
            />
            <Tooltip label={t('nav.transparency')} placement="bottom">
              <Button
                as={RouterLink}
                to={PUBLIC_TRANSPARENCY_ROUTE}
                size="sm"
                variant="ghost"
                leftIcon={<Globe size={13} />}
                fontSize="xs"
                color="text.secondary"
              >
                {t('nav.transparency')}
              </Button>
            </Tooltip>
            <UserMenu displayName={displayName} secondaryLabel={secondaryLabel} settingsLabel={settingsLabel} settingsHref={settingsHref} />
          </HStack>
        </HStack>
      </Flex>
    </ShellSurface>
  );
});

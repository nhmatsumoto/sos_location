import { memo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
import { PUBLIC_TRANSPARENCY_ROUTE, SHARED_SETTINGS_ROUTE } from '../../lib/appRouteManifest';

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
        _hover={{ bg: 'rgba(255,255,255,0.07)' }}
      />
      <MenuList
        bg="#1C1C28"
        border="1px solid rgba(255,255,255,0.10)"
        borderRadius="md"
        py={2}
        zIndex={2000}
      >
        <Box px={4} py={3}>
          <Text fontSize="sm" fontWeight="600" color="white">{displayName}</Text>
          <Text fontSize="xs" color="rgba(255,255,255,0.45)">{secondaryLabel ?? ''}</Text>
        </Box>
        <MenuDivider borderColor="rgba(255,255,255,0.07)" />
        <MenuItem
          as={RouterLink}
          to={settingsHref}
          icon={<LayoutGrid size={14} />}
          bg="transparent"
          _hover={{ bg: 'rgba(255,255,255,0.06)' }}
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
  const { t, i18n } = useTranslation();
  const displayName = user?.name || user?.preferredUsername || 'Operador';
  const secondaryLabel = user?.email || user?.preferredUsername;
  const settingsLabel = t('nav.settings');
  const settingsHref = SHARED_SETTINGS_ROUTE;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  if (minimal) {
    return (
      <Box as="header" p={2} bg="#111119" border="1px solid rgba(255,255,255,0.07)" borderRadius="md">
        <HStack spacing={2}>
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
      </Box>
    );
  }

  return (
    <Box
      as="header"
      px={4}
      py={2}
      bg="#111119"
      border="1px solid rgba(255,255,255,0.07)"
      borderRadius="md"
      m={3}
      mb={0}
      position="relative"
      zIndex={100}
    >
      <Flex justify="space-between" align="center" gap={4}>
        <HStack spacing={5}>
          <HStack spacing={3} borderRight="1px solid rgba(255,255,255,0.07)" pr={5}>
            <Box p={2} bg="sos.blue.500" borderRadius="md">
              <Text fontSize="13px" fontWeight="700" color="white">SOS</Text>
            </Box>
            <Box display={{ base: 'none', md: 'block' }}>
              <Text fontSize="14px" fontWeight="600" color="white">
                SOS Location
              </Text>
              <Text fontSize="10px" fontWeight="400" color="rgba(255,255,255,0.38)" mt="-1px">
                Centro Operacional
              </Text>
            </Box>
          </HStack>

          <InputGroup size="sm" maxW="220px" display={{ base: 'none', lg: 'flex' }}>
            <InputLeftElement pointerEvents="none">
              <Search size={13} color="rgba(255,255,255,0.30)" />
            </InputLeftElement>
            <Input
              placeholder="Buscar..."
              bg="rgba(255,255,255,0.04)"
              border="1px solid rgba(255,255,255,0.08)"
              borderRadius="md"
              fontSize="xs"
              _placeholder={{ color: 'rgba(255,255,255,0.28)' }}
              _focus={{ borderColor: 'sos.blue.500', bg: 'rgba(0,122,255,0.04)' }}
            />
          </InputGroup>
        </HStack>

        <HStack spacing={3}>
          {/* Language selector */}
          <HStack spacing={1} bg="rgba(255,255,255,0.04)" p={1} borderRadius="md" border="1px solid rgba(255,255,255,0.07)">
            <IconButton
              size="sm"
              icon={<Languages size={13} />}
              aria-label="Inglês"
              variant="ghost"
              color={i18n.language === 'en' ? 'sos.blue.400' : 'rgba(255,255,255,0.45)'}
              onClick={() => changeLanguage('en')}
            />
            <IconButton
              size="sm"
              icon={<Text fontSize="9px" fontWeight="600">PT</Text>}
              aria-label="Português"
              variant="ghost"
              color={i18n.language === 'pt' ? 'sos.blue.400' : 'rgba(255,255,255,0.45)'}
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
              color="rgba(255,255,255,0.65)"
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

          <HStack spacing={1} pl={3} borderLeft="1px solid rgba(255,255,255,0.07)">
            <IconButton
              icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              size="md"
              aria-label="Alternar tema"
              onClick={onToggleTheme}
              variant="ghost"
              color="rgba(255,255,255,0.45)"
            />
            <Tooltip label={t('nav.transparency')} placement="bottom">
              <Button
                as={RouterLink}
                to={PUBLIC_TRANSPARENCY_ROUTE}
                size="sm"
                variant="ghost"
                leftIcon={<Globe size={13} />}
                fontSize="xs"
                color="rgba(255,255,255,0.55)"
              >
                {t('nav.transparency')}
              </Button>
            </Tooltip>
            <UserMenu displayName={displayName} secondaryLabel={secondaryLabel} settingsLabel={settingsLabel} settingsHref={settingsHref} />
          </HStack>
        </HStack>
      </Flex>
    </Box>
  );
});

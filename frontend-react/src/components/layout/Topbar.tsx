import { Bell, Bolt, Moon, Search, Sun, LogOut, LayoutGrid, Globe, Languages } from 'lucide-react';
import { Box, Flex, HStack, IconButton, Input, InputGroup, InputLeftElement, Select, Badge, Button, Menu, MenuButton, MenuList, MenuItem, Avatar, Text, MenuDivider, Tooltip } from '@chakra-ui/react';
import { useAuthStore } from '../../store/authStore';
import { doLogout } from '../../lib/keycloak';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { memo } from 'react';

interface TopbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  notificationCount: number;
  onOpenNotifications: () => void;
  minimal?: boolean;
}

export const Topbar = memo(function Topbar({ theme, onToggleTheme, notificationCount, onOpenNotifications, minimal }: TopbarProps) {
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const UserMenu = () => (
    <Menu>
      <MenuButton
        as={IconButton}
        size="md"
        icon={<Avatar size="xs" name={user?.name || user?.preferredUsername} bg="sos.blue.500" />}
        variant="ghost"
        borderRadius="full"
        _hover={{ bg: 'whiteAlpha.200' }}
      />
      <MenuList bg="rgba(10, 11, 16, 0.95)" backdropFilter="blur(20px)" border="1px solid" borderColor="whiteAlpha.200" boxShadow="dark-lg" py={2} zIndex={2000}>
        <Box px={4} py={3}>
          <Text fontSize="sm" fontWeight="bold" color="white">{user?.name || 'Operador'}</Text>
          <Text fontSize="xs" color="whiteAlpha.600">{user?.email || user?.preferredUsername}</Text>
        </Box>
        <MenuDivider borderColor="whiteAlpha.100" />
        <MenuItem 
          icon={<LayoutGrid size={14} />} 
          bg="transparent" 
          _hover={{ bg: 'whiteAlpha.100' }} 
          fontSize="sm"
          color="white"
        >
          {t('nav.settings')}
        </MenuItem>
        <MenuItem 
          icon={<LogOut size={14} />} 
          onClick={doLogout}
          bg="transparent" 
          color="sos.red.400"
          _hover={{ bg: 'sos.red.500', color: 'white' }}
          fontSize="sm"
        >
          Sair do Sistema
        </MenuItem>
      </MenuList>
    </Menu>
  );


  if (minimal) {
    return (
      <Box as="header" p={2} bg="whiteAlpha.50" backdropFilter="blur(16px)" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl">
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
          <Tooltip label="Voltar ao Mapa Público" placement="bottom">
            <IconButton
              as={RouterLink}
              to="/map"
              size="sm"
              icon={<Globe size={14} />}
              aria-label="Mapa Público"
              variant="ghost"
              _hover={{ bg: 'whiteAlpha.100' }}
            />
          </Tooltip>
          <UserMenu />
        </HStack>
      </Box>
    );
  }

  return (
    <Box 
      as="header" 
      px={5} 
      py={3} 
      bg="rgba(8, 8, 15, 0.85)" 
      backdropFilter="blur(24px) saturate(180%)" 
      border="1px solid rgba(255,255,255,0.10)" 
      borderRadius="2xl"
      boxShadow="0 4px 24px rgba(0,0,0,0.4)"
      m={4}
      mb={0}
      position="relative"
      zIndex={100}
    >
      <Flex justify="space-between" align="center" gap={4}>
        <HStack spacing={6}>
          <HStack spacing={3} borderRight="1px solid" borderColor="whiteAlpha.200" pr={6}>
            <Box p={2} bg="sos.blue.500" borderRadius="xl" boxShadow="0 0 12px rgba(0,122,255,0.3)">
                <Text fontSize="14px" fontWeight="900" color="white" letterSpacing="widest">G</Text>
            </Box>
            <Box display={{ base: 'none', md: 'block' }}>
              <Text fontSize="16px" fontWeight="900" color="white" letterSpacing="tighter">
                GUARDIAN<Box as="span" color="sos.blue.400">_EXT</Box>
              </Text>
              <Text fontSize="8px" fontWeight="black" color="whiteAlpha.400" mt={-1} letterSpacing="widest">
                SYSTEM_NODE_OPERATOR
              </Text>
            </Box>
          </HStack>
          
          <HStack spacing={3} display={{ base: 'none', lg: 'flex' }}>
            <Select 
              size="sm" 
              variant="unstyled"
              maxW="220px" 
              color="whiteAlpha.700"
              fontSize="xs"
              fontWeight="bold"
              _hover={{ color: 'white' }}
              cursor="pointer"
              icon={<Bolt size={10} />}
            >
              <option style={{ background: '#0A0B10' }}>SECTOR: BRAVO_01</option>
              <option style={{ background: '#0A0B10' }}>SECTOR: ALPHA_04</option>
            </Select>

            <InputGroup size="sm" maxW="240px">
              <InputLeftElement pointerEvents="none">
                <Search size={14} color="gray" />
              </InputLeftElement>
              <Input 
                placeholder="SEARCH_INTEL..." 
                bg="whiteAlpha.50" 
                border="1px solid"
                borderColor="whiteAlpha.100"
                borderRadius="lg"
                fontSize="xs"
                _placeholder={{ color: 'whiteAlpha.400' }}
                _focus={{ bg: 'whiteAlpha.100', borderColor: 'sos.blue.500' }}
              />
            </InputGroup>
          </HStack>
        </HStack>

        <HStack spacing={4}>
          <HStack spacing={2} bg="whiteAlpha.50" p={1} borderRadius="lg" border="1px solid" borderColor="whiteAlpha.50">
            <IconButton
              size="sm"
              icon={<Languages size={14} />}
              aria-label="Language selection"
              variant="ghost"
              color={i18n.language === 'en' ? 'sos.blue.400' : 'whiteAlpha.600'}
              onClick={() => changeLanguage('en')}
              _hover={{ bg: 'whiteAlpha.100' }}
            />
             <IconButton
              size="sm"
              icon={<Text fontSize="9px" fontWeight="black">PT</Text>}
              aria-label="Idioma Português"
              variant="ghost"
              color={i18n.language === 'pt' ? 'sos.blue.400' : 'whiteAlpha.600'}
              onClick={() => changeLanguage('pt')}
              _hover={{ bg: 'whiteAlpha.100' }}
            />
          </HStack>

          <Box position="relative">
            <IconButton
              size="md"
              icon={<Bell size={18} />}
              aria-label="Abrir notificações"
              onClick={onOpenNotifications}
              variant="ghost"
              color="whiteAlpha.800"
              _hover={{ bg: 'whiteAlpha.100' }}
            />
            {notificationCount > 0 && (
              <Box
                position="absolute"
                top="1.5"
                right="1.5"
                bg="sos.red.500"
                w="8px"
                h="8px"
                borderRadius="full"
                boxShadow="0 0 10px #ef4444"
              />
            )}
          </Box>
          <Button 
            leftIcon={<Bolt size={14} />} 
            variant="solid"
            bg="sos.blue.500"
            color="white"
            size="sm" 
            fontSize="xs"
            fontWeight="black"
            _hover={{ bg: 'sos.blue.400' }}
            letterSpacing="wider"
          >
            {t('nav.actions') || 'RAPID_DEPLOY'}
          </Button>

          <HStack spacing={1} pl={4} borderLeft="1px solid" borderColor="whiteAlpha.100">
             <IconButton
              icon={theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              size="md"
              aria-label="Alternar tema"
              onClick={onToggleTheme}
              variant="ghost"
              color="whiteAlpha.600"
              _hover={{ color: 'white' }}
            />
            <Tooltip label={t('nav.map')} placement="bottom">
              <Button
                as={RouterLink}
                to="/map"
                size="sm"
                variant="ghost"
                leftIcon={<Globe size={14} />}
                fontSize="xs"
                color="whiteAlpha.700"
                _hover={{ color: 'sos.blue.400', bg: 'whiteAlpha.50' }}
              >
                {t('nav.map').toUpperCase()}
              </Button>
            </Tooltip>
            <UserMenu />
          </HStack>
        </HStack>
      </Flex>
    </Box>
  );
});

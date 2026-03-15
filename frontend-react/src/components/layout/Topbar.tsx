import { Bell, Bolt, Moon, Search, Sun, LogOut, LayoutGrid, Globe } from 'lucide-react';
import { Box, Flex, HStack, IconButton, Input, InputGroup, InputLeftElement, Select, Badge, Button, Menu, MenuButton, MenuList, MenuItem, Avatar, Text, MenuDivider, Tooltip } from '@chakra-ui/react';
import { useAuthStore } from '../../store/authStore';
import { doLogout } from '../../lib/keycloak';
import { Link as RouterLink } from 'react-router-dom';

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

  const UserMenu = () => (
    <Menu>
      <MenuButton
        as={IconButton}
        size="sm"
        icon={<Avatar size="xs" name={user?.name || user?.preferredUsername} bg="sos.blue.500" />}
        variant="ghost"
        borderRadius="full"
        _hover={{ bg: 'whiteAlpha.200' }}
      />
      <MenuList bg="rgba(15, 23, 42, 0.95)" backdropFilter="blur(16px)" border="1px solid" borderColor="whiteAlpha.200" boxShadow="dark-lg" py={2}>
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
          Minha Conta
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
    <Box as="header" p={3} bg="whiteAlpha.50" backdropFilter="blur(16px)" border="1px solid" borderColor="whiteAlpha.100" borderRadius="2xl" boxShadow="xl">
      <Flex direction={{ base: 'column', xl: 'row' }} justify="space-between" align={{ base: 'stretch', xl: 'center' }} gap={2}>
        <HStack spacing={2} wrap="wrap">
          <Select 
            size="sm" 
            maxW="250px" 
            bg="sos.dark" 
            borderColor="whiteAlpha.200"
            color="white"
            borderRadius="md"
            _hover={{ borderColor: 'sos.blue.400' }}
          >
            <option>Evento: Enchente Zona da Mata</option>
            <option>Evento: Deslizamento Serra Azul</option>
          </Select>
          <InputGroup size="sm" maxW="300px">
            <InputLeftElement pointerEvents="none">
              <Search size={14} color="gray" />
            </InputLeftElement>
            <Input 
              placeholder="Busca tática..." 
              bg="sos.dark" 
              borderColor="whiteAlpha.200"
              _placeholder={{ color: 'whiteAlpha.400' }}
              _focus={{ borderColor: 'sos.blue.400' }}
            />
          </InputGroup>
        </HStack>

        <HStack spacing={2}>
          <Box position="relative">
            <IconButton
              icon={<Bell size={16} />}
              aria-label="Abrir notificações"
              onClick={onOpenNotifications}
              bg="sos.dark"
              borderColor="whiteAlpha.200"
              _hover={{ bg: 'whiteAlpha.100' }}
            />
            {notificationCount > 0 && (
              <Badge
                position="absolute"
                top="-1"
                right="-1"
                bg="sos.red.500"
                color="white"
                borderRadius="full"
                px={1.5}
                fontSize="xs"
              >
                {notificationCount}
              </Badge>
            )}
          </Box>
          <Button 
            leftIcon={<Bolt size={14} />} 
            variant="tactical"
            size="sm" 
            fontSize="xs"
          >
            AÇÕES RÁPIDAS
          </Button>
          <Tooltip label="Alternar Tema" placement="bottom">
            <IconButton
              icon={theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              aria-label="Alternar tema"
              onClick={onToggleTheme}
              bg="sos.dark"
              borderColor="whiteAlpha.200"
              _hover={{ bg: 'whiteAlpha.100' }}
            />
          </Tooltip>
          
          <HStack spacing={1} pl={2} borderLeft="1px solid" borderColor="whiteAlpha.100">
            <Tooltip label="Visualização do Cidadão" placement="bottom">
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
                PÚBLICO
              </Button>
            </Tooltip>
            <UserMenu />
          </HStack>
        </HStack>
      </Flex>
    </Box>
  );
});

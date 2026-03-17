import { HStack, InputGroup, InputLeftElement, Select, Divider, Input, Box } from '@chakra-ui/react';
import { Globe, Clock, Search } from 'lucide-react';
import { GlassPanel } from '../atoms/GlassPanel';
import { TacticalText } from '../atoms/TacticalText';

interface PublicFilterBarProps {
  countryFilter: string;
  setCountryFilter: (val: string) => void;
  locationFilter: string;
  setLocationFilter: (val: string) => void;
  timeWindow: string;
  setTimeWindow: (val: string) => void;
}

/**
 * Public Filter Bar — Guardian Clarity v3
 * Refined search and filter controls for the public observation map.
 */
export function PublicFilterBar({ 
  countryFilter, setCountryFilter, 
  locationFilter, setLocationFilter,
  timeWindow, setTimeWindow
}: PublicFilterBarProps) {
  return (
    <GlassPanel
      flex={1}
      maxW="920px"
      mx={{ base: 4, md: 8 }}
      p={1}
      borderRadius="2xl"
      depth="raised"
      border="1px solid"
      borderColor="rgba(255,255,255,0.08)"
      boxShadow="0 8px 32px rgba(0,0,0,0.4)"
      transition="all 0.2s"
      _focusWithin={{ borderColor: 'sos.blue.500', boxShadow: '0 0 20px rgba(0, 122, 255, 0.2)' }}
    >
      <HStack spacing={0} w="full" h="48px">
        
        {/* Country Selector */}
        <InputGroup size="sm" flex={0.8} minW="140px">
          <InputLeftElement pointerEvents="none" h="full" ml={1}>
            <Globe size={16} color="#007AFF" />
          </InputLeftElement>
          <Select
            variant="unstyled"
            h="48px"
            pl={10}
            fontSize="xs"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing="0.05em"
            color="white"
            cursor="pointer"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
          >
            <option value="" style={{ background: '#0D0E14' }}>Global Region</option>
            <option value="Brasil" style={{ background: '#0D0E14' }}>Brasil</option>
            <option value="Japão" style={{ background: '#0D0E14' }}>Japão</option>
          </Select>
        </InputGroup>
        
        <Divider orientation="vertical" h="24px" borderColor="rgba(255,255,255,0.1)" />
        
        {/* Search Input */}
        <InputGroup size="sm" flex={1.2}>
          <InputLeftElement pointerEvents="none" h="full" ml={1}>
            <Search size={16} color="#007AFF" />
          </InputLeftElement>
          <Input
            variant="unstyled"
            h="48px"
            pl={10}
            placeholder="BUSCAR LOCALIZAÇÃO..."
            fontSize="xs"
            fontWeight="700"
            letterSpacing="0.05em"
            color="white"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            _placeholder={{ color: 'rgba(255,255,255,0.2)' }}
          />
        </InputGroup>

        <Divider orientation="vertical" h="24px" borderColor="rgba(255,255,255,0.1)" />

        {/* Time Window Selector */}
        <InputGroup size="sm" flex={1} minW="160px">
          <InputLeftElement pointerEvents="none" h="full" ml={1}>
            <Clock size={16} color="#007AFF" />
          </InputLeftElement>
          <Select
            variant="unstyled"
            h="48px"
            pl={10}
            fontSize="xs"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing="0.05em"
            color="white"
            cursor="pointer"
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value)}
          >
            <option value="" style={{ background: '#0D0E14' }}>Live Intelligence</option>
            <option value="24h" style={{ background: '#0D0E14' }}>Last 24 Hours</option>
            <option value="7d" style={{ background: '#0D0E14' }}>Last 7 Days</option>
            <option value="30d" style={{ background: '#0D0E14' }}>Last 30 Days</option>
            <option value="historical" style={{ background: '#0D0E14' }}>Tactical Archive</option>
          </Select>
        </InputGroup>

        {/* Signal Indicator */}
        <Box px={4} h="48px" display={{ base: 'none', lg: 'flex' }} alignItems="center">
           <HStack spacing={1.5}>
              <Box w={1.5} h={1.5} bg="sos.green.500" borderRadius="full" className="animate-pulse" />
              <TacticalText variant="mono" fontSize="8px" opacity={0.3}>GDACS_SYNC</TacticalText>
           </HStack>
        </Box>
      </HStack>
    </GlassPanel>
  );
}

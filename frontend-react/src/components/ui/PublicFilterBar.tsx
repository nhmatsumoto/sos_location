import { HStack, InputGroup, InputLeftElement, Select, Divider, Input } from '@chakra-ui/react';
import { Globe, MapPin, Clock } from 'lucide-react';

interface PublicFilterBarProps {
  countryFilter: string;
  setCountryFilter: (val: string) => void;
  locationFilter: string;
  setLocationFilter: (val: string) => void;
  timeWindow: string;
  setTimeWindow: (val: string) => void;
}

export function PublicFilterBar({ 
  countryFilter, setCountryFilter, 
  locationFilter, setLocationFilter,
  timeWindow, setTimeWindow
}: PublicFilterBarProps) {
  return (
    <HStack
      flex={1}
      maxW="900px"
      mx={8}
      bg="whiteAlpha.50"
      p={1.5}
      borderRadius="2xl"
      border="1px solid"
      borderColor="whiteAlpha.100"
    >
      <InputGroup size="sm">
        <InputLeftElement pointerEvents="none" h="full">
          <Globe size={16} color="var(--chakra-colors-sos-blue-400)" />
        </InputLeftElement>
        <Select
          variant="unstyled"
          h="40px"
          pl={10}
          fontSize="xs"
          fontWeight="black"
          textTransform="uppercase"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
        >
          <option value="" style={{ background: '#0A0B10' }}>Global Region</option>
          <option value="Brasil" style={{ background: '#0A0B10' }}>Brasil</option>
          <option value="Japão" style={{ background: '#0A0B10' }}>Japão</option>
        </Select>
      </InputGroup>
      
      <Divider orientation="vertical" h="24px" borderColor="whiteAlpha.200" />
      
      <InputGroup size="sm">
        <InputLeftElement pointerEvents="none" h="full">
          <MapPin size={16} color="var(--chakra-colors-sos-blue-400)" />
        </InputLeftElement>
        <Input
          variant="unstyled"
          h="40px"
          pl={10}
          placeholder="LOCAL_SEARCH..."
          fontSize="xs"
          fontWeight="black"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          _placeholder={{ color: 'whiteAlpha.300' }}
        />
      </InputGroup>

      <Divider orientation="vertical" h="24px" borderColor="whiteAlpha.200" />

      <InputGroup size="sm">
        <InputLeftElement pointerEvents="none" h="full">
          <Clock size={16} color="var(--chakra-colors-sos-blue-400)" />
        </InputLeftElement>
        <Select
          variant="unstyled"
          h="40px"
          pl={10}
          fontSize="xs"
          fontWeight="black"
          textTransform="uppercase"
          value={timeWindow}
          onChange={(e) => setTimeWindow(e.target.value)}
        >
          <option value="" style={{ background: '#0A0B10' }}>Real-time</option>
          <option value="24h" style={{ background: '#0A0B10' }}>Last 24 Hours</option>
          <option value="7d" style={{ background: '#0A0B10' }}>Last 7 Days</option>
          <option value="30d" style={{ background: '#0A0B10' }}>Last 30 Days</option>
          <option value="historical" style={{ background: '#0A0B10' }}>Full History</option>
        </Select>
      </InputGroup>
    </HStack>
  );
}

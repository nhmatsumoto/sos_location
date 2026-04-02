import { VStack, SimpleGrid, FormControl, FormLabel, Input } from '@chakra-ui/react';
import { TacticalButton } from '../atoms/TacticalButton';
import { TacticalText } from '../atoms/TacticalText';
import type { Dispatch, SetStateAction } from 'react';
import type { OpsFormState, OpsRecordType } from '../../types';

interface TacticalOpsFormProps {
  opsForm: OpsFormState;
  setOpsForm: Dispatch<SetStateAction<OpsFormState>>;
  onSave: () => void;
}

/**
 * Tactical Operations Form
 * Refined with the premium Tactical Design System.
 */
export function TacticalOpsForm({ opsForm, setOpsForm, onSave }: TacticalOpsFormProps) {
  const modes: Array<{ id: OpsRecordType; label: string }> = [
    { id: 'voluntario', label: 'Voluntário' },
    { id: 'doacao', label: 'Doação' },
    { id: 'resgate', label: 'Equipe Resgate' },
    { id: 'bombeiros', label: 'Bombeiros' },
    { id: 'exercito', label: 'Exército' },
    { id: 'risk_area', label: 'Área de Risco' },
    { id: 'missing_person', label: 'Busca Pessoa' },
  ];

  return (
    <VStack spacing={6} p={2} align="stretch">
      <SimpleGrid columns={2} spacing={3}>
        {modes.map((mode) => (
          <TacticalButton
            key={mode.id}
            onClick={() => setOpsForm((prev) => ({ ...prev, recordType: mode.id }))}
            h="60px"
            variant="unstyled"
            borderColor={opsForm.recordType === mode.id ? 'sos.blue.500' : 'whiteAlpha.100'}
            bg={opsForm.recordType === mode.id ? 'whiteAlpha.100' : 'transparent'}
            opacity={opsForm.recordType === mode.id ? 1 : 0.6}
            _hover={{ borderColor: 'sos.blue.400', bg: 'whiteAlpha.50', opacity: 1 }}
          >
            {mode.label}
          </TacticalButton>
        ))}
      </SimpleGrid>

      <FormControl>
        <FormLabel ml={1} mb={2}>
          <TacticalText variant="subheading">Descrição do Registro</TacticalText>
        </FormLabel>
        <Input
          placeholder="Digite os detalhes da operação..."
          value={opsForm.incidentTitle}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOpsForm({ ...opsForm, incidentTitle: e.target.value })}
          bg="whiteAlpha.50"
          backdropFilter="blur(10px)"
          borderColor="whiteAlpha.100"
          fontSize="xs"
          borderRadius="xl"
          h="56px"
          _focus={{ borderColor: 'sos.blue.500', bg: 'whiteAlpha.100' }}
        />
      </FormControl>

      <TacticalButton 
        glow 
        onClick={onSave} 
        bg="sos.blue.500" 
        h="64px" 
        fontSize="sm"
        _hover={{ bg: 'sos.blue.400', transform: 'scale(1.02)' }}
      >
        REGISTRAR NO MAPA TÁTICO
      </TacticalButton>
    </VStack>
  );
}

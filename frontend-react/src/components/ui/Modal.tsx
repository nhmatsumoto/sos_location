import type { ReactNode } from 'react';
import {
  Modal as ChakraModal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button
} from '@chakra-ui/react';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, open, onClose, children }: ModalProps) {
  return (
    <ChakraModal isOpen={open} onClose={onClose} size="xl" isCentered>
      <ModalOverlay bg="rgba(0,0,0,0.75)" />
      <ModalContent bg="#111119" border="1px solid rgba(255,255,255,0.10)" borderRadius="xl">
        <ModalHeader fontSize="sm" fontWeight="600" color="white" borderBottom="1px solid rgba(255,255,255,0.07)">
          {title}
        </ModalHeader>
        <ModalCloseButton color="rgba(255,255,255,0.50)" />
        <ModalBody p={0}>
          {children}
        </ModalBody>
        <ModalFooter bg="rgba(255,255,255,0.02)" borderBottomRadius="xl">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </ModalFooter>
      </ModalContent>
    </ChakraModal>
  );
}

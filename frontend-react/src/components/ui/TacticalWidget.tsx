import React, { useState } from 'react';
import { Box, Flex, IconButton, Text, Icon, HStack } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, GripHorizontal } from 'lucide-react';

interface TacticalWidgetProps {
  title: string;
  children: React.ReactNode;
  defaultPosition?: { x: number, y: number };
  width?: string;
  icon?: React.ElementType;
}

const MotionBox = motion(Box);

export function TacticalWidget({ title, children, defaultPosition, width = "300px", icon }: TacticalWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <MotionBox
      drag
      dragMomentum={false}
      initial={defaultPosition || { x: 0, y: 0 }}
      position="absolute"
      zIndex={1001}
      width={width}
      bg="rgba(10, 11, 16, 0.85)"
      backdropFilter="blur(16px)"
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.100"
      boxShadow="dark-lg"
      overflow="hidden"
      as={motion.div}
      layout
    >
      {/* Header / Drag Handle */}
      <Flex 
        bg="whiteAlpha.50" 
        p={2} 
        align="center" 
        justify="space-between" 
        cursor="grab"
        _active={{ cursor: 'grabbing' }}
        borderBottom="1px solid"
        borderColor="whiteAlpha.50"
      >
        <HStack spacing={2}>
          <Icon as={GripHorizontal} color="whiteAlpha.400" boxSize="14px" />
          {icon && <Icon as={icon} color="sos.blue.400" boxSize="14px" />}
          <Text fontSize="10px" fontWeight="black" color="whiteAlpha.800" letterSpacing="widest">
            {title.toUpperCase()}
          </Text>
        </HStack>
        
        <IconButton
          aria-label="Toggle Minimize"
          icon={<Icon as={isMinimized ? Plus : Minus} />}
          size="xs"
          variant="ghost"
          color="whiteAlpha.600"
          onClick={() => setIsMinimized(!isMinimized)}
          _hover={{ bg: 'whiteAlpha.100', color: 'white' }}
        />
      </Flex>

      {/* Content */}
      <AnimatePresence>
        {!isMinimized && (
          <MotionBox
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Box p={4}>
              {children}
            </Box>
          </MotionBox>
        )}
      </AnimatePresence>
    </MotionBox>
  );
}

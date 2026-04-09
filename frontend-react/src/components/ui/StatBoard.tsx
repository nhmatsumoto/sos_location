import { Box, Flex, Text, Stat, StatLabel, StatNumber, StatHelpText, StatArrow, type BoxProps } from '@chakra-ui/react';

interface StatBoardProps extends BoxProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: number;
  trend?: 'increase' | 'decrease';
  icon?: React.ReactNode;
}

export const StatBoard = ({ label, value, unit, change, trend, icon, ...props }: StatBoardProps) => {
  return (
    <Box
      p={4}
      bg="whiteAlpha.50"
      
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="xl"
      {...props}
    >
      <Stat>
        <Flex justify="space-between" align="start">
          <StatLabel>{label}</StatLabel>
          {icon && <Box color="whiteAlpha.600">{icon}</Box>}
        </Flex>
        
        <Flex align="baseline" mt={1}>
          <StatNumber>{value}</StatNumber>
          {unit && (
            <Text ml={1} fontSize="sm" fontWeight="medium" color="whiteAlpha.600">
              {unit}
            </Text>
          )}
        </Flex>
        
        {(change !== undefined || trend) && (
          <StatHelpText mb={0}>
            {trend && <StatArrow type={trend} />}
            {change !== undefined && `${change}%`} do período anterior
          </StatHelpText>
        )}
      </Stat>
    </Box>
  );
};

import { Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { MetricCard } from '../layout/PagePrimitives';

interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon?: ReactNode;
  color?: string;
}

const legacyColorMap: Record<string, string> = {
  'text-slate-50': 'white',
  'text-amber-400': 'sos.amber.300',
  'text-emerald-400': 'sos.green.300',
  'text-red-400': 'sos.red.300',
  'text-cyan-400': 'sos.cyan.300',
};

const resolveAccentColor = (color?: string) => {
  if (!color) return 'sos.blue.300';
  return legacyColorMap[color] ?? color;
};

export function KpiCard({ title, value, trend, icon, color }: KpiCardProps) {
  return (
    <MetricCard
      label={title}
      value={value}
      trend={
        trend ? (
          <Text fontSize="10px" fontWeight="700">
            {trend}
          </Text>
        ) : undefined
      }
      icon={icon}
      accentColor={resolveAccentColor(color)}
      tone={color === 'text-amber-400' ? 'warning' : 'info'}
    />
  );
}

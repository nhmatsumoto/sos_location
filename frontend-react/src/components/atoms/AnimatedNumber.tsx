import { useEffect, useState, useRef } from 'react';
import { Text } from '@chakra-ui/react';

interface AnimatedNumberProps {
  value: number | string;
  duration?: number;
  [key: string]: any; // Allow any Chakra props without union explosion
}

/**
 * Animated Number — Guardian Clarity v3
 * Smoothly interpolates numeric values for KPIs.
 * Uses requestAnimationFrame for native 60fps performance.
 */
export const AnimatedNumber = ({ value, duration = 800, ...props }: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const targetValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
  const prevValueRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isNaN(targetValue)) return;
    
    startTimeRef.current = null;
    const startValue = prevValueRef.current;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Cubic easing for "Apple feel"
      const easedProgress = 1 - Math.pow(1 - progress, 3); 
      const current = Math.floor(startValue + (targetValue - startValue) * easedProgress);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = targetValue;
      }
    };

    requestAnimationFrame(animate);
  }, [targetValue, duration]);

  // If value is '--' or non-numeric, just display contextually
  if (typeof value === 'string' && isNaN(parseFloat(value))) {
    return <Text {...(props as any)}>{value}</Text>;
  }

  return <Text {...(props as any)}>{displayValue}</Text>;
};

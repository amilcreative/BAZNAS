
import React, { useState, useEffect, useRef } from 'react';
import { FORMAT_CURRENCY } from '../constants';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, duration = 1000, className }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset animation when value changes
    startValueRef.current = displayValue;
    startTimeRef.current = null;
    
    const animate = (time: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = time;
      }
      
      const progress = Math.min((time - startTimeRef.current) / duration, 1);
      // Easing function: easeOutExpo
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const current = Math.floor(
        startValueRef.current + (value - startValueRef.current) * easedProgress
      );
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {FORMAT_CURRENCY(displayValue)}
    </span>
  );
};

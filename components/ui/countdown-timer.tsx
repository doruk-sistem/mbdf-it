"use client";

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetTime: Date;
  onComplete?: () => void;
  className?: string;
}

export function CountdownTimer({ targetTime, onComplete, className = "" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetTime).getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
        setIsExpired(false);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);
        onComplete?.();
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetTime, onComplete]);

  if (isExpired) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">Süre Doldu</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 text-blue-600 ${className}`}>
      <Clock className="h-4 w-4" />
      <span className="text-sm font-medium">
        {timeLeft.days > 0 && `${timeLeft.days}g `}
        {timeLeft.hours > 0 && `${timeLeft.hours}s `}
        {timeLeft.minutes > 0 && `${timeLeft.minutes}d `}
        {timeLeft.seconds}s
      </span>
    </div>
  );
}


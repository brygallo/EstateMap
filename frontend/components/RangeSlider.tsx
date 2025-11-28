'use client';

import { useState, useRef, useEffect } from 'react';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  minValue: number;
  maxValue: number;
  onChange: (min: number, max: number) => void;
  formatValue?: (v: number) => string;
  theme?: 'light' | 'dark';
}

const RangeSlider = ({
  min,
  max,
  step = 1,
  minValue,
  maxValue,
  onChange,
  formatValue = (v) => v.toString(),
  theme = 'light'
}: RangeSliderProps) => {
  const [isDraggingMin, setIsDraggingMin] = useState(false);
  const [isDraggingMax, setIsDraggingMax] = useState(false);
  const [minInput, setMinInput] = useState(minValue.toString());
  const [maxInput, setMaxInput] = useState(maxValue.toString());
  const sliderRef = useRef<HTMLDivElement>(null);

  // Keep manual inputs synced when slider changes externally
  useEffect(() => {
    setMinInput(minValue.toString());
  }, [minValue]);

  useEffect(() => {
    setMaxInput(maxValue.toString());
  }, [maxValue]);

  const getPercentage = (value: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  const getValueFromPosition = (clientX: number) => {
    if (!sliderRef.current) return min;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const rawValue = min + (percentage / 100) * (max - min);
    return Math.round(rawValue / step) * step;
  };

  const handleMouseDown = (isMin: boolean) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMin) {
      setIsDraggingMin(true);
    } else {
      setIsDraggingMax(true);
    }
  };

  const handleTouchStart = (isMin: boolean) => (e: React.TouchEvent) => {
    if (isMin) {
      setIsDraggingMin(true);
    } else {
      setIsDraggingMax(true);
    }
  };

  useEffect(() => {
    const handleMove = (clientX: number) => {
      const newValue = getValueFromPosition(clientX);

      if (isDraggingMin) {
        const newMin = Math.min(newValue, maxValue - step);
        onChange(Math.max(min, newMin), maxValue);
      } else if (isDraggingMax) {
        const newMax = Math.max(newValue, minValue + step);
        onChange(minValue, Math.min(max, newMax));
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingMin || isDraggingMax) {
        handleMove(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingMin || isDraggingMax) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      setIsDraggingMin(false);
      setIsDraggingMax(false);
    };

    if (isDraggingMin || isDraggingMax) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDraggingMin, isDraggingMax, minValue, maxValue, min, max, step, onChange]);

  const minPercentage = getPercentage(minValue);
  const maxPercentage = getPercentage(maxValue);

  // Theme-based styles
  const isDark = theme === 'dark';
  const valueBoxClass = isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700';
  const separatorClass = isDark ? 'text-white/40' : 'text-gray-400';
  const trackBgClass = isDark ? 'bg-white/20' : 'bg-gray-200';
  const formattedMinLabel = formatValue(minValue);
  const formattedMaxLabel = formatValue(maxValue);

  const commitInput = (isMin: boolean) => {
    const rawString = isMin ? minInput : maxInput;
    if (!rawString.trim()) {
      setMinInput(minValue.toString());
      setMaxInput(maxValue.toString());
      return;
    }

    const parsed = Number(rawString);
    if (Number.isNaN(parsed)) return;

    const rounded = Math.round(parsed / step) * step;
    const clamped = Math.min(Math.max(rounded, min), max);

    if (isMin) {
      const newMin = clamped;
      const newMax = Math.max(maxValue, newMin);
      onChange(newMin, newMax);
    } else {
      const newMax = clamped;
      const newMin = Math.min(minValue, newMax);
      onChange(newMin, newMax);
    }
  };

  const handleKeyDown = (isMin: boolean) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitInput(isMin);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setMinInput(minValue.toString());
      setMaxInput(maxValue.toString());
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="w-full">
      {/* Values Display */}
      <div className="flex items-center justify-between mb-1.5 text-[10px] font-semibold gap-1">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={minInput}
          title={formattedMinLabel}
          onChange={(e) => setMinInput(e.target.value)}
          onBlur={() => commitInput(true)}
          onKeyDown={handleKeyDown(true)}
          className={`${valueBoxClass} px-1.5 py-0.5 rounded text-[10px] w-[80px] text-right focus:outline-none focus:ring-1 focus:ring-primary/60`}
        />
        <span className={separatorClass}>-</span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={maxInput}
          title={formattedMaxLabel}
          onChange={(e) => setMaxInput(e.target.value)}
          onBlur={() => commitInput(false)}
          onKeyDown={handleKeyDown(false)}
          className={`${valueBoxClass} px-1.5 py-0.5 rounded text-[10px] w-[80px] text-right focus:outline-none focus:ring-1 focus:ring-primary/60`}
        />
      </div>

      {/* Slider */}
      <div className="relative pt-1 pb-3">
        {/* Track Background */}
        <div
          ref={sliderRef}
          className={`relative h-1 ${trackBgClass} rounded-full cursor-pointer`}
          onClick={(e) => {
            const newValue = getValueFromPosition(e.clientX);
            const distToMin = Math.abs(newValue - minValue);
            const distToMax = Math.abs(newValue - maxValue);

            if (distToMin < distToMax) {
              onChange(Math.min(newValue, maxValue - step), maxValue);
            } else {
              onChange(minValue, Math.max(newValue, minValue + step));
            }
          }}
        >
          {/* Active Range */}
          <div
            className="absolute h-full bg-gradient-to-r from-primary to-secondary rounded-full"
            style={{
              left: `${minPercentage}%`,
              right: `${100 - maxPercentage}%`,
            }}
          />

          {/* Min Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
            style={{ left: `${minPercentage}%` }}
            onMouseDown={handleMouseDown(true)}
            onTouchStart={handleTouchStart(true)}
          >
            <div className={`w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md transition-transform ${
              isDraggingMin ? 'scale-125' : 'hover:scale-110'
            }`} />
          </div>

          {/* Max Handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
            style={{ left: `${maxPercentage}%` }}
            onMouseDown={handleMouseDown(false)}
            onTouchStart={handleTouchStart(false)}
          >
            <div className={`w-4 h-4 bg-white border-2 border-secondary rounded-full shadow-md transition-transform ${
              isDraggingMax ? 'scale-125' : 'hover:scale-110'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RangeSlider;
